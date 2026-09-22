import axios from 'axios'
import { message } from 'antd'
import type { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import type { MessageInstance } from 'antd/es/message/interface'

// ── axios 封装: 一个实例 + 请求/响应拦截器 ──────────────────
//   src/api/request.ts  本文件: 封装请求库本身(基础设施)
//   src/api/todo.ts     业务接口按模块划分, 只负责定义"调哪个接口"
//   mock-api.ts         根目录的 mock 后端(dev 环境由 Vite 插件提供接口)
//
// 三层结构:
//   ① 实例: baseURL / 超时等公共配置只写一次
//   ② 请求拦截器: 请求发出前统一处理(注入 token、记录耗时起点)
//   ③ 响应拦截器: 响应回来后统一处理(检查业务码、统一报错)
// 业务代码只调用 request<T>() / api.get / api.post, 不直接使用 axios

// 后端约定的统一响应结构(mock-api.ts 与真实后端保持一致)
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 登录凭证在 localStorage 里的 key: 登录成功写入, 退出登录/凭证过期时清除
export const TOKEN_KEY = 'learn-demo-token'

// ── ① 实例: 一个项目共用一个, 公共配置集中在这里 ─────────────
const http = axios.create({
  // dev 环境由 mock-api.ts 这个 Vite 插件接管 /api 前缀;
  // 对接真实后端时改成后端地址, 或在 vite.config.ts 里配置 server.proxy
  baseURL: '/api',
  timeout: 10_000,
})

// ── 全局提示: 拦截器在 React 组件之外运行, 拿不到 antd 的 App.useApp() ──
// main.tsx 里的桥接组件会把 message 实例注册进来(这样能吃到全局主题和语言);
// 注册前退回 message 静态方法, 保证任何时序下提示都不会丢
let messageApi: MessageInstance | null = null

export function setGlobalMessage(instance: MessageInstance): void {
  messageApi = instance
}

function notifyError(text: string): void {
  if (messageApi) {
    messageApi.error(text)
  } else {
    message.error(text)
  }
}

// ── 拦截器日志: 让演示页能"看见"拦截器的执行过程 ─────────────
// 拦截器只负责"产生日志", 订阅和展示由页面决定(两边解耦)
export interface InterceptorLog {
  id: number
  stage: '请求拦截器' | '响应拦截器' | '失败处理'
  text: string
}

const logListeners = new Set<(log: InterceptorLog) => void>()
let nextLogId = 1

export function subscribeInterceptorLog(listener: (log: InterceptorLog) => void): () => void {
  logListeners.add(listener)
  // 返回取消订阅的函数: 页面卸载时调用, 避免向已卸载的组件推送
  return () => {
    logListeners.delete(listener)
  }
}

function emitLog(stage: InterceptorLog['stage'], text: string): void {
  const log: InterceptorLog = { id: nextLogId++, stage, text }
  logListeners.forEach((listener) => listener(log))
}

// 请求开始时间: 响应拦截器里用来算耗时(key = 方法 + URL)
const startedAt = new Map<string, number>()

function requestKey(config: AxiosRequestConfig): string {
  return `${(config.method ?? 'get').toUpperCase()} ${config.url ?? ''}`
}

// ── ② 请求拦截器: 每个请求发出前都会经过这里 ─────────────────
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    // 统一注入登录凭证: 业务代码里不用关心每个接口要不要带 token
    config.headers.Authorization = `Bearer ${token}`
  }

  const key = requestKey(config)
  startedAt.set(key, performance.now())
  emitLog('请求拦截器', `发起 ${key}${token ? '(已注入 token)' : '(未登录, 不带 token)'}`)

  return config // 必须返回 config, 否则请求发不出去
})

// ── ③ 响应拦截器: HTTP 响应回来后都会经过这里 ────────────────
http.interceptors.response.use(
  (response) => {
    const key = requestKey(response.config)
    const elapsed = Math.round(performance.now() - (startedAt.get(key) ?? performance.now()))
    startedAt.delete(key)

    const body = response.data as ApiResponse<unknown>

    // 检查业务码: HTTP 200 不代表业务成功, code 非 0 按失败处理
    if (body.code !== 0) {
      emitLog('响应拦截器', `${key} 业务失败 code=${body.code} (${body.message})`)
      notifyError(body.message || '业务处理失败')
      return Promise.reject(new Error(body.message))
    }

    emitLog('响应拦截器', `${key} 成功 (HTTP ${response.status}, 耗时 ${elapsed}ms)`)
    return response
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    // 走到这里说明 HTTP 层就失败了(状态码非 2xx)或没拿到响应(断网/超时)
    const key = error.config ? requestKey(error.config) : '未知请求'
    const { response, code } = error

    let text: string
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      text = '请求超时, 请稍后重试'
    } else if (!response) {
      text = '网络异常, 无法连接到服务器'
    } else if (response.status === 401) {
      // 凭证失效: 清掉本地 token(真实项目里通常再跳转到登录页)
      localStorage.removeItem(TOKEN_KEY)
      text = response.data?.message ?? '登录已过期, 请重新登录'
    } else if (response.status >= 500) {
      text = response.data?.message ?? '服务器开小差了, 请稍后重试'
    } else {
      text = response.data?.message ?? `请求失败 (HTTP ${response.status})`
    }

    emitLog('失败处理', `${key} 出错 (${response ? `HTTP ${response.status}` : '网络层'}): ${text}`)
    notifyError(text) // 统一提示: 页面里的 catch 只需要收拾自己的局部状态
    return Promise.reject(error)
  },
)

// ── 对外只暴露"拿业务数据"的请求函数 ─────────────────────────
// 拦截器负责检查与报错, 这里负责拆开统一结构: 返回的 Promise 直接是 data
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<ApiResponse<T>>(config)
  return response.data.data
}

// 语义化快捷方法: 日常 get / post 够用, 特殊场景(上传、自定义头等)再用 request<T>
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    request<T>({ url, method: 'GET', params }),
  post: <T>(url: string, data?: unknown) => request<T>({ url, method: 'POST', data }),
}
