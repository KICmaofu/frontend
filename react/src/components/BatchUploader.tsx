import { useMemo } from 'react'
import FileDropzone from './FileDropzone'
import UploadTaskList from './UploadTaskList'
import type { UploadTask } from '../hooks/useUploadQueue'
import { formatBytes } from '../utils/format'

// ── 批量上传组件 ────────────────────────────────────────────
// 把"选择文件 → 总进度 → 单文件进度"串成一个完整的上传面板:
//   FileDropzone    负责选择/拖拽文件, 选中后交给上层做校验
//   UploadTaskList  负责每个文件各自的进度条与取消/重试操作
//   本组件          负责汇总: 总进度、已完成数量、失败/取消数量、总大小
//
// 组件本身不发起上传, tasks 与动作全部由上层传入(数据流仍是单向的):
//   const { tasks, enqueue, cancelTask, retryTask, removeTask } = useUploadQueue()
//   <BatchUploader tasks={tasks} onFiles={...} onCancel={cancelTask} ... />

export interface BatchUploaderProps {
  // 上传队列状态(来自 useUploadQueue)
  tasks: UploadTask[]
  // 选择区下方提示, 如单文件大小上限
  hint?: string
  // 选中文件后交给上层校验/入队
  onFiles: (files: File[]) => void
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}

// 完成任务才计入"已上传字节"; 失败/取消的进度归零,
// 避免总进度显示成"传了一半但服务端并没有收下"
function uploadedBytesOf(task: UploadTask): number {
  if (task.status === 'success') return task.size
  if (task.status === 'uploading') return (task.size * task.progress) / 100
  return 0
}

function BatchUploader({
  tasks,
  hint,
  onFiles,
  onCancel,
  onRetry,
  onRemove,
}: BatchUploaderProps) {
  // 汇总只在任务列表变化时重算: 进度回调很频繁, 没必要每次渲染都遍历
  const summary = useMemo(() => {
    const totalCount = tasks.length
    const totalBytes = tasks.reduce((sum, task) => sum + task.size, 0)
    const uploadedBytes = tasks.reduce((sum, task) => sum + uploadedBytesOf(task), 0)

    const successCount = tasks.filter((task) => task.status === 'success').length
    const uploadingCount = tasks.filter((task) => task.status === 'uploading').length
    const failedCount = tasks.filter((task) => task.status === 'failed').length
    const canceledCount = tasks.filter((task) => task.status === 'canceled').length

    // 按字节加权: 大文件的进度对总进度影响更大; 全部 0 字节时按成功数兜底
    const total =
      totalBytes > 0
        ? Math.round((uploadedBytes / totalBytes) * 100)
        : totalCount > 0 && successCount === totalCount
          ? 100
          : 0

    // 总进度的颜色: 还有在传的就是进行中; 全部成功为绿;
    // 否则有失败显示红, 只有取消显示灰
    const bar =
      uploadingCount > 0
        ? 'active'
        : totalCount > 0 && successCount === totalCount
          ? 'success'
          : failedCount > 0
            ? 'failed'
            : 'canceled'

    return {
      totalCount,
      totalBytes,
      successCount,
      uploadingCount,
      failedCount,
      canceledCount,
      total,
      bar,
    }
  }, [tasks])

  return (
    <div className="learn-kb-uploader">
      <FileDropzone onFiles={onFiles} hint={hint} />

      {/* 队列为空时不占位: 选过文件后总进度面板才出现 */}
      {summary.totalCount > 0 && (
        <section className="learn-kb-batch" aria-label="批量上传进度">
          <div className="learn-kb-batch-head">
            <span>总进度</span>
            <span className="learn-kb-batch-percent">{summary.total}%</span>
          </div>

          <div className="learn-kb-progress learn-kb-batch-progress">
            <div
              className={`learn-kb-progress-fill ${summary.bar}`}
              style={{ width: `${summary.total}%` }}
            />
          </div>

          <div className="learn-kb-batch-meta">
            <span>
              已完成{' '}
              <strong>
                {summary.successCount}/{summary.totalCount}
              </strong>
            </span>
            {summary.uploadingCount > 0 && <span>上传中 {summary.uploadingCount}</span>}
            {summary.failedCount > 0 && <span>失败 {summary.failedCount}</span>}
            {summary.canceledCount > 0 && <span>已取消 {summary.canceledCount}</span>}
            <span>共 {formatBytes(summary.totalBytes)}</span>
          </div>

          {/* 单文件进度: 每个任务的进度条与取消/重试/移除 */}
          <UploadTaskList
            tasks={tasks}
            onCancel={onCancel}
            onRetry={onRetry}
            onRemove={onRemove}
          />
        </section>
      )}
    </div>
  )
}

export default BatchUploader
