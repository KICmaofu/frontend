import * as pdfjsLib from "pdfjs-dist";
// Vite 通过 ?url 把 worker 文件作为独立资源 URL 引入
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { parseTxt } from "./txt";
import { reconstructLines } from "./reconstruct";
import type { TextItemLike } from "./reconstruct";
import { stripExt } from "@/lib/utils";
import type { ParseResult } from "@/types";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// 重新导出，便于外部使用 / 测试
export { reconstructLines } from "./reconstruct";
export type { TextItemLike } from "./reconstruct";

/**
 * 解析 PDF 题库：用 pdfjs 提取全部页面文本，重排为行式文本后走 TXT 解析。
 * PDF 内部排版需符合 TXT 格式规范（数字. 题干 / A. 选项 / 答案： / 解析：）。
 */
export async function parsePdf(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const text = reconstructLines(tc.items as unknown as TextItemLike[]);
    if (text) pages.push(text);
  }
  const rawText = pages.join("\n\n");

  if (!rawText.trim()) {
    throw new Error("PDF 未提取到任何文本（可能是扫描件/图片型 PDF，暂不支持 OCR）");
  }

  // 清洗 PDF 行首的常见符号（复选框、方框等），避免干扰选项/题干/答案的正则匹配
  // 例如："□A. 选项" → "A. 选项"，"☐1. 题目" → "1. 题目"
  const fullText = rawText
    .split("\n")
    .map((line) => line.replace(/^[\s]*[□☐○●▪◆►•☆★▢▣■◇◦▪□◯\u25A0-\u25CF\u2610-\u2613\u2713\u2714\u2717\u2718✓✔✗✘☑☒✪]+[\s]*/, ""))
    .join("\n");

  const baseName = stripExt(file.name);
  return parseTxt(fullText, baseName);
}

