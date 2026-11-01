import { request } from './request'

// ── 业务接口: 会话(聊天)模块 ─────────────────────────────────
// 会话列表侧边栏的"新建 / 重命名 / 删除"与消息区的
// "查询 / 重新生成 / 删除"都走这里;
// 与 api/todo.ts、api/knowledge.ts 一样只定义"调哪个接口、拿到什么类型",
// 鉴权注入、业务码检查、错误提示都由 request.ts 的拦截器统一处理

export interface ChatSession {
  id: number
  title: string
  // 该会话下的消息条数(列表里展示)
  messageCount: number
  // 最后更新时间(ISO 字符串), 列表里格式化后展示
  updatedAt: string
}

// GET /api/chat/sessions: 查询会话列表(最近更新的在前, 顺序由服务端保证)
export function fetchSessions(): Promise<ChatSession[]> {
  return request<ChatSession[]>({ url: '/chat/sessions', method: 'GET' })
}

// POST /api/chat/sessions: 新建会话, 标题由服务端按序号生成
export function createSession(): Promise<ChatSession> {
  return request<ChatSession>({ url: '/chat/sessions', method: 'POST' })
}

// PATCH /api/chat/sessions/:id: 重命名会话
export function renameSession(id: number, title: string): Promise<ChatSession> {
  return request<ChatSession>({ url: `/chat/sessions/${id}`, method: 'PATCH', data: { title } })
}

// DELETE /api/chat/sessions/:id: 删除会话(会话中的消息一并移除)
export function deleteSession(id: number): Promise<null> {
  return request<null>({ url: `/chat/sessions/${id}`, method: 'DELETE' })
}

// ── 消息接口 ────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: number
  sessionId: number
  // user: 用户提问; assistant: AI 回复(只有回复可以重新生成)
  role: ChatRole
  content: string
  createdAt: string
}

// GET /api/chat/sessions/:id/messages: 查询某个会话下的消息(按时间正序)
export function fetchMessages(sessionId: number): Promise<ChatMessage[]> {
  return request<ChatMessage[]>({ url: `/chat/sessions/${sessionId}/messages`, method: 'GET' })
}

// POST /api/chat/sessions/:id/messages: 发送一条提问,
// 返回 [用户消息, AI 回复] 两条记录(以服务端生成的 id 与时间为准)
export function sendMessage(sessionId: number, content: string): Promise<ChatMessage[]> {
  return request<ChatMessage[]>({
    url: `/chat/sessions/${sessionId}/messages`,
    method: 'POST',
    data: { content },
  })
}

// POST /api/chat/messages/:id/regenerate: 重新生成一条 AI 回复,
// 返回内容已被替换的那条消息
export function regenerateMessage(id: number): Promise<ChatMessage> {
  return request<ChatMessage>({ url: `/chat/messages/${id}/regenerate`, method: 'POST' })
}

// DELETE /api/chat/messages/:id: 删除一条消息
export function deleteMessage(id: number): Promise<null> {
  return request<null>({ url: `/chat/messages/${id}`, method: 'DELETE' })
}
