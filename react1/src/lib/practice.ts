import type { Question, PracticeMode, SourceType } from "@/types";
import { db } from "@/lib/db";
import { shuffle, isAnswerCorrect, uid } from "@/lib/utils";

/** 读取来源对应的题目列表 */
export async function loadQuestionsBySource(
  sourceType: SourceType,
  sourceId: string
): Promise<Question[]> {
  if (sourceType === "file") {
    return db.questions.where("fileId").equals(sourceId).sortBy("order");
  }
  if (sourceType === "category") {
    return loadQuestionsByCategory(sourceId);
  }
  if (sourceType === "wrongbook") {
    const wrongs = await db.bookmarks.where("type").equals("wrong").toArray();
    const ids = new Set(wrongs.map((b) => b.questionId));
    const all = await db.questions.toArray();
    return all.filter((q) => ids.has(q.id));
  }
  return [];
}

/** 按 category 名加载题目 */
export async function loadQuestionsByCategory(category: string): Promise<Question[]> {
  const files = await db.files.where("category").equals(category).toArray();
  const fileIds = new Set(files.map((f) => f.id));
  const all = await db.questions.toArray();
  return all
    .filter((q) => fileIds.has(q.fileId))
    .sort((a, b) => a.fileId.localeCompare(b.fileId) || a.order - b.order);
}

/** 根据模式构建题目序列（返回 id 列表） */
export function buildSequence(questions: Question[], mode: PracticeMode): string[] {
  if (mode === "random") {
    return shuffle(questions).map((q) => q.id);
  }
  return [...questions].sort((a, b) => a.order - b.order).map((q) => q.id);
}

/** 创建一个新的练习会话 */
export async function createSession(params: {
  sourceType: SourceType;
  sourceId: string;
  sourceLabel: string;
  mode: PracticeMode;
  questions: Question[];
}): Promise<string> {
  const id = uid();
  const sequence = buildSequence(params.questions, params.mode);
  await db.sessions.put({
    id,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    sourceLabel: params.sourceLabel,
    mode: params.mode,
    startedAt: Date.now(),
    endedAt: null,
    total: sequence.length,
    answeredCount: 0,
    correctCount: 0,
    records: [],
    cursor: 0,
    sequence,
  });
  return id;
}

/** 提交一题答案，更新会话 */
export async function submitAnswer(
  sessionId: string,
  question: Question,
  userAnswer: string
): Promise<boolean> {
  const session = await db.sessions.get(sessionId);
  if (!session) return false;
  const correct = isAnswerCorrect(question, userAnswer);
  // 防止重复提交同一题
  const exists = session.records.find((r) => r.questionId === question.id);
  if (!exists) {
    const records = [
      ...session.records,
      {
        questionId: question.id,
        userAnswer,
        isCorrect: correct,
        answeredAt: Date.now(),
      },
    ];
    await db.sessions.update(sessionId, {
      records,
      answeredCount: records.length,
      correctCount: records.filter((r) => r.isCorrect).length,
    });
    // 自动写入错题本（去重）
    if (!correct) {
      const existing = await db.bookmarks.get([question.id, "wrong"]);
      if (!existing) {
        await db.bookmarks.put({ questionId: question.id, type: "wrong", createdAt: Date.now() });
      }
    } else {
      // 答对后从错题本移除
      await db.bookmarks.where("questionId").equals(question.id).and((b) => b.type === "wrong").delete();
    }
  }
  return correct;
}

/** 推进光标 */
export async function advanceCursor(sessionId: string, cursor: number) {
  await db.sessions.update(sessionId, { cursor });
}

/** 结束会话 */
export async function endSession(sessionId: string) {
  await db.sessions.update(sessionId, { endedAt: Date.now() });
}

/** 切换收藏 */
export async function toggleFavorite(questionId: string): Promise<boolean> {
  const existing = await db.bookmarks.get([questionId, "favorite"]);
  if (existing) {
    await db.bookmarks.where("questionId").equals(questionId).and((b) => b.type === "favorite").delete();
    return false;
  }
  await db.bookmarks.put({ questionId, type: "favorite", createdAt: Date.now() });
  return true;
}

/** 手动加入错题本 */
export async function toggleWrongMark(questionId: string): Promise<boolean> {
  const existing = await db.bookmarks.get([questionId, "wrong"]);
  if (existing) {
    await db.bookmarks.where("questionId").equals(questionId).and((b) => b.type === "wrong").delete();
    return false;
  }
  await db.bookmarks.put({ questionId, type: "wrong", createdAt: Date.now() });
  return true;
}
