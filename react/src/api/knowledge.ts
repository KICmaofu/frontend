import { request } from './request'

// ── 业务接口: 知识库文档模块 ─────────────────────────────────
//   GET 列表 / POST 上传(multipart + 进度上报) / DELETE 删除
// 与 api/todo.ts 一样, 这里只定义"调哪个接口、拿到什么类型",
// 鉴权注入、业务码检查、错误提示都由 request.ts 的拦截器统一处理

export interface KnowledgeDocument {
  id: number
  name: string
  // 文件大小(字节)
  size: number
  // parsing: 服务端解析中; ready: 解析完成, 可用于检索
  status: 'ready' | 'parsing'
  uploadedAt: string
}

// 上传的附加控制: 进度回调 + 取消用的 AbortSignal(由调用方传入)
export interface UploadOptions {
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

// GET /api/knowledge/documents: 查询文档列表
export function fetchDocuments(): Promise<KnowledgeDocument[]> {
  return request<KnowledgeDocument[]>({ url: '/knowledge/documents', method: 'GET' })
}

// POST /api/knowledge/documents/upload: 上传文档(multipart/form-data)
// 浏览器里 axios 用 XMLHttpRequest 发送, onUploadProgress 来自 XHR 的上传进度事件;
// FormData 的 multipart 边界由浏览器/axios 自动生成, 不用手动设置 Content-Type
export function uploadDocument(
  file: File,
  options: UploadOptions = {},
): Promise<KnowledgeDocument> {
  const form = new FormData()
  form.append('file', file)
  return request<KnowledgeDocument>({
    url: '/knowledge/documents/upload',
    method: 'POST',
    data: form,
    signal: options.signal,
    onUploadProgress: (event) => {
      // event.total 在个别环境下拿不到: 没有总大小就先不更新百分比
      if (!options.onProgress || !event.total) return
      options.onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
}

// DELETE /api/knowledge/documents/:id: 删除文档
export function removeDocument(id: number): Promise<null> {
  return request<null>({ url: `/knowledge/documents/${id}`, method: 'DELETE' })
}
