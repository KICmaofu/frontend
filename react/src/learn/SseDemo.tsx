import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Empty,
  Input,
  List,
  Radio,
  Space,
  Table,
  Tag,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { streamChat } from '../api/stream'
import { useTypewriter } from '../hooks/useTypewriter'

// ── SSE 流式请求与打字机逐字输出 ─────────────────────────────
// 接入封装: src/api/stream.ts —— 用 fetch + ReadableStream 手动解析 SSE 帧
// 打字机实现: src/hooks/useTypewriter.ts —— 队列 + 定时器, 匀速逐字输出
// mock 后端: 根目录 mock-api.ts 新增 GET /api/sse/ticks 与 POST /api/chat/stream
//
// SSE(Server-Sent Events): 服务端在一条 HTTP 长连接上持续推"事件"给浏览器,
// 响应类型是 text/event-stream, 内容是纯文本帧, 帧之间用一个空行分隔。
// 本页把两个概念分开学:
//   SSE        —— 数据怎么"来": 长连接, 服务端按自己的节奏推
//   打字机效果 —— 数据怎么"显": 前端把到达的文本按固定节奏逐字渲染

// ── 1. EventSource: 浏览器原生的 SSE 客户端 ─────────────────

type ConnectionPhase = 'idle' | 'connecting' | 'open' | 'closed'

interface TickPayload {
  seq: number
  time: string
}

const phaseText: Record<ConnectionPhase, string> = {
  idle: '未连接',
  connecting: '连接中…',
  open: '已连接, 接收中',
  closed: '已断开',
}

function EventSourceSection() {
  const [logs, setLogs] = useState<string[]>([])
  const [phase, setPhase] = useState<ConnectionPhase>('idle')
  const sourceRef = useRef<EventSource | null>(null)

  const append = (text: string) => {
    // 只保留最近 12 条, 防止日志越滚越长
    setLogs((prev) => [...prev.slice(-11), text])
  }

  const connect = () => {
    // 一次只维护一个连接: 重复点击时先关掉旧的
    sourceRef.current?.close()
    setPhase('connecting')
    append('new EventSource("/api/sse/ticks") → readyState=0(CONNECTING)')

    // EventSource 是浏览器原生 API: 传同源路径字符串即可, 不走 axios 的 baseURL 配置
    const source = new EventSource('/api/sse/ticks')
    sourceRef.current = source

    source.onopen = () => {
      setPhase('open')
      append('onopen → readyState=1(OPEN): 连接建立, 开始收事件')
    }

    // 默认的 message 事件: 服务端没写 event: 字段的 data 帧都走这里
    source.onmessage = (event) => {
      const tick = JSON.parse(event.data) as TickPayload
      append(`message 事件: 第 ${tick.seq} 条推送 (${tick.time})`)
    }

    // 自定义事件: 服务端写了 "event: done", 这里用同名监听器接收
    source.addEventListener('done', () => {
      append('done 事件: 服务端收尾, 客户端 close() 释放连接')
      source.close()
      setPhase('closed')
    })

    // 连接出错/被服务端关闭时触发; 不主动 close() 的话浏览器会自动尝试重连
    // (这是 EventSource 的默认行为, 也是使用它的主要"坑")
    source.onerror = () => {
      append(`onerror: readyState=${source.readyState}(未主动 close 时浏览器会自动重连)`)
    }
  }

  const disconnect = () => {
    sourceRef.current?.close()
    sourceRef.current = null
    setPhase('closed')
    append('close() → readyState=2(CLOSED): 主动断开, 不会再自动重连')
  }

  // 页面切走时断开连接, 避免长连接泄漏
  useEffect(
    () => () => {
      sourceRef.current?.close()
    },
    [],
  )

  return (
    <Card size="small" title="EventSource: 接收 /api/sse/ticks 的服务端推送">
      <p>
        EventSource 一行代码就开始收事件, 断线还会自动重连; 代价是只能发 GET
        请求、不能自定义请求头(带不了 Authorization)。
      </p>

      <Space wrap>
        <Button
          type="primary"
          onClick={connect}
          disabled={phase === 'connecting' || phase === 'open'}
        >
          连接
        </Button>
        <Button onClick={disconnect} disabled={phase === 'idle' || phase === 'closed'}>
          断开(close)
        </Button>
        <Tag
          color={phase === 'open' ? 'success' : phase === 'connecting' ? 'processing' : 'default'}
        >
          {phaseText[phase]}
        </Tag>
      </Space>

      {logs.length === 0 ? (
        <Empty description="点击「连接」观察服务端每 700ms 推来的一条事件" />
      ) : (
        <List
          size="small"
          dataSource={logs}
          renderItem={(text) => (
            <List.Item>
              <span className="learn-log-text">{text}</span>
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}

// ── 2. fetch + ReadableStream: 流式接口的通用写法 ────────────
// EventSource 的两个限制(只能 GET、不能加请求头)挡住了问答类接口:
// 它们要 POST 传参、要带 token、还要支持中途取消。主流方案是 fetch 拿到
// response.body(ReadableStream) 之后自己解析 SSE 帧 —— 封装见 src/api/stream.ts。
//
// 本节先看"最诚实"的渲染方式: 每收到一块就直接拼一块, 节奏完全跟着网络走

function RawStreamSection() {
  const { message } = AntdApp.useApp()
  const [question, setQuestion] = useState('什么是 SSE?')
  const [output, setOutput] = useState('')
  const [chunks, setChunks] = useState(0)
  const [streaming, setStreaming] = useState(false)
  const ctrlRef = useRef<AbortController | null>(null)

  const send = async (text: string) => {
    const q = text.trim()
    if (!q) {
      message.warning('先输入一个问题')
      return
    }

    setQuestion(q)
    setOutput('')
    setChunks(0)
    setStreaming(true)
    const ctrl = new AbortController()
    ctrlRef.current = ctrl

    try {
      await streamChat(
        q,
        {
          // 片多大就直接拼多大: 这就是"流式接收"的原貌, 块与块之间的停顿肉眼可见
          onChunk: (delta) => {
            setChunks((n) => n + 1)
            setOutput((prev) => prev + delta)
          },
        },
        ctrl.signal,
      )
      message.success('收到 [DONE], 流式接收完成')
    } catch (error) {
      // 这条链路不走 axios, 没有响应拦截器兜底: 提示要自己弹
      if (ctrl.signal.aborted) {
        message.info('已通过 AbortController 中断(已收到的内容保留)')
      } else {
        message.error(error instanceof Error ? error.message : '流式请求失败')
      }
    } finally {
      setStreaming(false)
      ctrlRef.current = null
    }
  }

  return (
    <Card size="small" title="fetch + ReadableStream: 原始输出(收到一块拼一块)">
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onPressEnter={() => void send(question)}
        placeholder="输入一个问题"
        disabled={streaming}
      />

      <Space wrap style={{ marginTop: 12 }}>
        <Button type="primary" onClick={() => void send(question)} loading={streaming}>
          发送
        </Button>
        <Button danger onClick={() => ctrlRef.current?.abort()} disabled={!streaming}>
          停止生成(abort)
        </Button>
        <Button
          onClick={() => void send('流式响应遇到错误怎么处理?')}
          disabled={streaming}
        >
          提问带「错误」二字(演示服务端中断)
        </Button>
        <Button
          onClick={() => void send('服务端断开时前端怎么兜底?')}
          disabled={streaming}
        >
          提问带「断开」二字(演示提前断流)
        </Button>
        <Tag>累计收到 {chunks} 块</Tag>
      </Space>

      <div className="learn-stream-box" style={{ marginTop: 12 }}>
        {output || (
          <span style={{ opacity: 0.5 }}>点击「发送」, 文本会随网络节奏成块出现…</span>
        )}
      </div>
    </Card>
  )
}

// ── 3. 打字机效果: 队列 + 定时器, 与网络节奏解耦 ─────────────
// 实现见 src/hooks/useTypewriter.ts, 核心只有三件事:
//   ① push: 收到的片段先进"目标文本"队列, 不直接上屏
//   ② 定时器每 intervalMs 从队首取一个字符追加到屏幕
//   ③ finish: 流结束后队列里可能还有积压, 打完才算 done
// 观察点: 「累计收到」随网络忽快忽慢, 「已输出」匀速前进, 队列积压是两者的差

const speedOptions = [
  { label: '慢速 48ms/字', value: 48 },
  { label: '标准 24ms/字', value: 24 },
  { label: '高速 8ms/字', value: 8 },
]

function TypewriterSection() {
  const { message } = AntdApp.useApp()
  const [speed, setSpeed] = useState(24)
  const [question, setQuestion] = useState('为什么流式输出需要打字机效果?')
  const [streaming, setStreaming] = useState(false)
  const [started, setStarted] = useState(false)
  const tw = useTypewriter(speed)
  const ctrlRef = useRef<AbortController | null>(null)

  const send = async (text: string) => {
    const q = text.trim()
    if (!q) {
      message.warning('先输入一个问题')
      return
    }

    tw.reset()
    setStarted(true)
    setStreaming(true)
    const ctrl = new AbortController()
    ctrlRef.current = ctrl

    try {
      await streamChat(
        q,
        {
          // 与上一节的关键区别: 收到的片段不直接渲染, 先塞进打字机队列
          onChunk: (delta) => tw.push(delta),
        },
        ctrl.signal,
      )
    } catch (error) {
      if (!ctrl.signal.aborted) {
        message.error(error instanceof Error ? error.message : '流式请求失败')
      }
    } finally {
      setStreaming(false)
      // 无论正常结束还是被中断: 让打字机把队列里积压的字符输出完再收工
      tw.finish()
      ctrlRef.current = null
    }
  }

  const status = !started ? '未开始' : streaming ? '接收中…' : tw.done ? '完成' : '输出中…'
  const statusColor = !started
    ? 'default'
    : streaming
      ? 'processing'
      : tw.done
        ? 'success'
        : 'warning'

  return (
    <Card size="small" title="useTypewriter: 收到的进队列, 定时器匀速逐字上屏">
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onPressEnter={() => void send(question)}
        placeholder="输入一个问题"
        disabled={streaming}
      />

      <Space wrap style={{ marginTop: 12 }}>
        <Button type="primary" onClick={() => void send(question)} loading={streaming}>
          发送(SSE + 打字机)
        </Button>
        <Button danger onClick={() => ctrlRef.current?.abort()} disabled={!streaming}>
          停止生成
        </Button>
        <Tag color={statusColor}>{status}</Tag>
      </Space>

      <Space wrap>
        <Radio.Group
          size="small"
          optionType="button"
          options={speedOptions}
          value={speed}
          onChange={(e) => setSpeed(e.target.value as number)}
        />
        <span className="learn-log-text" style={{ opacity: 0.7 }}>
          速度从下一次发送开始生效
        </span>
      </Space>

      <Space wrap>
        <Tag>累计收到 {tw.typed.length + tw.pending} 字</Tag>
        <Tag color="processing">已输出 {tw.typed.length} 字</Tag>
        <Tag color={tw.pending > 0 ? 'warning' : 'default'}>队列积压 {tw.pending} 字</Tag>
      </Space>

      <div className="learn-stream-box">
        {tw.typed}
        {started && !tw.done && <span className="learn-stream-caret" />}
        {!started && (
          <span style={{ opacity: 0.5 }}>点击「发送」, 观察文本按固定节奏逐字出现…</span>
        )}
      </div>
    </Card>
  )
}

// ── 4. 异常分类: 失败形态比普通请求多, 逐类都有自己的出路 ────
// 识别与处理都发生在 src/api/stream.ts; 本表是写流式功能时的"查漏清单":
// 对照确认每一种失败都有人管(给提示、保留已收内容、或静默收尾)

interface ErrorRow {
  key: string
  form: string
  trigger: string
  detect: string
  handle: string
}

const errorColumns: TableColumnsType<ErrorRow> = [
  { title: '异常形态', dataIndex: 'form', width: 190 },
  { title: '典型触发', dataIndex: 'trigger', width: 200 },
  { title: '前端如何识别', dataIndex: 'detect' },
  { title: '处理策略', dataIndex: 'handle' },
]

const errorRows: ErrorRow[] = [
  {
    key: '1',
    form: '① 请求前失败(HTTP 4xx/5xx)',
    trigger: '参数错误、鉴权失败、服务端异常',
    detect: '!response.ok, 响应体此时仍是普通 JSON',
    handle: '解析其中的 message 后报错(流未开始, 按普通请求兜底)',
  },
  {
    key: '2',
    form: '② error 事件',
    trigger: '生成被风控掐断、模型过载',
    detect: 'HTTP 已是 200, 但收到 event: error 帧',
    handle: '读帧内 message 报错; 已收内容由调用方决定保留与否',
  },
  {
    key: '3',
    form: '③ 服务端提前断流',
    trigger: '服务端崩溃、网关掐断长连接',
    detect: '流结束(EOF)但没有收到 [DONE]',
    handle: '报"回答可能不完整", 提示重试',
  },
  {
    key: '4',
    form: '④ 网络中断',
    trigger: '断网、连接被重置',
    detect: 'fetch / reader.read() 抛出错误',
    handle: '包装成友好提示; 已渲染内容保留, 可提供重试入口',
  },
  {
    key: '5',
    form: '⑤ 数据帧损坏',
    trigger: '服务端 bug、中间代理篡改',
    detect: '帧内容 JSON.parse 失败或字段缺失',
    handle: '拒绝继续解析并报错, 不把脏数据渲染给用户',
  },
  {
    key: '6',
    form: '⑥ 主动取消',
    trigger: '用户点"停止生成"',
    detect: 'AbortError + signal.aborted 为 true',
    handle: '不算故障: 不弹错误, 保留已收内容, 状态在 finally 里收尾',
  },
]

function ErrorTableSection() {
  return (
    <Card size="small" title="流式失败形态清单: 每一类都要有自己的出路">
      <Table<ErrorRow>
        columns={errorColumns}
        dataSource={errorRows}
        rowKey="key"
        size="small"
        pagination={false}
      />
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        还有一个容易漏的约定: 帧必须以空行结尾。服务端最后没发空行就断流时, 残留的半帧
        不会参与解析 —— 它会体现在"未收到 [DONE]"上, 归入第 ③ 类处理
      </p>
    </Card>
  )
}

// ── 5. 小结 ─────────────────────────────────────────────────

function SummarySection() {
  return (
    <div className="learn-card">
      <p>
        EventSource: 一行 new 就能收事件, 断线自动重连; 但只能 GET、不能自定义请求头,
        适合行情/通知这类简单推送。注意在服务端收尾后主动 close(), 否则浏览器会自动重连
      </p>
      <p>
        fetch + ReadableStream: POST、自定义头、中途 abort 都支持, 是"流式问答"的通用方案;
        代价是事件流要自己解析 —— 空行分帧, data: 行取内容, [DONE] 表示结束, 见
        src/api/stream.ts
      </p>
      <p>
        打字机: 队列 + 定时器把"到达节奏"和"显示节奏"解耦; 别忘了两处收尾 ——
        流结束/中断后把队列打完(finish), 组件卸载时清掉定时器(useEffect 清理函数)
      </p>
      <p>
        流式失败形态比普通请求多(HTTP 错误 / error 事件 / 提前断流 / 网络中断 / 坏帧 /
        主动取消), src/api/stream.ts 给每一类都带了明确的错误信息, 上面第 4 节的表
        可以当查漏清单
      </p>
      <p>
        取消也算异常吗: abort 会让 fetch / read 抛 AbortError, 语法上是异常、语义上是
        主动结束 —— 用 signal.aborted 区分, 不弹错误提示; 已收到的内容照常保留
      </p>
      <p>
        接真实后端时: 反向代理(如 nginx)要关闭响应缓冲(proxy_buffering off 或
        X-Accel-Buffering: no), 否则事件会被代理攒批后才一起下发, 流式效果消失
      </p>
      <p>
        与 WebSocket 的分工: 只要"服务端单向推"就用 SSE(走 HTTP、实现简单、自带重连);
        需要双向高频通信(聊天室、协同编辑)才上 WebSocket
      </p>
    </div>
  )
}

// ── 页面装配 ────────────────────────────────────────────────

function SseDemo() {
  return (
    <div className="learn-demo">
      <Alert
        type="info"
        showIcon
        message="SSE 管数据怎么『来』, 打字机管数据怎么『显』"
        description={
          <>
            <p>接入封装: src/api/stream.ts —— fetch + ReadableStream 手动解析 SSE 帧</p>
            <p>打字机实现: src/hooks/useTypewriter.ts —— 队列 + 定时器匀速出字</p>
            <p>
              mock 后端: mock-api.ts 新增 GET /api/sse/ticks(服务端推送)与
              POST /api/chat/stream(流式问答), 仅 dev 环境生效
            </p>
          </>
        }
      />

      <h3>1. EventSource: 浏览器原生的 SSE 客户端</h3>
      <EventSourceSection />

      <h3>2. fetch + ReadableStream: 流式接口的原始输出</h3>
      <RawStreamSection />

      <h3>3. 打字机效果: 队列 + 定时器逐字输出</h3>
      <TypewriterSection />

      <h3>4. 异常分类: 流式的失败形态清单</h3>
      <ErrorTableSection />

      <h3>5. 小结: 怎么选、注意什么</h3>
      <SummarySection />
    </div>
  )
}

export default SseDemo
