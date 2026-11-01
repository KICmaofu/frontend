import { useRef, useState } from 'react'
import { App as AntdApp, Button, Dropdown, Empty, Input, Spin } from 'antd'
import type { MenuProps } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import type { ChatSession } from '../api/chat'
import { formatDateTime } from '../utils/format'

// ── 会话列表组件 ────────────────────────────────────────────
// 数据由上层页面传入, 组件只负责"界面 + 交互":
//   单击选中会话, 双击标题或点"..."菜单重命名(行内编辑),
//   删除前弹二次确认; 真正的请求与列表更新都通过回调交还上层。
//
// 行内重命名的键盘约定:
//   Enter 提交 / 失焦提交 / Esc 取消; 空标题或没有改动时不发请求

export interface SessionListProps {
  sessions: ChatSession[]
  // 当前选中的会话 id(没有选中时为 null)
  activeId: number | null
  // 首屏列表加载中
  loading: boolean
  // 新建请求进行中: 按钮显示 loading 并防止重复点击
  creating: boolean
  onSelect: (id: number) => void
  onCreate: () => void
  onRename: (id: number, title: string) => void | Promise<void>
  onDelete: (id: number) => void | Promise<void>
}

function SessionList({
  sessions,
  activeId,
  loading,
  creating,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: SessionListProps) {
  // modal 来自 AntdApp.useApp(): 能吃到全局主题/语言配置
  const { modal } = AntdApp.useApp()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  // Esc 取消后输入框失焦还会再触发一次 onBlur: 用 ref 标记"这次关闭不提交"
  const cancelEditRef = useRef(false)

  function startEdit(session: ChatSession) {
    cancelEditRef.current = false
    setEditingId(session.id)
    setDraft(session.title)
  }

  // onBlur 统一负责"关闭编辑态 + 条件提交", Enter 只是让输入框失焦
  function finishEdit(session: ChatSession) {
    const canceled = cancelEditRef.current
    cancelEditRef.current = false
    if (editingId !== session.id) return
    setEditingId(null)
    if (canceled) return

    const title = draft.trim()
    // 空标题或与原来相同: 静默结束, 不打扰用户也不发请求
    if (title === '' || title === session.title) return
    void onRename(session.id, title)
  }

  function cancelEdit() {
    cancelEditRef.current = true
    setEditingId(null)
  }

  function confirmDelete(session: ChatSession) {
    // 返回 Promise: 确认按钮自动进入 loading, 请求结束后再关闭弹窗
    modal.confirm({
      title: `删除会话「${session.title}」?`,
      content: '删除后会话及其消息将一并移除, 且无法恢复。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => onDelete(session.id),
    })
  }

  function menuFor(session: ChatSession): MenuProps {
    return {
      items: [
        { key: 'rename', label: '重命名', icon: <EditOutlined /> },
        { type: 'divider' },
        { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
      ],
      onClick: ({ key, domEvent }) => {
        // 菜单点击不要冒泡成"选中会话"
        domEvent.stopPropagation()
        if (key === 'rename') startEdit(session)
        if (key === 'delete') confirmDelete(session)
      },
    }
  }

  return (
    <aside className="learn-chat-sessions" aria-label="会话列表">
      <div className="learn-chat-sessions-head">
        <span className="learn-chat-sessions-title">会话</span>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          loading={creating}
          onClick={onCreate}
        >
          新建
        </Button>
      </div>

      {loading ? (
        <div className="learn-chat-list-status">
          <Spin size="small" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="learn-chat-list-status">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有会话, 点右上角新建" />
        </div>
      ) : (
        <ul className="learn-chat-session-list">
          {sessions.map((session) => {
            const active = session.id === activeId
            const editing = session.id === editingId
            return (
              <li key={session.id}>
                <div className={`learn-chat-session${active ? ' active' : ''}`}>
                  {editing ? (
                    <Input
                      className="learn-chat-rename-input"
                      size="small"
                      autoFocus
                      maxLength={30}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      onPressEnter={(event) => event.currentTarget.blur()}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') cancelEdit()
                      }}
                      onBlur={() => finishEdit(session)}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        className="learn-chat-session-main"
                        title="双击可重命名"
                        onClick={() => onSelect(session.id)}
                        onDoubleClick={() => startEdit(session)}
                      >
                        <span className="learn-chat-session-title">
                          <MessageOutlined />
                          {session.title}
                        </span>
                        <span className="learn-chat-session-meta">
                          {session.messageCount} 条消息 · {formatDateTime(session.updatedAt)}
                        </span>
                      </button>

                      <Dropdown
                        menu={menuFor(session)}
                        trigger={['click']}
                        placement="bottomRight"
                      >
                        <Button
                          type="text"
                          size="small"
                          className="learn-chat-session-more"
                          icon={<MoreOutlined />}
                          aria-label={`「${session.title}」的更多操作`}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </Dropdown>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}

export default SessionList
