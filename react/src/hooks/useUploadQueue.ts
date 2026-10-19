import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { uploadDocument } from '../api/knowledge'
import type { KnowledgeDocument } from '../api/knowledge'

// ── 上传队列(自定义 Hook) ───────────────────────────────────
// 把"选中的文件"变成一组可观察的上传任务: 每个文件一个任务,
// 各自独立推进度、独立取消(AbortController)、失败后可重试;
// 组件层只负责渲染, 上传的细节全部收敛在这里

export type UploadStatus = 'uploading' | 'success' | 'failed' | 'canceled'

export interface UploadTask {
  id: string
  // 任务保留原始 File: 失败重试时不需要让用户重新选文件
  file: File
  name: string
  size: number
  // 0-100
  progress: number
  status: UploadStatus
  error?: string
}

// 任务 id 自增即可: 稳定且不依赖 crypto
let nextTaskId = 1

export function useUploadQueue(onUploaded?: (doc: KnowledgeDocument) => void) {
  const [tasks, setTasks] = useState<UploadTask[]>([])
  // 任务 id → 取消控制器: "取消"按钮据此中断对应请求
  const controllersRef = useRef(new Map<string, AbortController>())
  // 回调放入 ref: startUpload 里总能调到"最新一次渲染"传入的回调;
  // 在 effect 里同步(而非渲染期间写 ref), 符合 React 对 ref 的使用约定
  const onUploadedRef = useRef(onUploaded)
  useEffect(() => {
    onUploadedRef.current = onUploaded
  })

  // 下面这些函数不做 useCallback(每次渲染重建): 这样它们总是读到最新的
  // tasks 状态(如 retryTask 要查当前任务), 代价只是子组件收到新函数引用,
  // 本示例规模下可以忽略

  function patchTask(id: string, patch: Partial<UploadTask>) {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)))
  }

  // 发起(或重新发起)一个任务的上传
  function startUpload(task: UploadTask) {
    const controller = new AbortController()
    controllersRef.current.set(task.id, controller)

    uploadDocument(task.file, {
      signal: controller.signal,
      onProgress: (percent) => patchTask(task.id, { progress: percent }),
    })
      .then((doc) => {
        patchTask(task.id, { progress: 100, status: 'success' })
        onUploadedRef.current?.(doc)
      })
      .catch((error: unknown) => {
        if (axios.isCancel(error)) {
          // 主动取消不是故障: 拦截器不会弹提示, 这里把状态改成"已取消"
          patchTask(task.id, { status: 'canceled' })
          return
        }
        // 业务失败/网络错误: 拦截器已弹全局提示, 任务上再留一条失败原因
        const text = error instanceof Error ? error.message : '上传失败, 请重试'
        patchTask(task.id, { status: 'failed', error: text })
      })
      .finally(() => {
        controllersRef.current.delete(task.id)
      })
  }

  // 把新选中的文件加入队列, 并立即逐个开始上传(新任务排在最前)
  function enqueue(files: File[]) {
    const created: UploadTask[] = files.map((file) => ({
      id: `upload-${nextTaskId++}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading',
    }))
    setTasks((prev) => [...created, ...prev])
    created.forEach(startUpload)
  }

  // 取消上传中的任务: abort 对应请求
  function cancelTask(id: string) {
    controllersRef.current.get(id)?.abort()
  }

  // 重试失败/已取消的任务: 原地重置进度后重新发起
  function retryTask(id: string) {
    const target = tasks.find((task) => task.id === id)
    if (!target || target.status === 'uploading') return
    patchTask(id, { status: 'uploading', progress: 0, error: undefined })
    startUpload(target)
  }

  // 从列表里移除任务(已上传的、或失败后不想再试的)
  function removeTask(id: string) {
    // 保险起见: 万一调用方移除了在途任务, 先中断请求再移除
    controllersRef.current.get(id)?.abort()
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  return { tasks, enqueue, cancelTask, retryTask, removeTask }
}
