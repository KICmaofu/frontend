import { request } from './request'

// ── 业务接口: 知识库模块 ────────────────────────────────────
// 上半部分是"文档": GET 列表 / POST 上传(multipart + 进度上报) / DELETE 删除;
// 下半部分是"知识库实体"的 CRUD: GET 列表 / GET 详情 / POST 新建 /
// PATCH 更新 / DELETE 删除
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

// ── 知识库实体: 列表 / 详情 / 新建 / 更新 / 删除 ────────────

// 可见性: private 仅自己可见; team 团队可见; public 所有人可见
export type KnowledgeBaseVisibility = 'private' | 'team' | 'public'

export interface KnowledgeBase {
  id: number
  name: string
  description: string
  visibility: KnowledgeBaseVisibility
  // 知识库内的文档数量(列表与详情页展示, 由服务端维护)
  documentCount: number
  createdAt: string
  updatedAt: string
}

// 新建 / 更新时提交的字段: id、文档数、时间戳由服务端生成,
// 前端只需要关心用户能编辑的这三项
export interface KnowledgeBaseInput {
  name: string
  description: string
  visibility: KnowledgeBaseVisibility
}

// GET /api/knowledge/bases: 查询知识库列表
export function fetchKnowledgeBases(): Promise<KnowledgeBase[]> {
  return request<KnowledgeBase[]>({ url: '/knowledge/bases', method: 'GET' })
}

// GET /api/knowledge/bases/:id: 查询单个知识库(详情页 / 编辑页回填)
export function fetchKnowledgeBase(id: number): Promise<KnowledgeBase> {
  return request<KnowledgeBase>({ url: `/knowledge/bases/${id}`, method: 'GET' })
}

// POST /api/knowledge/bases: 新建知识库
export function createKnowledgeBase(input: KnowledgeBaseInput): Promise<KnowledgeBase> {
  return request<KnowledgeBase>({ url: '/knowledge/bases', method: 'POST', data: input })
}

// PATCH /api/knowledge/bases/:id: 更新知识库(部分字段更新)
export function updateKnowledgeBase(
  id: number,
  input: KnowledgeBaseInput,
): Promise<KnowledgeBase> {
  return request<KnowledgeBase>({ url: `/knowledge/bases/${id}`, method: 'PATCH', data: input })
}

// DELETE /api/knowledge/bases/:id: 删除知识库
export function removeKnowledgeBase(id: number): Promise<null> {
  return request<null>({ url: `/knowledge/bases/${id}`, method: 'DELETE' })
}

// ── 引用来源: 带来源的回答 + 文档正文段落 ────────────────────
// 回答里的 [1] [2] 与 sources 数组顺序一一对应;
// 每条来源记录"哪份文档、哪一段、引用原文", 前端据此滚动定位并高亮

export interface DocumentParagraph {
  // 段落在文档内稳定不变的 id, 作为滚动定位的锚点
  id: string
  text: string
}

export interface DocumentContent {
  documentId: number
  name: string
  paragraphs: DocumentParagraph[]
}

export interface CitationSource {
  id: string
  documentId: number
  documentName: string
  // 用于在正文中定位段落(data-paragraph-id)
  paragraphId: string
  // 展示给用户的位置描述, 如"第 3 段"
  locator: string
  // 段落内需要精确高亮的原文片段(必须是 paragraphs[].text 的子串)
  quote: string
}

export interface KnowledgeAnswer {
  question: string
  // 回答正文, 其中 [n] 是引用编号, 对应 sources[n - 1]
  answer: string
  sources: CitationSource[]
}

// GET /api/knowledge/answer: 获取一条带引用来源的示例回答
export function fetchKnowledgeAnswer(): Promise<KnowledgeAnswer> {
  return request<KnowledgeAnswer>({ url: '/knowledge/answer', method: 'GET' })
}

// GET /api/knowledge/documents/:id/content: 查询文档正文(按段落)
export function fetchDocumentContent(id: number): Promise<DocumentContent> {
  return request<DocumentContent>({
    url: `/knowledge/documents/${id}/content`,
    method: 'GET',
  })
}
