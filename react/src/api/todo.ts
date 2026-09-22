import { api } from './request'

// ── 业务接口: 按模块集中定义 ─────────────────────────────────
// 每个接口只关心两件事: 请求路径/参数 + 响应数据的类型;
// baseURL、token 注入、业务码检查、错误提示都已在 request.ts 里统一处理

export interface TodoItem {
  id: number
  title: string
  done: boolean
}

export interface Profile {
  username: string
  role: string
  // 后端原样回显的 Authorization 请求头, 用于确认 token 注入成功
  auth: string
}

// GET /api/todos: 查询待办列表
export function fetchTodos(): Promise<TodoItem[]> {
  return api.get<TodoItem[]>('/todos')
}

// POST /api/todos: 新增待办(标题为空时后端返回业务失败)
export function createTodo(title: string): Promise<TodoItem> {
  return api.post<TodoItem>('/todos', { title })
}

// GET /api/profile: 查询个人信息(需要登录, 未带 token 时返回 401)
export function fetchProfile(): Promise<Profile> {
  return api.get<Profile>('/profile')
}
