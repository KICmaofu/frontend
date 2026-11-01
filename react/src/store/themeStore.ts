import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── 全局主题 store ──────────────────────────────────────────
// 三种模式:
//   light  固定亮色
//   dark   固定暗色
//   system 跟随操作系统(默认, 与改造前行为一致)
//
// 为什么用 zustand 而不是某个组件内部的 state:
//   写入口在 Layout 的 <ThemeToggle />, 读取方却有好几处 ——
//   main.tsx 的 ConfigProvider(antd 主题算法)、MarkdownDemo(代码高亮主题)。
//   放进全局 store, 写一次、所有订阅者同步更新;
//   persist 再把选择写进 localStorage, 刷新后保持同一套配色

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

// 存储 key: index.html 的首屏防闪脚本也读这个 key, 两边必须一致
export const THEME_STORAGE_KEY = 'learn-theme'

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    { name: THEME_STORAGE_KEY },
  ),
)
