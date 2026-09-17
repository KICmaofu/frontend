// 题目数据模型 - 所有内容均来自用户导入文件

export type QuestionType = "single" | "multiple" | "judge" | "short";
export type FileFormat = "json" | "csv" | "txt" | "pdf";
export type PracticeMode = "sequential" | "random";
export type SourceType = "file" | "category" | "wrongbook";
export type BookmarkType = "favorite" | "wrong";

/** 选项 */
export interface Option {
  key: string; // "A" | "B" | ...
  text: string;
}

/** 题目 */
export interface Question {
  id: string; // UUID
  fileId: string; // 所属导入文件
  stem: string; // 题干
  questionType: QuestionType; // 单选 / 多选 / 判断
  options: Option[]; // 选项
  answer: string; // 正确答案，多选为 "ACD"，判断为 "T" | "F"
  analysis: string; // 解析
  order: number; // 在文件中的序号
}

/** 已导入文件 */
export interface ImportedFile {
  id: string;
  name: string; // 文件名（去扩展名）
  format: FileFormat;
  category: string; // 分类（文件名或文件内字段）
  questionCount: number;
  importedAt: number;
}

/** 单题作答记录 */
export interface AnswerRecord {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  answeredAt: number;
}

/** 练习会话 */
export interface PracticeSession {
  id: string;
  sourceType: SourceType;
  sourceId: string; // fileId / category名 / "wrongbook"
  sourceLabel: string; // 显示名
  mode: PracticeMode;
  startedAt: number;
  endedAt: number | null;
  total: number;
  answeredCount: number;
  correctCount: number;
  records: AnswerRecord[];
  /** 当前断点（用于恢复） */
  cursor: number;
  /** 该会话的题目序列（题目 id 列表） */
  sequence: string[];
}

/** 收藏 / 错题标记 */
export interface Bookmark {
  questionId: string;
  type: BookmarkType;
  createdAt: number;
}

/** 解析警告 */
export interface ParseWarning {
  questionIndex: number; // 题目在文件中的序号（从 1 起，0 表示文件级警告）
  field: string; // 缺失/异常字段
  message: string;
}

/** 文件解析结果 */
export interface ParseResult {
  file: Omit<ImportedFile, "id" | "importedAt" | "questionCount">;
  questions: Omit<Question, "id" | "fileId">[];
  warnings: ParseWarning[];
}

/** 导入文件项（向导内部状态） */
export interface ImportItem {
  rawFile: File;
  status: "pending" | "parsing" | "parsed" | "error";
  result?: ParseResult;
  errorMessage?: string;
}

/** 概览统计 */
export interface OverviewStats {
  totalQuestions: number;
  answeredQuestions: number;
  correctRate: number; // 0-1
  wrongCount: number;
  favoriteCount: number;
  fileCount: number;
}

/** 细分统计行 */
export interface BreakdownRow {
  id: string;
  label: string;
  total: number;
  answered: number;
  correct: number;
  completionRate: number; // 0-1
  correctRate: number; // 0-1
}
