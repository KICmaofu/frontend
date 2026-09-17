import type { ParseResult, ParseWarning, Option } from "@/types";
import { normalizeAnswer, normalizeType, JUDGE_OPTIONS, normalizeJudgeAnswer } from "./index";

/** 简易 CSV 行解析：支持双引号包裹字段与转义 "" */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  fields.push(cur);
  return fields;
}

/** 解析选项字符串 "A.x|B.y|C.z" 为 Option[] */
function parseOptions(raw: string): Option[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg, idx) => {
      const m = seg.match(/^([A-Za-z])\s*[.、:：]\s*(.+)$/);
      if (m) return { key: m[1].toUpperCase(), text: m[2].trim() };
      return { key: String.fromCharCode(65 + idx), text: seg };
    });
}

/** 解析 CSV 格式题库
 * 列顺序：stem,type,options,answer,analysis （首行可为表头）
 */
export function parseCsv(text: string, baseName: string): ParseResult {
  const rawLines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    throw new Error("CSV 文件为空");
  }

  // 检测是否有表头
  const firstFields = splitCsvLine(rawLines[0]).map((f) => f.trim().toLowerCase());
  const hasHeader = firstFields.includes("stem");
  let startIndex = 0;
  let headerMap: Record<string, number> = {};
  if (hasHeader) {
    startIndex = 1;
    firstFields.forEach((h, i) => {
      headerMap[h] = i;
    });
  }

  const warnings: ParseWarning[] = [];
  const questions = [];

  for (let i = startIndex; i < rawLines.length; i++) {
    const fields = splitCsvLine(rawLines[i]);
    const get = (key: string, fallbackIdx: number) => {
      const idx = hasHeader ? headerMap[key] : fallbackIdx;
      return idx !== undefined && idx < fields.length ? fields[idx].trim() : "";
    };

    const stem = get("stem", 0);
    if (!stem) {
      warnings.push({ questionIndex: i - startIndex + 1, field: "stem", message: `第 ${i - startIndex + 1} 行缺少题干` });
    }
    const typeRaw = get("type", 1);
    const optionsRaw = get("options", 2);
    const answerRaw = get("answer", 3);
    const analysis = get("analysis", 4);

    const questionType = normalizeType(typeRaw, "single");
    let options = parseOptions(optionsRaw);
    if (questionType === "judge") {
      options = JUDGE_OPTIONS;
    }
    const answer =
      questionType === "judge" ? normalizeJudgeAnswer(answerRaw) : normalizeAnswer(answerRaw);
    if (!answer) {
      warnings.push({ questionIndex: i - startIndex + 1, field: "answer", message: `第 ${i - startIndex + 1} 行缺少答案` });
    }
    if (!analysis) {
      warnings.push({ questionIndex: i - startIndex + 1, field: "analysis", message: `第 ${i - startIndex + 1} 行缺少解析` });
    }

    questions.push({
      stem,
      questionType,
      options,
      answer,
      analysis,
      order: i - startIndex + 1,
    });
  }

  return {
    file: { name: baseName, format: "csv", category: baseName },
    questions,
    warnings,
  };
}
