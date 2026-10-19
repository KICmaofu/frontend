import { useRef, useState } from 'react'
import type { DragEvent, KeyboardEvent } from 'react'
import { InboxOutlined } from '@ant-design/icons'

// ── 文件选择区组件 ──────────────────────────────────────────
// 支持两种选择方式: 点击打开文件对话框 / 把文件拖进来;
// 选好后把 File 数组交给上层(onFiles), 组件自己不关心"选中之后干什么"

export interface FileDropzoneProps {
  onFiles: (files: File[]) => void
  // 区域下方的提示文案(如大小限制), 由上层与校验规则一起维护
  hint?: string
}

function FileDropzone({ onFiles, hint }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  // dragenter/dragleave 在子元素之间移动时也会反复触发: 用计数抵消误判
  const dragDepthRef = useRef(0)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // role="button" 的键盘等价操作: 回车/空格触发选择
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepthRef.current = 0
    setDragging(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onFiles(files)
  }

  return (
    <div
      className={`learn-kb-dropzone${dragging ? ' dragging' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragEnter={(event) => {
        // 不阻止默认行为的话, 浏览器会把拖入的文件直接当页面打开
        event.preventDefault()
        dragDepthRef.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        dragDepthRef.current -= 1
        if (dragDepthRef.current <= 0) {
          dragDepthRef.current = 0
          setDragging(false)
        }
      }}
      onDrop={handleDrop}
    >
      <InboxOutlined className="learn-kb-dropzone-icon" />
      <p>点击选择文件, 或把文档拖拽到这里</p>
      {hint && <p className="learn-kb-dropzone-hint">{hint}</p>}

      {/* 隐藏的原生文件选择框: 真正的"选择文件"能力来自它, 点击区域时代为触发 */}
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length > 0) onFiles(files)
          // 清空 value: 连续选择同一个文件也能再次触发 change
          event.target.value = ''
        }}
      />
    </div>
  )
}

export default FileDropzone
