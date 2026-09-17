import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 生成简易 UUID（无 crypto.randomUUID 兜底） */
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 去除文件扩展名 */
export function stripExt(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i > 0 ? filename.slice(0, i) : filename;
}

/** 取文件扩展名（小写） */
export function getExt(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i > 0 ? filename.slice(i + 1).toLowerCase() : "";
}

/** 格式化日期时间 */
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 格式化日期 */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 相对时间 */
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return formatDate(ts);
}

/** 时长格式化 */
export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m < 60) return `${m}分${sec.toString().padStart(2, "0")}秒`;
  const h = Math.floor(m / 60);
  return `${h}时${(m % 60).toString().padStart(2, "0")}分`;
}

/** 百分比 */
export function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** 题型中文 */
export function typeLabel(t: string): string {
  switch (t) {
    case "single":
      return "单选";
    case "multiple":
      return "多选";
    case "judge":
      return "判断";
    case "short":
      return "简答";
    default:
      return "未知";
  }
}

/** 题型颜色 class */
export function typeColorClass(t: string): string {
  switch (t) {
    case "single":
      return "text-blueprint-500 border-blueprint-500/40 bg-blueprint-500/5";
    case "multiple":
      return "text-amber-400 border-amber-400/40 bg-amber-400/5";
    case "judge":
      return "text-emerald border-emerald/40 bg-emerald/5";
    case "short":
      return "text-purple-400 border-purple-400/40 bg-purple-400/5";
    default:
      return "text-blueprint-300 border-blueprint-300/40";
  }
}

/** 判定答案是否正确：选择题比较选项字母（排序后）；简答题比较关键词覆盖数 */
export function isAnswerCorrect(question: {
  questionType: string;
  answer: string;
}, userAnswer: string): boolean {
  if (question.questionType === "short") {
    const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();
    const ans = normalize(question.answer);
    const user = normalize(userAnswer);
    if (ans.length === 0) return false;
    // 答案以分号/顿号分隔为多个要点，每个要点按子串匹配
    const points = ans.split(/[；;]/).filter((p) => p.length > 0);
    if (points.length === 0) return false;
    const matched = points.filter((p) => user.includes(p));
    // 覆盖 ≥ 60% 要点视为正确
    return matched.length / points.length >= 0.6;
  }
  const normalize = (s: string) =>
    s
      .toUpperCase()
      .replace(/[^A-ZTF]/g, "")
      .split("")
      .sort()
      .join("");
  return normalize(question.answer) === normalize(userAnswer);
}

/** Fisher-Yates 洗牌 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 题干摘要 */
export function truncate(s: string, n = 40): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}
