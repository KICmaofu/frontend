import { useCallback, useEffect, useRef, useState } from 'react'
import { App as AntdApp, Empty, Tag } from 'antd'
import {
  createSession,
  deleteMessage,
  deleteSession,
  fetchMessages,
  fetchSessions,
  regenerateMessage,
  renameSession,
  sendMessage,
} from '../api/chat'
import type { ChatMessage, ChatSession } from '../api/chat'
import ChatComposer from '../components/ChatComposer'
import MessageList from '../components/MessageList'
import SessionList from '../components/SessionList'
import { formatDateTime } from '../utils/format'

// ── 会话与消息示例: 列表管理 + 消息快捷操作 ─────────────────
// 左侧是通用组件 components/SessionList.tsx, 右侧是 MessageList.tsx,
// 两者都只负责"界面 + 交互"; 会话与消息数据由本页面持有,
// 写操作先请求 mock 接口, 成功后再更新列表 —— 以服务端返回为准,
// 失败时列表保持原样, 错误提示由 request.ts 拦截器统一弹出
//
// 接口定义见 src/api/chat.ts, mock 实现在根目录 mock-api.ts:
//   GET/POST /api/chat/sessions, PATCH/DELETE /api/chat/sessions/:id
//   GET /api/chat/sessions/:id/messages
//   POST /api/chat/sessions/:id/messages(发送提问, 返回一问一答)
//   POST /api/chat/messages/:id/regenerate, DELETE /api/chat/messages/:id

// 输入联想的固定候选: 当前会话里的历史提问会自动排在这组问题前面,
// 真实项目里可以把候选池换成"搜索历史 / 知识库"的接口结果
const SUGGESTIONS = [
  'useEffect 的依赖数组应该怎么理解?',
  'Hooks 里哪些是必须优先掌握的?',
  '怎么自定义一条表单校验规则?',
  '流式响应遇到错误怎么处理?',
  '多行输入时回车和换行怎么区分?',
  'TypeScript 要同步学吗?',
]

function ChatSessionsDemo() {
  const { message } = AntdApp.useApp()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  // 首屏就需要拉列表: loading 直接初始为 true
  const [loading, setLoading] = useState(true)
  // 新建请求进行中: 防止连点"新建"创建出多个会话
  const [creating, setCreating] = useState(false)
  // 当前会话的消息: 与 messagesFor 配对保存, 切换会话时不会闪出上一个会话的内容
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesFor, setMessagesFor] = useState<number | null>(null)
  // 消息操作进行中: 对应按钮显示 loading, 同一时间只处理一个
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null)
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null)
  // 当前已加载消息的会话 id: 发送请求 await 之后用它判断用户是否还停在原会话
  const loadedSessionRef = useRef<number | null>(null)

  const loadSessions = useCallback(async () => {
    try {
      const list = await fetchSessions()
      setSessions(list)
      // 首屏默认选中第一个会话; 已经有选中项时保持不动
      setActiveId((current) => current ?? list[0]?.id ?? null)
    } catch {
      // 拦截器已弹全局错误提示, 这里只负责 loading 收尾
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  // 切换会话时重新拉消息: cancelled 标记防止快速切换时旧响应覆盖新会话
  useEffect(() => {
    if (activeId === null) return

    let cancelled = false
    fetchMessages(activeId)
      .then((list) => {
        if (cancelled) return
        setMessages(list)
        setMessagesFor(activeId)
      })
      .catch(() => {
        // 拦截器已提示; 清空并标记该会话已加载过, 让右侧回到空状态而不是一直转圈
        if (cancelled) return
        setMessages([])
        setMessagesFor(activeId)
      })

    return () => {
      cancelled = true
    }
  }, [activeId])

  // 把已加载的会话 id 同步到 ref, 供发送回调在异步结束后判断
  useEffect(() => {
    loadedSessionRef.current = messagesFor
  }, [messagesFor])

  // 当前选中的会话: 从列表派生, 选中项被删除后自然变为 null
  const activeSession = sessions.find((session) => session.id === activeId) ?? null
  // 只展示与当前会话匹配的那份数据, 避免切换瞬间闪出上一个会话的消息;
  // messagesFor 与 activeId 不一致时就是"正在加载"
  const visibleMessages = activeId !== null && messagesFor === activeId ? messages : []
  const messagesPending = activeId !== null && messagesFor !== activeId

  // 输入联想候选: 当前会话的历史提问(去重) + 一组常用问题
  const suggestions = Array.from(
    new Set([
      ...visibleMessages.filter((item) => item.role === 'user').map((item) => item.content),
      ...SUGGESTIONS,
    ]),
  )

  async function handleCreate() {
    if (creating) return
    setCreating(true)
    try {
      const session = await createSession()
      // mock 端已把新会话插到最前面, 本地同步做一次插入并自动选中
      setSessions((prev) => [session, ...prev])
      setActiveId(session.id)
      message.success(`已新建「${session.title}」`)
    } catch {
      // 拦截器已提示
    } finally {
      setCreating(false)
    }
  }

  async function handleRename(id: number, title: string) {
    try {
      const updated = await renameSession(id, title)
      setSessions((prev) => prev.map((item) => (item.id === id ? updated : item)))
      message.success('会话已重命名')
    } catch {
      // 拦截器已提示, 列表里的标题保持原样
    }
  }

  async function handleDelete(id: number) {
    const target = sessions.find((item) => item.id === id)
    // 删除前先找一个"接替"的会话: 优先下一个, 没有则上一个
    const index = sessions.findIndex((item) => item.id === id)
    const fallback = sessions[index + 1] ?? sessions[index - 1] ?? null

    try {
      await deleteSession(id)
      setSessions((prev) => prev.filter((item) => item.id !== id))
      // 删掉的是当前会话时, 自动选中相邻会话; 全部删完则回到空状态
      setActiveId((current) => (current === id ? (fallback?.id ?? null) : current))
      message.success(target ? `已删除「${target.title}」` : '会话已删除')
    } catch {
      // 拦截器已提示
    }
  }

  // 重新生成只对 AI 回复开放: 用接口返回的新消息原地替换旧内容
  async function handleRegenerateMessage(target: ChatMessage) {
    if (regeneratingId !== null) return
    setRegeneratingId(target.id)
    try {
      const updated = await regenerateMessage(target.id)
      setMessages((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      message.success('已重新生成回复')
    } catch {
      // 拦截器已提示
    } finally {
      setRegeneratingId(null)
    }
  }

  async function handleDeleteMessage(target: ChatMessage) {
    if (deletingMessageId !== null) return
    setDeletingMessageId(target.id)
    try {
      await deleteMessage(target.id)
      setMessages((prev) => prev.filter((item) => item.id !== target.id))
      // 左侧会话列表的消息数与消息区保持一致
      setSessions((prev) =>
        prev.map((item) =>
          item.id === target.sessionId
            ? { ...item, messageCount: Math.max(0, item.messageCount - 1) }
            : item,
        ),
      )
      message.success('消息已删除')
    } catch {
      // 拦截器已提示
    } finally {
      setDeletingMessageId(null)
    }
  }

  // 发送提问: 接口同时返回用户消息与 AI 回复, 成功后一起追加;
  // 返回 false 让输入框保留草稿, 避免请求失败时用户白敲
  async function handleSend(text: string): Promise<boolean> {
    const sessionId = activeSession?.id
    if (sessionId === undefined) return false

    try {
      const [question, answer] = await sendMessage(sessionId, text)
      // 等待回复期间用户可能切走了会话: 只在仍停在原会话时插入消息,
      // 否则等下次进入该会话时再从接口加载
      if (loadedSessionRef.current === sessionId) {
        setMessages((prev) => [...prev, question, answer])
      }
      // 左侧列表的条数与更新时间以服务端返回为准
      setSessions((prev) =>
        prev.map((item) =>
          item.id === sessionId
            ? { ...item, messageCount: item.messageCount + 2, updatedAt: answer.createdAt }
            : item,
        ),
      )
      return true
    } catch {
      // 拦截器已提示
      return false
    }
  }

  return (
    <div className="learn-demo">
      <h3>1. 会话列表与消息区</h3>
      <p className="learn-chat-tip">
        单击切换会话并加载对应消息; 双击会话标题或点右侧「...」菜单可以重命名;
        悬停消息气泡会出现复制 / 重新生成 / 删除, 重新生成只对 AI 回复开放;
        底部输入框支持多行输入、Enter 发送与输入联想。
      </p>
      <div className="learn-chat-shell">
        <SessionList
          sessions={sessions}
          activeId={activeId}
          loading={loading}
          creating={creating}
          onSelect={setActiveId}
          onCreate={() => void handleCreate()}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        <section className="learn-chat-main">
          {activeSession ? (
            <>
              <header className="learn-chat-main-head">
                <div className="learn-chat-main-title">
                  <h4 title={activeSession.title}>{activeSession.title}</h4>
                  <span className="learn-chat-main-sub">
                    {activeSession.messageCount} 条消息 · 更新于{' '}
                    {formatDateTime(activeSession.updatedAt)}
                  </span>
                </div>
                <Tag color="processing">会话 #{activeSession.id}</Tag>
              </header>
              <MessageList
                messages={visibleMessages}
                loading={messagesPending}
                regeneratingId={regeneratingId}
                deletingId={deletingMessageId}
                onRegenerate={handleRegenerateMessage}
                onDelete={handleDeleteMessage}
              />
              <ChatComposer
                suggestions={suggestions}
                disabled={messagesPending}
                onSend={handleSend}
              />
            </>
          ) : (
            <div className="learn-chat-empty">
              <Empty description="没有选中的会话, 先新建一个" />
            </div>
          )}
        </section>
      </div>

      <h3>2. 输入框: 多行输入 / 快捷键发送 / 输入联想</h3>
      <div className="learn-card">
        <p>
          多行输入: TextArea 用 autoSize=&#123;&#123; minRows: 2, maxRows: 6 &#125;&#125;,
          高度随内容自动增长, 超过 6 行后在框内滚动; 草稿里的换行会原样保留(气泡用 white-space: pre-wrap)。
        </p>
        <p>
          快捷键发送: Enter 发送、Shift+Enter 换行; 另支持 Ctrl / Cmd+Enter 直接发送。
          中文输入法组字时回车只用于选词, 代码里用 event.nativeEvent.isComposing 区分, 否则选词回车会误发送。
        </p>
        <p>
          输入联想: 取最后一个换行之后的文字作为关键字, 在候选池里做不区分大小写的匹配;
          ↓ 进入面板并移动高亮, Tab 只在高亮时补全, Esc 收起, 回车在有高亮时用于回填(否则才是发送)。
          没有进入面板时, 方向键和 Tab 保持 textarea 的默认行为(移动光标 / 切换焦点), 不然多行编辑会被联想面板抢走键盘。
        </p>
        <p>
          交互细节: 候选项用 onMouseDown + preventDefault 响应点击, 输入框不会失焦,
          面板也就不会被 onBlur 抢先关掉; 回填只替换当前行, 并把光标放到插入内容末尾。
        </p>
        <p>
          候选池由页面传入: 当前会话的历史提问(去重) + 一组常用问题; 组件不关心候选来自哪里,
          真实项目可以换成搜索历史或知识库的接口结果。
        </p>
      </div>

      <h3>3. 消息快捷操作: 复制 / 重新生成 / 删除</h3>
      <div className="learn-card">
        <p>
          复制: 纯前端行为, 直接读取消息的 content 写入剪贴板, 不发请求; 成功后用 message 轻提示。
        </p>
        <p>
          重新生成: 只有 AI 回复有这个操作; POST /api/chat/messages/:id/regenerate,
          请求期间按钮显示 loading, 返回后用新内容原地替换原消息。
        </p>
        <p>
          删除: 任意消息都可以删除, 先弹二次确认; DELETE /api/chat/messages/:id 成功后从列表移除,
          同时把左侧会话的消息数减一。
        </p>
        <p>
          加载与切换: 选中会话的 id 变化时重新拉消息; 旧请求用 cancelled 标记兜底,
          避免快速切换时旧响应覆盖新会话的内容。
        </p>
      </div>

      <h3>4. 其他交互细节</h3>
      <div className="learn-card">
        <p>
          新建会话: 调用 POST /api/chat/sessions, 服务端生成 id 与「新会话 N」标题; 返回后插入列表头部并自动选中。
        </p>
        <p>
          重命名: 双击标题或「...」菜单进入行内编辑; 标题去掉首尾空格后为空、或与原来相同, 都不发请求。
        </p>
        <p>
          删除会话: 二次确认后调用 DELETE; 若删除的是当前会话, 自动选中相邻会话(没有下一个则选上一个); 全部删完时右侧回到空状态。
        </p>
        <p>
          发送提问: POST /api/chat/sessions/:id/messages, mock 返回 [用户消息, AI 回复];
          成功后一起追加到消息区, 并同步左侧会话的消息数与更新时间; 失败时输入框保留草稿。
        </p>
        <p>
          数据流: SessionList / MessageList / ChatComposer 只负责展示和收集操作, 数据与请求都由页面负责; 服务端确认成功后, 再用返回结果更新界面。
        </p>
      </div>

      <h3>5. 文件与接口</h3>
      <div className="learn-card">
        <p>
          组件: src/components/SessionList.tsx(会话列表)、src/components/MessageList.tsx(消息气泡与快捷操作)、
          src/components/ChatComposer.tsx(多行输入 + 快捷键发送 + 输入联想)
        </p>
        <p>
          接口: src/api/chat.ts(会话的 GET / POST / PATCH / DELETE, 消息的查询 / 发送 / 重新生成 / 删除)
        </p>
        <p>Mock: mock-api.ts 用内存数组保存会话与消息, 重启 dev server 后复位</p>
      </div>
    </div>
  )
}

export default ChatSessionsDemo

