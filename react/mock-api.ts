import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

// ── 本地 mock 接口(仅开发环境生效) ───────────────────────────
// 学习项目没有真实后端, 用这个 Vite 插件在 dev server 上挂一组 /api/* 接口:
//   GET  /api/todos         查询待办列表
//   POST /api/todos         新增待办(标题为空时返回"业务失败")
//   GET  /api/profile       查询个人信息(需要请求头里的 token, 用于演示 401)
//   GET  /api/server-error  固定返回 500(用于演示服务端错误)
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

        sendJson(res, 404, { code: 404, message: `接口不存在: ${method} ${path}`, data: null })
      })
    },
  }
}
