import { useEffect, useRef } from 'react'
import { App as AntdApp, Avatar, Button, Empty, Spin, Tooltip } from 'antd'
import {
  CopyOutlined,
  DeleteOutlined,
  RedoOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { ChatMessage } from '../api/chat'
import { formatDateTime } from '../utils/format'

// ── 消息列表组件 ────────────────────────────────────────────
// 数据与请求由上层页面负责, 组件只负责"展示 + 交互":
//   复制是纯前端行为, 直接写剪贴板;
//   重新生成 / 删除通过回调交还上层, 由页面调接口并更新列表。
//
// 快捷操作平时隐藏, 悬停、键盘聚焦或请求进行中时显示;
// 重新生成只出现在 AI 回复上 —— 用户提问没有"再生成一次"的语义。

export interface MessageListProps {
  messages: ChatMessage[]
  // 当前会话的消息加载中
  loading: boolean
  // 正在重新生成的消息 id(没有则为 null)
  regeneratingId: number | null
  // 正在删除的消息 id(没有则为 null)
  deletingId: number | null
  onRegenerate: (message: ChatMessage) => void | Promise<void>
  onDelete: (message: ChatMessage) => void | Promise<void>
}

function MessageList({
  messages,
  loading,
  regeneratingId,
  deletingId,
  onRegenerate,
  onDelete,
}: MessageListProps) {
  // message / modal 来自 AntdApp.useApp(): 能吃到全局主题/语言配置
  const { message, modal } = AntdApp.useApp()
  const listRef = useRef<HTMLDivElement>(null)
  // 新消息到达时滚到底部: 只依赖"条数 + 最后一条 id",
  // 重新生成只改内容不改 id, 不会把正在看旧消息的用户拽回底部
  const lastId = messages[messages.length - 1]?.id

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, lastId])

  async function handleCopy(target: ChatMessage) {
    try {
      // 剪贴板 API 只在安全上下文可用(localhost / https):
      // 用局域网 IP 打开 dev server 时可能不可用, 失败就提示手动复制
      await navigator.clipboard.writeText(target.content)
      message.success('已复制这条消息')
    } catch {
      message.error('复制失败, 请手动选择文本复制')
    }
  }

  function confirmDelete(target: ChatMessage) {
    // 返回 Promise: 确认按钮自动进入 loading, 请求结束后再关闭弹窗
    modal.confirm({
      title: '删除这条消息?',
      content: '删除后无法恢复, 左侧会话的消息数也会同步减少。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => onDelete(target),
    })
  }

  if (loading) {
    return (
      <div className="learn-chat-msg-status">
        <Spin size="small" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="learn-chat-msg-status">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="这个会话还没有消息, 在下方输入框问第一个问题吧"
        />
      </div>
    )
  }

  return (
    <div ref={listRef} className="learn-chat-messages" aria-label="消息列表">
      {messages.map((item) => {
        const isUser = item.role === 'user'
        const busy = regeneratingId === item.id || deletingId === item.id
        return (
          <article
            key={item.id}
            className={`learn-chat-msg ${isUser ? 'user' : 'assistant'}${busy ? ' busy' : ''}`}
          >
            <Avatar
              size={30}
              className={`learn-chat-msg-avatar ${isUser ? 'user' : 'assistant'}`}
              icon={isUser ? <UserOutlined /> : <RobotOutlined />}
            />
            <div className="learn-chat-msg-main">
              <div className="learn-chat-msg-meta">
                <span>{isUser ? '我' : 'AI 助手'}</span>
                <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
              </div>
              <div className="learn-chat-msg-bubble">{item.content}</div>
              <div className="learn-chat-msg-actions">
                <Tooltip title="复制">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    aria-label="复制这条消息"
                    onClick={() => void handleCopy(item)}
                  />
                </Tooltip>
                {!isUser && (
                  <Tooltip title="重新生成">
                    <Button
                      type="text"
                      size="small"
                      icon={<RedoOutlined />}
                      aria-label="重新生成这条回复"
                      loading={regeneratingId === item.id}
                      disabled={regeneratingId !== null && regeneratingId !== item.id}
                      onClick={() => void onRegenerate(item)}
                    />
                  </Tooltip>
                )}
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="删除这条消息"
                    loading={deletingId === item.id}
                    disabled={deletingId !== null && deletingId !== item.id}
                    onClick={() => confirmDelete(item)}
                  />
                </Tooltip>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default MessageList
