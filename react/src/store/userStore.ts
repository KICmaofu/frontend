import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── 全局用户状态 store ──────────────────────────────────────
// 真实项目里 store 独立存放在 src/store/ 目录, 与组件解耦:
//   组件只负责"界面", 状态的读写全部通过这里的 action;
//   导航栏、页面、请求拦截器……任何地方 import 这个 hook 就能读写同一份登录态
//
// 使用方式(见 src/learn/ZustandDemo.tsx 第 3 节):
//   const user = useUserStore((s) => s.user)   // 订阅字段(变化才重渲染)
//   const login = useUserStore((s) => s.login) // 取 action(引用稳定)
//   useUserStore.getState()                    // 组件外读快照, 见第 4 节

export interface UserInfo {
  name: string
  role: string
}

interface UserState {
  // ── 数据(state) ──
  user: UserInfo | null
  token: string | null
  // 登录请求进行中标记: 放进 store, 任何组件都能订阅它展示 loading 态
  logging: boolean

  // ── 动作(actions) ──
  login: (name: string) => Promise<void>
  logout: () => void
  rename: (name: string) => void
}

export const useUserStore = create<UserState>()(
  // persist 中间件: 把指定字段写入 localStorage, 刷新页面后自动恢复(保持登录态)
  persist(
    (set) => ({
      user: null,
      token: null,
      logging: false,

      // action 里可以写异步: 先 set 标记"登录中", "请求"完成后写入用户信息与 token
      login: async (name) => {
        set({ logging: true })
        await new Promise((resolve) => setTimeout(resolve, 600)) // 模拟登录请求耗时
        set({
          logging: false,
          user: { name, role: '学员' },
          token: `mock-token-${Date.now()}`,
        })
      },

      logout: () => set({ user: null, token: null }),

      // 新值依赖旧值时用函数式 set: state 参数永远是"最新的"那份数据
      rename: (name) => set((state) => (state.user ? { user: { ...state.user, name } } : {})),
    }),
    {
      name: 'learn-zustand-user', // localStorage 里的 key
      // 只持久化 user 与 token: logging 这类临时状态不需要存盘
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
)
