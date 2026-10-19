import { TOKEN_KEY } from './request'
import type { ApiResponse } from './request'

// ── SSE 流式请求: fetch + ReadableStream 手动解析事件流 ────────
// 与 request.ts 的关系:
//   ① URL 前缀、token 取值方式复用同一套约定(VITE_API_BASE_URL + TOKEN_KEY)
//   ② 但这条链路不走 axios: XHR 拿不到"边收边读"的流式响应体, 响应拦截器与
//      自动解包也不适用, 所以业务码检查/错误提示要在本文件里自行完成
// 与 EventSource 的关系:
//   EventSource 只能 GET、不能自定义请求头, 而问答类接口往往要 POST 传参、
//   带 Authorization、还支持中途取消 —— 因此主流做法就是用 fetch 读流,
//   再按 SSE 规范自己解析"帧"(见本文件下半部分)
//
// SSE 数据帧: 一帧由若干 "字段: 值" 的行组成, 帧之间用一个空行分隔;
// 常用两种字段: event(事件名, 缺省是 message)与 data(内容)
//
// 流式接口的失败形态比普通请求多, 每种都要有自己的出路(与 SseDemo 页的对照表一致):
//   ① 请求前失败  HTTP 4xx/5xx, 此时响应体还是普通 JSON —— 与本文件开头同样处理
//   ② error 事件  HTTP 已是 200, 服务端用 event: error 帧报错 —— 解析帧后抛错
//   ③ 网络中断    fetch / reader.read() 本身抛错(断网、连接被重置)
//   ④ 提前断流    流结束(EOF)但没有收到 [DONE] —— 回答不完整, 必须报错
//   ⑤ 坏帧        帧内容 JSON.parse 失败或字段缺失 —— 数据不可信, 拒绝继续解析
//   ⑥ 主动取消    用户 abort —— 语法上是异常(AbortError), 语义上是主动结束;
//                用 signal.aborted 区分, 不算"故障", 调用方不应弹错误提示

interface SseFrame {
  event: string
  data: string
}

// 解析一帧(入参不含帧尾空行): 多行 data 按规范用 \n 连接
function parseFrame(frame: string): SseFrame {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      // 冒号后允许有一个空格作分隔符, 它属于格式而非内容
      const value = line.slice('data:'.length)
      dataLines.push(value.startsWith(' ') ? value.slice(1) : value)
    }
    // 其余字段(id/retry/注释行等)与本示例无关, 忽略
  }

  return { event, data: dataLines.join('\n') }
}

// 帧内容是 JSON 字符串; 解析失败说明这一帧已损坏, 把原始片段带进报错信息方便排查
function parseData(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch (cause) {
    throw new Error(`数据帧不是合法 JSON(前 40 字符): ${raw.slice(0, 40)}`, { cause })
  }
}

export interface StreamChatHandlers {
  // 每收到一段文本就回调一次; 片段的大小与间隔由服务端和网络决定(这就是"爆字"的来源)
  onChunk: (delta: string) => void
}

// 流式问答: POST { question } -> 持续回调 onChunk -> 收到 [DONE] 正常结束
// signal 用于中断(用户点"停止生成"时 abort): 中断会让 fetch 抛出 AbortError,
// 语法上它是一个异常, 但语义上是"用户主动结束", 由调用方用 signal.aborted 区分
export async function streamChat(
  question: string,
  handlers: StreamChatHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY)

  // ③ 网络中断: 连都连不上时 fetch 抛类型错误(断网/DNS/连接被拒), 包装成
  //    用户能看懂的提示; 主动取消的 AbortError 要原样上抛, 不能混为一谈
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 与 axios 请求拦截器同样的 token 约定, 这里手动注入
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question }),
    signal,
  }).catch((error: unknown) => {
    if (signal?.aborted) throw error
    throw new Error('网络异常, 无法建立流式连接', { cause: error })
  })

  // ① 流还没开始就失败了(如 400/500): 此刻收到的还是普通 JSON 响应, 按普通请求处理
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiResponse<null> | null
    throw new Error(body?.message ?? `请求失败 (HTTP ${response.status})`)
  }
  if (!response.body) {
    throw new Error('当前浏览器不支持流式响应(ReadableStream)')
  }

  const reader = response.body.getReader()
  // stream: true: 一个中文可能被拆在两个 chunk 之间, 解码器会先缓冲半个字符
  const decoder = new TextDecoder('utf-8')
  // 帧也可能被拆成多次到达: 没凑齐的尾部留在缓冲里, 等下一轮 read 再拼
  let buffer = ''
  // 只有收到 [DONE] 才算"完整收完"; 用它区分正常结束 与 ④ 提前断流
  let receivedDone = false

  try {
    while (true) {
      let result: ReadableStreamReadResult<Uint8Array>
      try {
        result = await reader.read()
      } catch (error) {
        // ③ 读流途中连接断了(与 fetch 阶段的网络错误同样是"网络中断")
        if (signal?.aborted) throw error
        throw new Error('连接中断, 已接收的内容可保留', { cause: error })
      }
      if (result.done) break

      buffer += decoder.decode(result.value, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? '' // 最后一段通常是不完整的帧, 不能当帧处理

      for (const frame of frames) {
        const { event, data } = parseFrame(frame)
        if (!data) continue

        if (data === '[DONE]') {
          // 约定的结束标记: 内容已发完
          receivedDone = true
          return
        }
        if (event === 'error') {
          // ② 服务端用 error 事件主动报错(HTTP 已是 200, 只能靠事件内容区分)
          const { message } = parseData(data) as { message: string }
          throw new Error(message)
        }

        // ⑤ 帧结构也要校验: delta 必须是字符串, 否则说明数据不符合接口约定
        const { delta } = parseData(data) as { delta?: string }
        if (typeof delta !== 'string') {
          throw new Error('数据帧缺少 delta 字段, 与接口约定不符')
        }
        handlers.onChunk(delta)
      }
    }

    // ④ 循环因 EOF 退出: 只有收到 [DONE] 才算完整收完, 否则说明服务端只发了一半
    //    ([DONE] 正常到达时会直接 return, 走不到这里; 判断保留是为了语义严谨)
    if (!receivedDone) {
      throw new Error('服务端提前关闭了连接, 回答可能不完整')
    }
  } finally {
    // 提前 return([DONE])/出错/取消时: 释放 reader, 并告诉服务端"后续数据不用发了"
    // (正常读完是 no-op); 不接 catch 时, [DONE] 后再调 cancel 会产生未处理的 rejection
    void reader.cancel().catch(() => {})
  }
}
