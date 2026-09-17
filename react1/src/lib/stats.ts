import { db } from "@/lib/db";
import type { OverviewStats, BreakdownRow, PracticeSession } from "@/types";

/** 概览统计 */
export async function getOverview(): Promise<OverviewStats> {
  const [totalQuestions, files, bookmarks] = await Promise.all([
    db.questions.count(),
    db.files.count(),
    db.bookmarks.toArray(),
  ]);
  // 已答过的不同题目数（取所有 session 的 records 中 unique questionId）
  const sessions = await db.sessions.toArray();
  const answeredSet = new Set<string>();
  let correctCount = 0;
  for (const s of sessions) {
    for (const r of s.records) {
      if (!answeredSet.has(r.questionId)) {
        answeredSet.add(r.questionId);
        if (r.isCorrect) correctCount++;
      }
    }
  }
  const answeredQuestions = answeredSet.size;
  // 错题本数量
  const wrongCount = bookmarks.filter((b) => b.type === "wrong").length;
  const favoriteCount = bookmarks.filter((b) => b.type === "favorite").length;
  // 正确率以最近一次作答为准：取每个 questionId 最近的 record
  const latestByQ = new Map<string, boolean>();
  for (const s of sessions.sort((a, b) => a.startedAt - b.startedAt)) {
    for (const r of s.records) latestByQ.set(r.questionId, r.isCorrect);
  }
  const latestCorrect = Array.from(latestByQ.values()).filter(Boolean).length;
  const correctRate = latestByQ.size > 0 ? latestCorrect / latestByQ.size : 0;

  return {
    totalQuestions,
    answeredQuestions,
    correctRate,
    wrongCount,
    favoriteCount,
    fileCount: files,
  };
}

/** 按文件或分类维度细分 */
export async function getBreakdown(by: "file" | "category"): Promise<BreakdownRow[]> {
  const [files, questions, sessions] = await Promise.all([
    db.files.toArray(),
    db.questions.toArray(),
    db.sessions.toArray(),
  ]);

  // 每题最近一次作答
  const latestByQ = new Map<string, boolean>();
  for (const s of sessions.sort((a, b) => a.startedAt - b.startedAt)) {
    for (const r of s.records) latestByQ.set(r.questionId, r.isCorrect);
  }

  const rows: BreakdownRow[] = [];
  if (by === "file") {
    for (const f of files) {
      const qs = questions.filter((q) => q.fileId === f.id);
      const answered = qs.filter((q) => latestByQ.has(q.id)).length;
      const correct = qs.filter((q) => latestByQ.get(q.id) === true).length;
      rows.push({
        id: f.id,
        label: f.name,
        total: qs.length,
        answered,
        correct,
        completionRate: qs.length ? answered / qs.length : 0,
        correctRate: answered ? correct / answered : 0,
      });
    }
  } else {
    // 按分类聚合
    const catMap = new Map<string, { total: number; answered: number; correct: number }>();
    for (const f of files) {
      const qs = questions.filter((q) => q.fileId === f.id);
      const cat = f.category || "未分类";
      const cur = catMap.get(cat) ?? { total: 0, answered: 0, correct: 0 };
      cur.total += qs.length;
      cur.answered += qs.filter((q) => latestByQ.has(q.id)).length;
      cur.correct += qs.filter((q) => latestByQ.get(q.id) === true).length;
      catMap.set(cat, cur);
    }
    for (const [cat, v] of catMap) {
      rows.push({
        id: cat,
        label: cat,
        total: v.total,
        answered: v.answered,
        correct: v.correct,
        completionRate: v.total ? v.answered / v.total : 0,
        correctRate: v.answered ? v.correct / v.answered : 0,
      });
    }
  }
  return rows;
}

/** 练习历史（按开始时间倒序） */
export async function getHistory(): Promise<PracticeSession[]> {
  const sessions = await db.sessions.toArray();
  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}

/** 最近一次未完成会话 */
export async function getLastUnfinished(): Promise<PracticeSession | null> {
  const sessions = await db.sessions.toArray();
  const unfinished = sessions
    .filter((s) => s.endedAt === null || s.answeredCount < s.total)
    .sort((a, b) => b.startedAt - a.startedAt);
  return unfinished[0] ?? null;
}

/** 连续练习天数 */
export async function getStreakDays(): Promise<number> {
  const sessions = await db.sessions.toArray();
  if (sessions.length === 0) return 0;
  const days = new Set<string>();
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    days.add(key);
  }
  // 计算到今天的连续天数
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (days.has(key)) streak++;
    else if (i === 0) continue; // 今天没练不算断
    else break;
  }
  return streak;
}

/** 正确率趋势（最近 N 次会话） */
export async function getAccuracyTrend(limit = 14): Promise<{ label: string; rate: number }[]> {
  const sessions = (await db.sessions.toArray()).sort((a, b) => a.startedAt - b.startedAt);
  return sessions.slice(-limit).map((s, i) => ({
    label: `#${i + 1}`,
    rate: s.answeredCount > 0 ? s.correctCount / s.answeredCount : 0,
  }));
}
