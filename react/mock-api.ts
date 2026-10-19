import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

// ── 本地 mock 接口(仅开发环境生效) ───────────────────────────
// 学习项目没有真实后端, 用这个 Vite 插件在 dev server 上挂一组 /api/* 接口:
//   GET  /api/todos         查询待办列表
//   POST /api/todos         新增待办(标题为空时返回"业务失败")
//   GET  /api/profile       查询个人信息(需要请求头里的 token, 用于演示 401)
//   GET  /api/server-error  固定返回 500(用于演示服务端错误)
//   GET  /api/slow          慢接口(延迟约 5 秒才返回, 用于演示请求取消)
//   GET  /api/sse/ticks     SSE: 每 700ms 推一条事件, 推满 8 条后以 done 事件收尾
//   POST /api/chat/stream   SSE: 流式问答, 按随机大小的块推送文本, 最后发 [DONE];
//                           问题带"错误"二字时 3 块后发 error 事件;
//                           问题带"断开"二字时 3 块后直接断流(不发 [DONE])
//   GET    /api/knowledge/documents         查询知识库文档列表
//   POST   /api/knowledge/documents/upload  上传文档(multipart/form-data, 慢速接收便于观察进度)
//   DELETE /api/knowledge/documents/:id     删除文档
//
// 所有响应统一为 { code, message, data } 结构: code 为 0 表示业务成功,
// 与 src/api/request.ts 里约定的 ApiResponse 类型保持一致;
// 本文件只在 VITE_USE_MOCK=true 时被 vite.config.ts 加载, 不进入生产构建

interface TodoItem {
  id: number
  title: string
  done: boolean
}

// 内存数据: 每次重启 dev server 复位
const todos: TodoItem[] = [
  { id: 1, title: '学习 Ant Design 组件库', done: true },
  { id: 2, title: '封装 axios 请求实例', done: true },
  { id: 3, title: '理解请求/响应拦截器', done: false },
]
let nextTodoId = 4

// 模拟网络延迟: 让前端按钮的 loading 状态能看清楚
const DELAY_MS = 600

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

// 读取请求体: Connect 中间件里没有现成的 body 解析, 手动收集数据流
function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf-8')
    })
    req.on('end', () => resolve(raw))
    req.on('error', reject)
  })
}

// SSE 响应头: 事件流是"边产生边写入"的长连接, 要先把响应头发出去,
// 后续每次 res.write 的内容才会立刻到达浏览器(而不是等整个响应结束)
function sendSseHeaders(res: ServerResponse): void {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  // 经过 nginx 等反向代理时, 不开这个头事件可能被代理攒批后才一起下发
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}

// 流式问答的"回答": 拼一段带问题的长文本, 供下面的接口切块推送
function buildAnswer(question: string): string {
  return (
    `你问的是「${question}」。` +
    '这是一段由本地 mock 服务端生成的回答, 正在以 SSE 事件流的方式推送给你: ' +
    '服务端按随机大小把整段文字切成小块, 每隔几十到几百毫秒推一块; ' +
    '前端收到后先放入打字机队列, 再按固定节奏逐字渲染。' +
    '网络快时屏幕不会突然蹦出一整块, 网络慢时输出也不会一卡一顿。'
  )
}

// ── 知识库演示: 数据结构与上传模拟 ───────────────────────────

interface KnowledgeDocument {
  id: number
  name: string
  // 文件大小(字节): 列表与上传任务都按它显示
  size: number
  // parsing: 上传成功后服务端还在解析; ready: 解析完成, 可用于检索
  status: 'ready' | 'parsing'
  uploadedAt: string
}

// 预置数据: 模拟知识库里已有几份文档(每次重启 dev server 复位)
const knowledgeDocs: KnowledgeDocument[] = [
  {
    id: 1,
    name: 'React 官方文档摘录.md',
    size: 24_576,
    status: 'ready',
    uploadedAt: '2026-10-11T09:20:00+08:00',
  },
  {
    id: 2,
    name: '产品需求说明 v2.pdf',
    size: 1_248_000,
    status: 'ready',
    uploadedAt: '2026-10-13T14:05:00+08:00',
  },
  {
    id: 3,
    name: '接口联调记录.docx',
    size: 358_400,
    status: 'ready',
    uploadedAt: '2026-10-14T18:40:00+08:00',
  },
]
let nextDocId = 4

// 上传模拟节奏: 慢速接收请求体 → 再等一小会儿才响应 → 文档先"解析中"后变"就绪"
const UPLOAD_READ_MS = 2600 // 整个请求体的接收时长(让前端进度条能看清楚地推进)
const UPLOAD_ACK_MS = 900 // 收完后延迟响应(进度条 100% 后会停在"上传中"等待)
const DOC_PARSE_MS = 3000 // 响应返回后, 文档从 parsing 变为 ready 所需时间

// 慢速读取上传体: 每读一块就暂停一小会儿再恢复。
// 服务端消费变慢 → TCP 接收窗口收窄 → 浏览器的发送被"压"下来,
// 前端 onUploadProgress 的进度就不再是瞬间到 100%, 而是肉眼可见地推进
function readSlowBody(req: IncomingMessage): Promise<{ bytes: number; head: string }> {
  return new Promise((resolve, reject) => {
    let bytes = 0
    let head = ''
    let pauseMs: number | null = null
    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length
      // 只留前 16KB 文本用于提取 multipart 头部(避免扫描文件二进制内容)
      if (head.length < 16_384) head += chunk.subarray(0, 16_384 - head.length).toString('utf-8')

      if (pauseMs === null) {
        // 用第一块的大小估算总块数, 让整个接收时长接近 UPLOAD_READ_MS
        const total = Number(req.headers['content-length'] ?? 0)
        const chunks = total > 0 ? Math.ceil(total / chunk.length) : 16
        pauseMs = Math.min(60, Math.max(6, Math.round(UPLOAD_READ_MS / chunks)))
      }
      req.pause()
      setTimeout(() => req.resume(), pauseMs)
    })
    req.on('end', () => resolve({ bytes, head }))
    req.on('error', reject)
  })
}

// 从 multipart 头部提取文件名: 形如 filename="xxx"; 浏览器按 UTF-8 编码中文名
function extractFileName(head: string): string {
  const match = /filename="([^"]*)"/.exec(head)
  if (!match) return '未命名文件'
  // 极少数客户端会把文件名做 URL 编码, 能解则解, 解不开按原文
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

// Connect 中间件: use('/api', handler) 挂载后, req.url 会剥掉 /api 前缀
export function mockApiPlugin(): Plugin {
  return {
    name: 'learn-mock-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        await delay(DELAY_MS)

        const method = req.method ?? 'GET'
        const path = (req.url ?? '/').split('?')[0]

        if (method === 'GET' && path === '/todos') {
          sendJson(res, 200, { code: 0, message: 'ok', data: todos })
          return
        }

        if (method === 'POST' && path === '/todos') {
          const raw = await readRawBody(req)
          let title = ''
          try {
            title = ((JSON.parse(raw || '{}') as { title?: string }).title ?? '').trim()
          } catch {
            // 请求体不是合法 JSON 时按"标题为空"处理, 走下面的业务失败分支
          }
          if (!title) {
            // HTTP 200 但业务码非 0: 请求本身到了, 是业务规则不通过
            sendJson(res, 200, { code: 1, message: '标题不能为空', data: null })
            return
          }
          const item: TodoItem = { id: nextTodoId++, title, done: false }
          todos.unshift(item)
          sendJson(res, 200, { code: 0, message: 'ok', data: item })
          return
        }

        if (method === 'GET' && path === '/profile') {
          const authorization = req.headers.authorization
          if (!authorization) {
            // 401: 未登录/凭证过期, 前端响应拦截器会清掉本地 token 并提示
            sendJson(res, 401, { code: 401, message: '未登录或登录已过期', data: null })
            return
          }
          sendJson(res, 200, {
            code: 0,
            message: 'ok',
            // auth 把后端收到的请求头原样回显, 方便在页面上确认 token 注入成功
            data: { username: 'demo-user', role: 'admin', auth: authorization },
          })
          return
        }

        if (method === 'GET' && path === '/server-error') {
          sendJson(res, 500, { code: 500, message: '服务器内部错误(演示)', data: null })
          return
        }

        // ── 慢接口: 供"请求取消"演示 ────────────────────────────
        if (method === 'GET' && path === '/slow') {
          // 在全局 600ms 延迟之上再等约 4.4 秒: 给用户留足点"取消"的时间
          await delay(4400)
          // 客户端可能已经 abort(): 写之前确认响应还活着
          if (res.destroyed) return
          sendJson(res, 200, {
            code: 0,
            message: 'ok',
            data: { text: '慢接口总算返回了', servedAt: new Date().toLocaleTimeString('zh-CN') },
          })
          return
        }

        // ── SSE: 服务端持续推送(供 EventSource 演示) ────────────
        if (method === 'GET' && path === '/sse/ticks') {
          sendSseHeaders(res)

          // 每 700ms 推一条 data 事件, 推满 8 条后以自定义事件 done 收尾
          let seq = 0
          const timer = setInterval(() => {
            // 客户端可能在中途断开: 写之前确认响应还活着
            if (res.destroyed) {
              clearInterval(timer)
              return
            }
            seq += 1
            const payload = { seq, time: new Date().toLocaleTimeString('zh-CN') }
            // SSE 帧格式: "data: 内容" + 一个空行; 空行是帧结束标记, 少了就不会触发事件
            res.write(`data: ${JSON.stringify(payload)}\n\n`)

            if (seq >= 8) {
              // event: 自定义事件名; 客户端用 addEventListener('done', ...) 接收
              res.write('event: done\ndata: {}\n\n')
              clearInterval(timer)
              res.end()
            }
          }, 700)

          // 响应关闭(客户端 close())时清掉定时器, 避免继续写入已关闭的连接
          res.on('close', () => clearInterval(timer))
          return
        }

        // ── SSE: 流式问答(供 fetch + ReadableStream 演示) ───────
        if (method === 'POST' && path === '/chat/stream') {
          const raw = await readRawBody(req)
          let question = ''
          try {
            question = ((JSON.parse(raw || '{}') as { question?: string }).question ?? '').trim()
          } catch {
            // 请求体不是合法 JSON: 按空问题处理
          }
          if (!question) {
            // 流还没开始就失败了: 此时仍按普通 JSON 返回, 前端检查 response.ok 区分
            sendJson(res, 400, { code: 400, message: '问题不能为空', data: null })
            return
          }

          sendSseHeaders(res)

          const answer = buildAnswer(question)
          // 演示 "服务端中途报错": 问题里带"错误"二字时, 发 3 块后以 error 事件结束
          const faulty = question.includes('错误')
          // 演示 "服务端提前断流": 问题里带"断开"二字时, 发 3 块后直接断开且不发
          // [DONE] —— 模拟服务端进程崩溃/网关掐断长连接, 前端读到 EOF 却没有完成标记
          const broken = question.includes('断开')
          let offset = 0
          let sent = 0
          let timer: ReturnType<typeof setTimeout> | null = null

          const pushChunk = () => {
            // 客户端可能在任意时刻 abort(): 写之前确认响应还活着
            if (res.destroyed) return

            if (faulty && sent === 3) {
              res.write(
                `event: error\ndata: ${JSON.stringify({ message: '流式响应被服务端中断(演示)' })}\n\n`,
              )
              res.end()
              return
            }
            if (broken && sent === 3) {
              res.end() // 不发 [DONE]: 模拟服务端只推了一半就关掉连接
              return
            }
            if (offset >= answer.length) {
              // 约定的结束标记: 前端解析到它就知道内容发完了(各家大模型接口的通行做法)
              res.write('data: [DONE]\n\n')
              res.end()
              return
            }
            // 块大小 1~5 字、间隔 60~240ms 随机: 模拟"成块到达"的真实网络节奏
            const size = 1 + Math.floor(Math.random() * 5)
            const delta = answer.slice(offset, offset + size)
            offset += size
            sent += 1
            res.write(`data: ${JSON.stringify({ delta })}\n\n`)
            timer = setTimeout(pushChunk, 60 + Math.random() * 180)
          }

          pushChunk()

          // 客户端 abort() 时停止定时器(配合前端的"停止生成"按钮)
          res.on('close', () => {
            if (timer) clearTimeout(timer)
          })
          return
        }

        // ── 知识库演示接口: 文档列表 / 上传 / 删除 ───────────────
        if (method === 'GET' && path === '/knowledge/documents') {
          sendJson(res, 200, { code: 0, message: 'ok', data: knowledgeDocs })
          return
        }

        if (method === 'POST' && path === '/knowledge/documents/upload') {
          const { bytes, head } = await readSlowBody(req)
          const name = extractFileName(head)

          // 模拟服务端解析耗时: 此时上传字节已发完, 进度条停在 100% 等待响应
          await delay(UPLOAD_ACK_MS)

          // 演示"业务失败": 文件名里带"错误"二字(与流式接口的演示约定一致)
          if (name.includes('错误')) {
            sendJson(res, 200, {
              code: 1,
              message: '文档解析失败(演示): 文件名包含"错误"二字',
              data: null,
            })
            return
          }

          const doc: KnowledgeDocument = {
            id: nextDocId++,
            name,
            // mock 不做完整的 multipart 解析: 用 body 总字节数近似文件大小(含包装开销);
            // 拿不到 content-length(分块传输)时退回实际读到的字节数
            size: Number(req.headers['content-length'] ?? bytes),
            status: 'parsing',
            uploadedAt: new Date().toISOString(),
          }
          knowledgeDocs.unshift(doc)

          // 后台"解析"完成后把状态置为 ready: 前端延迟重新拉列表就能看到变化
          setTimeout(() => {
            doc.status = 'ready'
          }, DOC_PARSE_MS)

          sendJson(res, 200, { code: 0, message: 'ok', data: doc })
          return
        }

        if (method === 'DELETE' && path.startsWith('/knowledge/documents/')) {
          const id = Number(path.slice('/knowledge/documents/'.length))
          const index = knowledgeDocs.findIndex((doc) => doc.id === id)
          if (index === -1) {
            sendJson(res, 200, { code: 1, message: '文档不存在或已被删除', data: null })
            return
          }
          knowledgeDocs.splice(index, 1)
          sendJson(res, 200, { code: 0, message: 'ok', data: null })
          return
        }

        sendJson(res, 404, { code: 404, message: `接口不存在: ${method} ${path}`, data: null })
      })
    },
  }
}
