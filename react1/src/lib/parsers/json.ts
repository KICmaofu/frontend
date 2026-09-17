import type { ParseResult, ParseWarning, Option, QuestionType } from "@/types";
import { normalizeAnswer, normalizeType, JUDGE_OPTIONS, normalizeJudgeAnswer } from "./index";

/** 解析 JSON 格式题库 */
export function parseJson(text: string, baseName: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON 解析失败：${(e as Error).message}`);
  }

  // 支持两种结构：{ category, questions: [...] } 或直接 [...]
  let category = baseName;
  let rawQuestions: unknown[] = [];

  if (Array.isArray(data)) {
    rawQuestions = data;
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.category === "string" && obj.category.trim()) {
      category = obj.category.trim();
    }
    if (Array.isArray(obj.questions)) {
      rawQuestions = obj.questions;
    } else if (Array.isArray(obj.list)) {
      rawQuestions = obj.list;
    } else {
      throw new Error("JSON 顶层需为题目数组，或包含 questions 数组的对象");
    }
  } else {
    throw new Error("JSON 顶层需为题目数组，或包含 questions 数组的对象");
  }

  const warnings: ParseWarning[] = [];
  const questions = rawQuestions.map((raw, i) => {
    const q = (raw || {}) as Record<string, unknown>;
    const stem = typeof q.stem === "string" ? q.stem.trim() : "";
    if (!stem) {
      warnings.push({
        questionIndex: i + 1,
        field: "stem",
        message: `第 ${i + 1} 题缺少题干`,
      });
    }

    let questionType: QuestionType = normalizeType(q.type ?? q.questionType, "single");
    let options: Option[] = [];
    if (Array.isArray(q.options)) {
      options = q.options.map((opt, idx) => {
        if (typeof opt === "string") {
          return { key: String.fromCharCode(65 + idx), text: opt };
        }
        const o = opt as Record<string, unknown>;
        const key = typeof o.key === "string" ? o.key : String.fromCharCode(65 + idx);
        const text = typeof o.text === "string" ? o.text : typeof o.value === "string" ? o.value : "";
        return { key: key.toUpperCase(), text };
      });
    }
    // 判断题：强制使用标准 T/F 选项，保证与 answer 一致
    if (questionType === "judge") {
      options = JUDGE_OPTIONS;
    }

    const answer =
      questionType === "judge" ? normalizeJudgeAnswer(q.answer) : normalizeAnswer(q.answer);
    if (!answer) {
      warnings.push({
        questionIndex: i + 1,
        field: "answer",
        message: `第 ${i + 1} 题缺少答案`,
      });
    }

    const analysis = typeof q.analysis === "string" ? q.analysis.trim() : typeof q.explain === "string" ? q.explain.trim() : "";
    if (!analysis) {
      warnings.push({
        questionIndex: i + 1,
        field: "analysis",
        message: `第 ${i + 1} 题缺少解析`,
      });
    }

    return { stem, questionType, options, answer, analysis, order: i + 1 };
  });

  return {
    file: { name: baseName, format: "json", category },
    questions,
    warnings,
  };
}
