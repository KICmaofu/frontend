import Dexie, { type Table } from "dexie";
import type {
  ImportedFile,
  Question,
  PracticeSession,
  Bookmark,
} from "@/types";

/** 应用本地数据库（IndexedDB） */
export class AppDB extends Dexie {
  files!: Table<ImportedFile, string>;
  questions!: Table<Question, string>;
  sessions!: Table<PracticeSession, string>;
  bookmarks!: Table<Bookmark, string>;

  constructor() {
    super("blueprint-quiz-db");
    this.version(1).stores({
      files: "id, name, category, importedAt",
      questions: "id, fileId, order, [fileId+order]",
      sessions: "id, sourceType, sourceId, startedAt",
      bookmarks: "questionId, type, createdAt",
    });
  }
}

export const db = new AppDB();
