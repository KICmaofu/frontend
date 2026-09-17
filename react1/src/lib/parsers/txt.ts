import type { ParseResult, ParseWarning, Option, QuestionType } from "@/types";
import { normalizeAnswer, normalizeType, JUDGE_OPTIONS, normalizeJudgeAnswer } from "./index";

type SectionKind = "single" | "multiple" | "judge" | "short";

interface RawQuestion {
  stem: string;
  questionType: QuestionType;
  options: Option[];
  answer: string;
  analysis: string;
  section?: SectionKind | null; // 所属正文章节题型（用于匹配文末答案附录）
  seq?: number; // 章节内题号（从 1 起）
}

/** 文末答案附录收集结果：选择题下标 = 题号-1；简答题为文本 */
interface AppendixAnswers {
  single: string[];
  multiple: string[];
  judge: string[];
  short: string[];
}

/**
 * 拆分一行内联的多个选项，如 "A.xx B.yy" / "A.xx C.yy"（PDF 双栏排版）。
 * 规则：候选标记为「字母 + 分隔符(.、:：)）」；仅当字母序大于前一个选项 key
 * 且前一字符不是英文字母/数字时才视为新选项，避免误拆正文缩写（如 USB.、GB50168）。
 */
function splitInlineOptions(firstKey: string, rest: string): Option[] {
  const out: Option[] = [{ key: firstKey, text: "" }];
  let last = 0;
  const marker = /([A-Z])\s*[.、:：)）]\s*/g;
  for (const m of rest.matchAll(marker)) {
    const idx = m.index ?? 0;
    const prevChar = idx > 0 ? rest[idx - 1] : "";
    const key = m[1];
    if (key.charCodeAt(0) <= out[out.length - 1].key.charCodeAt(0)) continue;
    if (/[A-Za-z0-9]/.test(prevChar)) continue;
    out[out.length - 1].text = rest.slice(last, idx).trim();
    out.push({ key, text: "" });
    last = idx + m[0].length;
  }
  out[out.length - 1].text = rest.slice(last).trim();
  return out.filter((o, i) => i === 0 || o.text.length > 0);
}

/**
 * 从题干尾部识别并去除圆括号题型标记，如 "(多选题)"、"（判断题）"、"（单选 题）"、"（简答题）"。
 * 允许标记内换行/空格（PDF 换行可能把标记截断，如 "(单\n选题)"）。
 */
function extractTrailingType(stem: string, fallback: QuestionType): { stem: string; type: QuestionType } {
  const m = stem.match(/[（(]\s*(单\s*选|多\s*选|判\s*断|简\s*答|问\s*答)\s*题?\s*[）)]\s*$/);
  if (!m) return { stem, type: fallback };
  return { stem: stem.slice(0, m.index).trim(), type: normalizeType(m[1].replace(/\s+/g, ""), fallback) };
}

/**
 * 章节标题匹配，支持多种格式：
 * - "一、单选题（共 590 题）"
 * - "第一部分 单选题"
 * - "二、多选题答案"（附录内的章节）
 * - "简答题"（无前缀的纯章节名）
 */
const SECTION_RE =
  /^(?:[一二三四五六七八九十百]+\s*[、.．:：]?|第[一二三四五六七八九十]+部分)?\s*(单\s*选|多\s*选|判\s*断|简\s*答|填\s*空|问\s*答|名\s*词\s*解\s*释|案\s*例|论\s*述|计\s*算)\s*题?/;

/** 章节题型归类；填空/名词解释等非选择题暂不支持，返回 null */
function sectionKind(raw: string): SectionKind | null {
  const t = raw.replace(/\s+/g, "");
  if (t.startsWith("单选")) return "single";
  if (t.startsWith("多选")) return "multiple";
  if (t.startsWith("判断")) return "judge";
  if (t.startsWith("简答") || t.startsWith("问答")) return "short";
  return null;
}

/** 文末答案附录起始行，如 "理论题库答案 参考" / "参考答案" / "附录" */
function isAppendixHeader(line: string): boolean {
  const s = line.replace(/\s+/g, "");
  if (s.length === 0 || s.length > 30) return false;
  // 排除【参考答案】这种正文简答题的答案标记（带方括号）
  if (/^[【\[]/.test(s)) return false;
  return /题库答案|答案参考|参考答案|答案汇总|答案速查|^答案$|^附录|^答案索引/.test(s);
}

/**
 * 从附录行 token 中提取答案片段：去掉数字后剩余的字母/对错符号。
 * 兼容单元格拼接产物（"10A1" → "A"、"1BCDE" → "BCDE"、"102√" → "√"）与普通行（"C"）。
 */
function tokenAnswer(tok: string): string {
  const s = tok.replace(/\d+/g, "");
  if (/^[√✓✔对正确是]$/.test(s)) return "T";
  if (/^[×✗✘错错误否]$/.test(s)) return "F";
  if (/^[A-E]{1,5}$/.test(s)) return s;
  return "";
}

/**
 * 解析简答题答案参考行：行首以 `数字.` 开头，后跟答案文本。
 * 一行可能有多个题（如 "1. xxx 2. yyy"），但仅匹配题号在合理范围且
 * 前一字符为行首或空白的 `数字.`，避免误匹配答案中的 IP 地址等。
 * 返回 [seq, text] 对列表（text 不含序号）。
 */
function parseShortAnswerLine(line: string): { seq: number; text: string }[] {
  const results: { seq: number; text: string }[] = [];
  // 匹配行首或空格后的 "数字." / "数字、"，且分隔符后须紧跟非数字非字母
  // （避免把 "1.2cm" 中的 "1." 当题号）
  const re = /(?:^|\s)(\d{1,2})\s*[.、]\s*(?=[^A-Za-z0-9.])/g;
  let m: RegExpExecArray | null;
  const positions: { seq: number; start: number; dotEnd: number }[] = [];
  while ((m = re.exec(line)) !== null) {
    const seq = parseInt(m[1], 10);
    if (seq < 1 || seq > 99) continue;
    // dotEnd 指向数字后的分隔符位置之后
    const dotEnd = m.index + m[0].length;
    // start 指向数字开始位置（跳过可能的前导空格）
    const start = m.index + (m[0].startsWith(" ") ? 1 : 0);
    positions.push({ seq, start, dotEnd });
  }
  if (positions.length === 0) return [];
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const textEnd = i + 1 < positions.length ? positions[i + 1].start : line.length;
    const text = line.slice(p.dotEnd, textEnd).trim();
    results.push({ seq: p.seq, text });
  }
  return results;
}

/** 文末答案附录回填：把附录中按章节收集的答案填回无内联答案的题目 */
function backfillAppendixAnswers(questions: RawQuestion[], appendix: AppendixAnswers): void {
  const hasAppendix =
    appendix.single.length + appendix.multiple.length + appendix.judge.length + appendix.short.length > 0;
  if (!hasAppendix) return;

  const need = (q: RawQuestion) => !q.answer;
  const apply = (q: RawQuestion, ans: string | undefined): boolean => {
    if (!ans) return false;
    if (q.questionType === "judge") {
      q.answer = normalizeJudgeAnswer(ans) || ans;
    } else if (q.questionType === "multiple") {
      // 附录单元格拼接产物可能乱序（如 "ABCED"），统一排序
      q.answer = ans.split("").sort().join("");
    } else {
      q.answer = ans;
    }
    return true;
  };

  // 1) 按（正文章节题型, 题号）精确匹配
  const hits: Record<SectionKind, { total: number; matched: number }> = {
    single: { total: 0, matched: 0 },
    multiple: { total: 0, matched: 0 },
    judge: { total: 0, matched: 0 },
    short: { total: 0, matched: 0 },
  };
  for (const q of questions) {
    if (q.section && need(q)) hits[q.section].total++;
  }
  for (const q of questions) {
    if (q.section && q.seq && need(q)) {
      if (q.questionType === "short") {
        // 简答题附录按题号索引
        if (apply(q, appendix.short?.[q.seq - 1])) hits.short.matched++;
      } else if (q.section !== "short") {
        if (apply(q, appendix[q.section]?.[q.seq - 1])) hits[q.section].matched++;
      }
    }
  }

  // 2) 题号匹配率过低的章节（题号可能是全文连续编号而非章节内编号），
  //    改按该章节题目的出现顺序回填
  for (const kind of ["single", "multiple", "judge"] as SectionKind[]) {
    const list = appendix[kind];
    if (list.length === 0) continue;
    const ratio = hits[kind].total === 0 ? 0 : hits[kind].matched / hits[kind].total;
    if (ratio >= 0.5) continue;
    let k = 0;
    for (const q of questions) {
      if (q.section !== kind) continue;
      k++;
      if (need(q)) apply(q, list[k - 1]);
    }
  }

  // 3) 无章节信息的题目：按题型分组顺序回填
  const counters: Record<SectionKind, number> = { single: 0, multiple: 0, judge: 0, short: 0 };
  for (const q of questions) {
    if (q.section || !need(q)) continue;
    const kind = q.questionType;
    if (kind !== "single" && kind !== "multiple" && kind !== "judge" && kind !== "short") continue;
    const k = ++counters[kind as SectionKind];
    apply(q, appendix[kind as SectionKind]?.[k - 1]);
  }
}

/** 解析 TXT 格式题库（行式自然语言解析） */
export function parseTxt(text: string, baseName: string): ParseResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  let category = baseName;
  let defaultType: QuestionType = "single";
  const warnings: ParseWarning[] = [];
  const questions: RawQuestion[] = [];

  let current: RawQuestion | null = null;
  let collectingAnalysis = false;
  let collectingShortAnswer = false; // 正文章节简答题的参考答案收集状态

  // 正文章节跟踪
  let bodySection: SectionKind | null = null; // 当前正文章节题型

  // 文末答案附录
  let appendixStarted = false;
  let appendixSection: SectionKind | null = null;
  const appendix: AppendixAnswers = { single: [], multiple: [], judge: [], short: [] };
  // 简答题附录：可能跨行延续，暂存待拼接
  let shortPending: { seq: number; text: string } | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (current.questionType === "judge") {
      current.options = JUDGE_OPTIONS;
      current.answer = normalizeJudgeAnswer(current.answer);
    }
    questions.push(current);
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // 空行：结束当前收集状态
    if (line === "") {
      if (collectingAnalysis) collectingAnalysis = false;
      if (collectingShortAnswer) collectingShortAnswer = false;
      // 不强制 push，允许题目间无空行也能靠下一题题号 push
      continue;
    }

    // 元指令 # 分类 / # 题型
    if (line.startsWith("#")) {
      const m = line.match(/^#\s*(分类|题型|类型|category|type)\s*[:：]\s*(.+)$/i);
      if (m) {
        const key = m[1].toLowerCase();
        const val = m[2].trim();
        if (key.includes("分类") || key === "category") category = val;
        else defaultType = normalizeType(val, defaultType);
      }
      continue;
    }

    // 文末答案附录：切换到答案收集模式（要求已解析出若干题，避免封面误触发）
    if (!appendixStarted && questions.length >= 5 && !/^\d/.test(line) && isAppendixHeader(line)) {
      pushCurrent();
      collectingAnalysis = false;
      collectingShortAnswer = false;
      appendixStarted = true;
      continue;
    }
    if (appendixStarted) {
      const sec = line.match(SECTION_RE);
      if (sec) {
        // 切换章节前，提交暂存的简答题答案
        if (shortPending) {
          appendix.short[shortPending.seq - 1] = shortPending.text.trim();
          shortPending = null;
        }
        appendixSection = sectionKind(sec[1]);
        continue;
      }
      if (appendixSection === "short") {
        // 简答题答案参考：按"数字." 分段，跨行延续拼接
        const parsed = parseShortAnswerLine(line);
        if (parsed.length > 0) {
          // 新的答案段开始：先提交上一段
          if (shortPending) {
            appendix.short[shortPending.seq - 1] = shortPending.text.trim();
          }
          // 一行可能有多个答案段，最后一个需要暂存待续行
          for (let j = 0; j < parsed.length; j++) {
            if (j < parsed.length - 1) {
              appendix.short[parsed[j].seq - 1] = parsed[j].text;
            } else {
              shortPending = { seq: parsed[j].seq, text: parsed[j].text };
            }
          }
        } else if (shortPending && !/^\d+$/.test(line)) {
          // 续行：追加到当前暂存的答案（纯数字行是页码，跳过）
          shortPending.text += "\n" + line;
        }
      } else if (appendixSection) {
        if (appendixSection === "judge") {
          // 判断题附录格式特殊："1 B (对) 2 B (错)" 或 "1 B 2 B"
          // 优先用 (对)/(错) 判定，可靠；兜底用 A/B 映射
          const judgeMatch = line.match(/\((对|错|正确|错误)\)/g);
          if (judgeMatch) {
            for (const jm of judgeMatch) {
              if (/对|正确/.test(jm)) appendix.judge.push("T");
              else if (/错|错误/.test(jm)) appendix.judge.push("F");
            }
          } else {
            // 没有括号标注：尝试 "1 B 2 B" 格式，A→T, B→F
            const nums = line.match(/\d+\s+([AB])/g);
            if (nums) {
              for (const nm of nums) {
                const ab = nm.match(/([AB])/)?.[1];
                if (ab) appendix.judge.push(ab === "A" ? "T" : "F");
              }
            } else {
              // 兜底：普通 token 解析
              for (const tok of line.split(/\s+/)) {
                const ans = tokenAnswer(tok);
                if (ans) appendix[appendixSection].push(ans);
              }
            }
          }
        } else {
          for (const tok of line.split(/\s+/)) {
            const ans = tokenAnswer(tok);
            if (ans) appendix[appendixSection].push(ans);
          }
        }
      }
      continue;
    }

    // 正文章节标题：切换默认题型
    const secMatch = line.match(SECTION_RE);
    if (secMatch) {
      const kind = sectionKind(secMatch[1]);
      pushCurrent();
      collectingAnalysis = false;
      collectingShortAnswer = false;
      if (kind) {
        defaultType = kind;
        bodySection = kind;
      } else {
        // 填空/名词解释等暂不支持：按单选兜底但不归类
        bodySection = null;
      }
      continue;
    }

    // 行首可选前缀（PDF 中常见的复选框/方框符号），用非单词非中文字符匹配
    const PREFIX = `(?:[^\\w\\u4e00-\\u9fff]{0,3}\\s*)?`;

    // 答案行
    const ansMatch = line.match(new RegExp(`^${PREFIX}答案\\s*[:：]\\s*(.+)$`));
    if (ansMatch && current) {
      current.answer = normalizeAnswer(ansMatch[1]);
      collectingAnalysis = false;
      continue;
    }

    // 【参考答案】标记（正文章节简答题的答案起始）
    if (/^[【\[]?参考答案[】\]]?\s*[:：]?\s*$/.test(line) && current) {
      collectingAnalysis = false;
      collectingShortAnswer = true;
      current.answer = "";
      continue;
    }

    // 解析行
    const anaMatch = line.match(new RegExp(`^${PREFIX}解析\\s*[:：]\\s*(.*)$`));
    if (anaMatch && current) {
      current.analysis = anaMatch[1].trim();
      collectingAnalysis = true;
      collectingShortAnswer = false;
      continue;
    }

    // 选项行 A. / A、 / A: / A）——收集解析期间不处理
    if (bodySection !== "short" && !collectingAnalysis) {
      const optMatch = line.match(new RegExp(`^${PREFIX}([A-Z])\\s*[.、:：)）]\\s*(.+)$`));
      if (optMatch && current) {
        // PDF 常将多个选项排在同一行（如 "A.xx B.yy"），需拆分为独立选项
        current.options.push(...splitInlineOptions(optMatch[1].toUpperCase(), optMatch[2].trim()));
        continue;
      }
    }

    // 新题目：数字. 开头，可带 [题型] 标记（如 [多选] [判断] [单选]）
    // 解析收集期间，需要区分"新题"和"解析内的编号列表项"：
    // - 解析内编号项：题号通常 ≤ 20（如 "1. xxx" "2. xxx"），
    //   内容以陈述性文字为主，不含问号/题型标记
    // - 新题：题号可能很大（如 1374），题干常含问号或题型标记
    let qMatch: RegExpMatchArray | null = null;
    const _q = line.match(new RegExp(`^${PREFIX}(\\d+)\\s*[.、]\\s*(?:\\[([^\\]]+)\\]\\s*)?(.+)$`));
    if (_q) {
      if (collectingAnalysis) {
        const num = parseInt(_q[1], 10);
        const rest = _q[3];
        // 解析内编号判定：题号 ≤ 20 且不含问号/题型标记
        // 题型标记正则须匹配完整词："单选题"/"多选题"/"判断题"/"简答题"
        const looksLikeAnalysisItem =
          num <= 20 &&
          !/[?？]/.test(rest) &&
          !/[（(]\s*(单选|多选|判断|简答|问答)\s*[题]?\s*[）)]/.test(rest);
        if (!looksLikeAnalysisItem) qMatch = _q;
        // 否则追加到解析（交给下面的"其余内容"分支）
      } else if (collectingShortAnswer) {
        // 简答答案收集期间：任何数字. 开头都是新题（答案里不会有编号列表）
        qMatch = _q;
      } else {
        qMatch = _q;
      }
    }
    if (qMatch) {
      pushCurrent();
      collectingAnalysis = false;
      collectingShortAnswer = false;
      const typeMark = qMatch[2];
      // PDF 常把题型写在题干尾部的圆括号里，如 "(多选题)"、"（判断题）"
      const { stem, type } = extractTrailingType(qMatch[3].trim(), defaultType);
      current = {
        stem,
        questionType: typeMark ? normalizeType(typeMark, defaultType) : type,
        options: [],
        answer: "",
        analysis: "",
        section: bodySection,
        seq: parseInt(qMatch[1], 10),
      };
      collectingAnalysis = false;
      continue;
    }

    // 其余内容：若正在收集解析/简答答案，则追加；否则若已有题目，作为题干延续
    if (collectingShortAnswer && current) {
      current.answer += (current.answer ? "\n" : "") + line;
    } else if (collectingAnalysis && current) {
      current.analysis += (current.analysis ? "\n" : "") + line;
    } else if (current && !current.answer && current.options.length === 0) {
      // 题干多行延续（仅在没有进入选项前）；合并后再尝试识别尾部题型标记
      // （PDF 换行可能把标记截断，如 "...（ ）。(单" + "选题)"）
      const merged = `${current.stem}\n${line}`;
      const t = extractTrailingType(merged, current.questionType);
      current.stem = t.stem;
      current.questionType = t.type;
    }
    // 否则忽略孤立的无效行
  }
  pushCurrent();

  // 附录解析完成后，提交最后一个暂存的简答题答案
  if (shortPending) {
    appendix.short[shortPending.seq - 1] = shortPending.text.trim();
  }

  // 文末答案附录回填
  backfillAppendixAnswers(questions, appendix);

  // 简答题兜底：没有内联答案也没有附录答案时，用解析内容作为答案
  // （有些 PDF 简答题的"解析"实际上就是参考答案）
  for (const q of questions) {
    if (q.questionType === "short" && !q.answer && q.analysis) {
      q.answer = q.analysis;
    }
  }

  // 生成警告
  const out = questions.map((q, i) => {
    const order = i + 1;
    if (!q.stem) {
      warnings.push({ questionIndex: order, field: "stem", message: `第 ${order} 题缺少题干` });
    }
    if (!q.answer) {
      warnings.push({ questionIndex: order, field: "answer", message: `第 ${order} 题缺少答案` });
    } else if (q.questionType !== "judge" && q.questionType !== "short") {
      // 校验答案选项是否都在选项 key 内
      const keys = new Set(q.options.map((o) => o.key));
      const ansChars = q.answer.split("");
      const invalid = ansChars.filter((c) => !keys.has(c));
      if (invalid.length > 0 && q.options.length > 0) {
        warnings.push({
          questionIndex: order,
          field: "answer",
          message: `第 ${order} 题答案 "${q.answer}" 含未知选项 ${invalid.join("")}`,
        });
      }
    }
    if (!q.analysis) {
      warnings.push({ questionIndex: order, field: "analysis", message: `第 ${order} 题缺少解析` });
    }
    return { ...q, order };
  });

  if (out.length === 0) {
    throw new Error("TXT 文件未识别到任何题目（需以 数字. 开头标注题干）");
  }

  return {
    file: { name: baseName, format: "txt", category },
    questions: out,
    warnings,
  };
}
