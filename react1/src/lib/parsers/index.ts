import type { FileFormat, ParseResult, ParseWarning, QuestionType } from "@/types";
import { getExt, stripExt } from "@/lib/utils";
import { parseJson } from "./json";
import { parseCsv } from "./csv";
import { parseTxt } from "./txt";

/** 根据扩展名识别格式 */
export function detectFormat(filename: string): FileFormat | null {
  const ext = getExt(filename);
  if (ext === "json") return "json";
  if (ext === "csv") return "csv";
  if (ext === "txt") return "txt";
  if (ext === "pdf") return "pdf";
  return null;
}

/** 解析文件文本，返回统一的 ParseResult（不含 PDF，PDF 需异步提取文本，见 parsePdf） */
export function parseFileText(
  filename: string,
  text: string
): ParseResult {
  const format = detectFormat(filename);
  if (!format || format === "pdf") {
    throw new Error(`不支持的文件格式：${getExt(filename) || "未知"}（仅支持 JSON/CSV/TXT/PDF）`);
  }
  const baseName = stripExt(filename);
  let result: ParseResult;
  if (format === "json") result = parseJson(text, baseName);
  else if (format === "csv") result = parseCsv(text, baseName);
  else result = parseTxt(text, baseName);
  return result;
}

/** 规范化题型字段 */
export function normalizeType(raw: unknown, fallback: QuestionType = "single"): QuestionType {
  if (typeof raw !== "string") return fallback;
  const t = raw.trim().toLowerCase();
  if (t === "single" || t === "单选" || t === "单选题" || t === "单") return "single";
  if (t === "multiple" || t === "multi" || t === "多选" || t === "多选题" || t === "多") return "multiple";
  if (t === "judge" || t === "判断" || t === "判断题" || t === "truefalse" || t === "tf" || t === "判") return "judge";
  if (t === "short" || t === "简答" || t === "简答题" || t === "问答" || t === "问答题") return "short";
  return fallback;
}

/** 规范化答案：去除空格、点、顿号等 */
export function normalizeAnswer(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .toUpperCase()
    .replace(/[，,、\s]/g, "")
    .replace(/[。.]/g, "");
}

/** 判断题标准选项（强制 T/F，保证与 answer 一致） */
export const JUDGE_OPTIONS: { key: string; text: string }[] = [
  { key: "T", text: "正确" },
  { key: "F", text: "错误" },
];

/** 规范化判断题答案：T/对/正确/是/Y/A → T；F/错/错误/否/N/B → F */
export function normalizeJudgeAnswer(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const s = raw.trim().toLowerCase();
  if (["t", "true", "对", "正确", "是", "y", "yes", "√", "a"].includes(s)) return "T";
  if (["f", "false", "错", "错误", "否", "n", "no", "×", "b"].includes(s)) return "F";
  // 兜底：已是 T/F
  const up = raw.toUpperCase();
  return up === "T" || up === "F" ? up : "";
}

export type { ParseResult, ParseWarning };
