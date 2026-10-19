import { Button, Tag } from 'antd'
import type { UploadStatus, UploadTask } from '../hooks/useUploadQueue'
import { formatBytes } from '../utils/format'

// ── 文件上传进度条组件 ──────────────────────────────────────
// 纯展示组件: 只根据传入的 tasks 渲染, 所有动作通过回调交还上层;
// 每个任务是一行 —— 文件名 + 大小 + 状态标签 + 进度条 + 百分比 + 操作按钮

export interface UploadTaskListProps {
  tasks: UploadTask[]
  // 取消上传中任务 / 重试失败任务 / 从列表移除任务
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}

// 状态 → 展示文案、Tag 颜色与进度条颜色类, 集中在这里便于对照
const statusMeta: Record<UploadStatus, { label: string; tag: string; bar: string }> = {
  uploading: { label: '上传中', tag: 'processing', bar: 'active' },
  success: { label: '已上传', tag: 'success', bar: 'success' },
  failed: { label: '失败', tag: 'error', bar: 'failed' },
  canceled: { label: '已取消', tag: 'default', bar: 'canceled' },
}

function UploadTaskList({ tasks, onCancel, onRetry, onRemove }: UploadTaskListProps) {
  // 没有任务时不渲染任何内容, 是否保留占位由上层决定
  if (tasks.length === 0) return null

  return (
    <div className="learn-kb-tasks">
      {tasks.map((task) => {
        const meta = statusMeta[task.status]
        return (
          <div key={task.id} className="learn-kb-task">
            <div className="learn-kb-task-head">
              <span className="learn-kb-task-name" title={task.name}>
                {task.name}
              </span>
              <span className="learn-kb-task-size">{formatBytes(task.size)}</span>
              <Tag color={meta.tag}>{meta.label}</Tag>

              <span className="learn-kb-task-actions">
                {task.status === 'uploading' ? (
                  <Button type="text" size="small" onClick={() => onCancel(task.id)}>
                    取消
                  </Button>
                ) : (
                  <>
                    {task.status !== 'success' && (
                      <Button type="text" size="small" onClick={() => onRetry(task.id)}>
                        重试
                      </Button>
                    )}
                    <Button type="text" size="small" onClick={() => onRemove(task.id)}>
                      移除
                    </Button>
                  </>
                )}
              </span>
            </div>

            <div className="learn-kb-task-progress-row">
              <div className="learn-kb-progress">
                {/* 进度条本体: 内层宽度 = 百分比, 状态不同换填充色 */}
                <div
                  className={`learn-kb-progress-fill ${meta.bar}`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="learn-kb-task-percent">{task.progress}%</span>
            </div>

            {task.error && <p className="learn-error learn-kb-task-error">{task.error}</p>}
          </div>
        )
      })}
    </div>
  )
}

export default UploadTaskList
