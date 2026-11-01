import { useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Button, Input } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import type { TextAreaRef } from 'antd/es/input/TextArea'

// ── 消息输入框组件 ──────────────────────────────────────────
// 三件事分开看:
//   1. 多行输入: TextArea + autoSize, 高度随内容在 2~6 行之间变化, 再多就内部滚动;
//   2. 快捷键发送: Enter 发送, Shift+Enter 换行; 输入法组字时的回车不发送;
//   3. 输入联想: 取"当前行"的关键字过滤候选, ↑/↓ 选择、Tab 补全、Esc 收起。
//
// 联想面板没有直接用 AutoComplete: 这里的键盘规则比较细(回车是发送还是回填、
// Tab 补全、Esc 临时收起), 用受控的候选列表反而更好读懂。
// 候选词由上层传入, 组件本身不关心它是写死的数组还是接口搜索结果。

export interface ChatComposerProps {
  // 联想候选池
  suggestions: string[]
  // 外部原因导致的禁用(例如消息还在加载)
  disabled?: boolean
  // 发送回调: 文本已去掉首尾空格, 不会为空;
  // 返回 true 表示发送成功(清空输入框), false 表示失败(保留草稿)
  onSend: (text: string) => Promise<boolean>
}

const MAX_LENGTH = 500
// 面板最多同时展示几条: 多了会挡住消息区
const MAX_VISIBLE = 6

// 取最后一个换行之后的内容作为联想关键字:
// 多行草稿里, 用户正在敲的是最后一行
function getCurrentLine(value: string): string {
  const index = value.lastIndexOf('\n')
  return index === -1 ? value : value.slice(index + 1)
}

// 高亮命中的片段: 只标第一处, 命中位置由关键字实时算出
function Highlight({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword) return <>{text}</>
  const index = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (index === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + keyword.length)}</mark>
      {text.slice(index + keyword.length)}
    </>
  )
}

function ChatComposer({ suggestions, disabled = false, onSend }: ChatComposerProps) {
  const textAreaRef = useRef<TextAreaRef>(null)
  // useId: 给候选列表生成唯一 id, 供 aria-controls / aria-activedescendant 关联
  const listId = useId()

  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  // 当前高亮的候选项下标: -1 表示"没有高亮", 此时回车是发送
  const [activeIndex, setActiveIndex] = useState(-1)
  // 按 Esc 或回填候选后临时收起面板; 继续输入时重新打开
  const [dismissed, setDismissed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const currentLine = getCurrentLine(draft)
  const keyword = currentLine.trim()
  const filtered = (
    keyword
      ? suggestions.filter((item) => item.toLowerCase().includes(keyword.toLowerCase()))
      : suggestions
  ).slice(0, MAX_VISIBLE)

  // 发送中或外部禁用时, 整个输入区不可用
  const busy = disabled || submitting
  const open = focused && !dismissed && !busy && filtered.length > 0
  // 过滤后列表可能变短: 高亮下标越界时视为没有高亮
  const activeOption = open && activeIndex >= 0 && activeIndex < filtered.length ? activeIndex : -1

  async function submit() {
    const text = draft.trim()
    if (!text || busy) return

    setSubmitting(true)
    try {
      const ok = await onSend(text)
      if (!ok) return // 失败时保留草稿, 避免用户白敲
      setDraft('')
      setActiveIndex(-1)
      setDismissed(true)
    } catch {
      // 错误提示由上层/请求拦截器负责, 这里只保证草稿不丢
    } finally {
      setSubmitting(false)
      // 回复回来后把焦点交还输入框, 方便连续提问
      requestAnimationFrame(() => textAreaRef.current?.focus())
    }
  }

  function applySuggestion(item: string) {
    // 只替换当前行, 多行草稿里前面的内容保持不动
    const head = draft.slice(0, draft.length - currentLine.length)
    const next = head + item
    setDraft(next)
    setActiveIndex(-1)
    // 回填后先收起, 等用户继续输入再重新弹出
    setDismissed(true)

    // 等 React 把新值写进 textarea 后再把光标放到末尾
    requestAnimationFrame(() => {
      const textarea = textAreaRef.current?.resizableTextArea?.textArea
      textarea?.focus()
      textarea?.setSelectionRange(next.length, next.length)
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // 中文输入法组字时的回车只用于选词: isComposing 为 true 时一律不响应快捷键
    if (event.nativeEvent.isComposing) return

    // Ctrl / Cmd + Enter 始终是"发送", 不受联想面板高亮影响
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      void submit()
      return
    }

    if (event.key === 'Enter') {
      // Shift+Enter 交给 TextArea 默认行为: 插入换行
      if (event.shiftKey) return
      event.preventDefault()
      // 面板里有高亮项时, 回车用于回填, 否则才是发送
      if (activeOption >= 0) {
        applySuggestion(filtered[activeOption])
        return
      }
      void submit()
      return
    }

    if (!open) return

    // 方向键默认还给 textarea 移动光标: 只有按 ↓ "进入"面板后才接管
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % filtered.length)
    } else if (event.key === 'ArrowUp') {
      if (activeOption < 0) return // 还没进入面板: 正常移动光标
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + filtered.length) % filtered.length)
    } else if (event.key === 'Tab') {
      // 只在高亮某项时接管 Tab: 没有高亮时 Tab 仍然用于切换焦点
      if (activeOption < 0) return
      event.preventDefault()
      applySuggestion(filtered[activeOption])
    } else if (event.key === 'Escape') {
      setDismissed(true)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="learn-chat-composer">
      {open && (
        <div className="learn-chat-suggest">
          <div className="learn-chat-suggest-head">
            {keyword ? `联想: 包含「${keyword}」` : '常用提问'}
          </div>
          <ul
            id={listId}
            className="learn-chat-suggest-list"
            role="listbox"
            aria-label="输入联想"
          >
            {filtered.map((item, index) => (
              <li
                key={item}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeOption}
                className={`learn-chat-suggest-item${index === activeOption ? ' active' : ''}`}
                // onMouseDown + preventDefault: 点选时输入框不失焦, 面板不会被 onBlur 关掉
                onMouseDown={(event) => {
                  event.preventDefault()
                  applySuggestion(item)
                }}
              >
                <Highlight text={item} keyword={keyword} />
              </li>
            ))}
          </ul>
          <div className="learn-chat-suggest-hint">↑/↓ 选择 · Tab 补全 · Esc 收起</div>
        </div>
      )}

      <div className="learn-chat-composer-box">
        <Input.TextArea
          ref={textAreaRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setActiveIndex(-1)
            // 打字就重新允许弹出联想
            setDismissed(false)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          // 高度随内容增长: 2 行起步, 6 行封顶, 再多就在框内滚动
          autoSize={{ minRows: 2, maxRows: 6 }}
          maxLength={MAX_LENGTH}
          placeholder="输入问题, Enter 发送、Shift+Enter 换行; 输入关键字会弹出联想"
          disabled={busy}
          aria-label="消息输入框"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={activeOption >= 0 ? `${listId}-${activeOption}` : undefined}
        />

        <div className="learn-chat-composer-bar">
          <span className="learn-chat-composer-hint">
            {submitting ? (
              '发送中, 等待回复…'
            ) : (
              <>
                <kbd>Enter</kbd> 发送 · <kbd>Shift</kbd>+<kbd>Enter</kbd> 换行 · <kbd>↓</kbd>{' '}
                进入联想 · <kbd>Esc</kbd> 收起
              </>
            )}
          </span>
          <span className="learn-chat-composer-count">
            {draft.length}/{MAX_LENGTH}
          </span>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            disabled={busy || !draft.trim()}
            onClick={() => void submit()}
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ChatComposer
