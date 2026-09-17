import { useNavigate } from "react-router-dom";
import { createSession, loadQuestionsBySource, loadQuestionsByCategory } from "@/lib/practice";
import { useAppStore } from "@/store/useAppStore";
import type { PracticeMode, SourceType } from "@/types";

/** 启动练习会话的共享 hook */
export function useStartPractice() {
  const navigate = useNavigate();
  const setActiveSession = useAppStore((s) => s.setActiveSession);

  return async function start(
    sourceType: SourceType,
    sourceId: string,
    sourceLabel: string,
    mode: PracticeMode
  ): Promise<void> {
    let questions;
    if (sourceType === "category") {
      questions = await loadQuestionsByCategory(sourceId);
    } else {
      questions = await loadQuestionsBySource(sourceType, sourceId);
    }
    if (questions.length === 0) {
      throw new Error("该来源暂无可练习的题目");
    }
    const id = await createSession({ sourceType, sourceId, sourceLabel, mode, questions });
    setActiveSession(id);
    navigate(`/practice/${id}`);
  };
}
