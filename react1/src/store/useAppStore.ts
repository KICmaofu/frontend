import { create } from "zustand";

interface AppState {
  /** 当前活跃练习会话 id（用于 Practice 页读取） */
  activeSessionId: string | null;
  setActiveSession: (id: string | null) => void;
  /** 全局刷新计数（删除/导入后触发列表刷新兜底） */
  refreshTick: number;
  bumpRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeSessionId: null,
  setActiveSession: (id) => set({ activeSessionId: id }),
  refreshTick: 0,
  bumpRefresh: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
}));
