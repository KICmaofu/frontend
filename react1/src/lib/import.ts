import { db } from "@/lib/db";
import { parseFileText, detectFormat } from "@/lib/parsers";
import { parsePdf } from "@/lib/parsers/pdf";
import { uid } from "@/lib/utils";
import type { ImportedFile, Question, ParseResult } from "@/types";

/** 读取 File 为文本 */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
    reader.readAsText(file, "utf-8");
  });
}

/** 解析单个 File（不写入 DB）。PDF 走专用异步解析，其余按文本解析 */
export async function parseRawFile(file: File): Promise<ParseResult> {
  if (detectFormat(file.name) === "pdf") {
    return parsePdf(file);
  }
  const text = await readFileText(file);
  return parseFileText(file.name, text);
}

/** 将解析结果写入 IndexedDB */
export async function commitParseResult(result: ParseResult): Promise<ImportedFile> {
  const fileId = uid();
  const fileRec: ImportedFile = {
    id: fileId,
    name: result.file.name,
    format: result.file.format,
    category: result.file.category,
    questionCount: result.questions.length,
    importedAt: Date.now(),
  };
  const questions: Question[] = result.questions.map((q) => ({
    id: uid(),
    fileId,
    stem: q.stem,
    questionType: q.questionType,
    options: q.options,
    answer: q.answer,
    analysis: q.analysis,
    order: q.order,
  }));
  await db.transaction("rw", db.files, db.questions, async () => {
    await db.files.put(fileRec);
    await db.questions.bulkPut(questions);
  });
  return fileRec;
}

/** 删除文件及其题目 */
export async function deleteFile(fileId: string): Promise<void> {
  await db.transaction("rw", db.files, db.questions, db.bookmarks, async () => {
    const qIds = (await db.questions.where("fileId").equals(fileId).toArray()).map((q) => q.id);
    await db.questions.where("fileId").equals(fileId).delete();
    await db.files.delete(fileId);
    // 清理相关书签
    for (const qid of qIds) {
      await db.bookmarks.where("questionId").equals(qid).delete();
    }
  });
}

/** 清空整个题库（保留会话记录可选） */
export async function clearAllData(): Promise<void> {
  await db.transaction("rw", db.files, db.questions, db.sessions, db.bookmarks, async () => {
    await db.files.clear();
    await db.questions.clear();
    await db.sessions.clear();
    await db.bookmarks.clear();
  });
}
