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
//   GET    /api/knowledge/documents/:id/content  查询文档正文(按段落, 供引用定位)
//   GET    /api/knowledge/answer            获取带引用来源的示例回答
//   GET    /api/knowledge/bases             查询知识库列表
//   GET    /api/knowledge/bases/:id         查询知识库详情
//   POST   /api/knowledge/bases             新建知识库(名称必填, 且不可重名)
//   PATCH  /api/knowledge/bases/:id         更新知识库
//   DELETE /api/knowledge/bases/:id         删除知识库
//   GET    /api/chat/sessions               查询会话列表
//   POST   /api/chat/sessions               新建会话(标题按序号生成)
//   PATCH  /api/chat/sessions/:id           重命名会话(标题为空时返回"业务失败")
//   DELETE /api/chat/sessions/:id           删除会话
//   GET    /api/chat/sessions/:id/messages  查询会话消息(按时间正序)
//   POST   /api/chat/messages/:id/regenerate 重新生成 AI 回复(用户消息不可用)
//   DELETE /api/chat/messages/:id           删除消息(同步减少会话消息数)
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
  // 预置一份"解析中"文档: 第一次请求列表时开始倒计时,
  // 让文档列表页打开后能直接看到"解析中 → 可用"的实时变化
  {
    id: 4,
    name: '季度复盘纪要.md',
    size: 86_016,
    status: 'parsing',
    uploadedAt: '2026-10-30T09:15:00+08:00',
  },
]
let nextDocId = 5

// 预置文档的"解析"倒计时: 只在第一次拉列表时启动, 避免页面没打开就提前解析完
const SEED_PARSING_DOC_ID = 4
const SEED_PARSE_MS = 6000
let seedParseStarted = false

function startSeedParseOnce() {
  if (seedParseStarted) return
  seedParseStarted = true
  setTimeout(() => {
    const doc = knowledgeDocs.find((item) => item.id === SEED_PARSING_DOC_ID)
    // 文档可能已被删除: 找到且仍是解析中才改为可用
    if (doc && doc.status === 'parsing') doc.status = 'ready'
  }, SEED_PARSE_MS)
}

// ── 引用来源演示: 文档正文段落 + 一条带来源的示例回答 ───────
// 正文单独存一份, 不塞进文档列表接口: 列表只需要元数据,
// 打开原文时才按文档 id 拉取段落, 更接近真实后端的存储方式

interface DocumentParagraph {
  id: string
  text: string
}

interface CitationSource {
  id: string
  documentId: number
  documentName: string
  paragraphId: string
  locator: string
  quote: string
}

// 只给演示中会被引用的文档准备正文; 其他文档打开原文时会返回"暂无正文"
const documentContents: Record<number, DocumentParagraph[]> = {
  1: [
    {
      id: 'p-1',
      text: 'React 的更新分为 render 阶段与 commit 阶段。render 阶段根据新的 state 计算出一棵新的 UI 树。',
    },
    {
      id: 'p-2',
      text: 'render 阶段只负责计算新的 UI 树，commit 阶段才把变化提交到 DOM，因此状态更新后页面不会立刻改变。',
    },
    {
      id: 'p-3',
      text: '在并发模式下，render 阶段可能被中断或重放；因此副作用应放在 commit 阶段之后再执行。',
    },
    {
      id: 'p-4',
      text: '如果组件在 render 阶段发起请求或修改外部状态，就会破坏这一约定，导致难以排查的重复执行问题。',
    },
  ],
  3: [
    {
      id: 'p-1',
      text: '联调前先确认接口地址、请求方法与鉴权头是否和接口文档一致。',
    },
    {
      id: 'p-2',
      text: '打开浏览器 Network 面板，查看请求体与响应体，再对照服务端日志定位字段差异。',
    },
    {
      id: 'p-3',
      text: '先确认请求是否成功发出，再核对参数、响应码与服务端日志；跨域通常表现为浏览器直接拦截响应，而超时更可能是服务端没有返回。',
    },
    {
      id: 'p-4',
      text: '把复现步骤与请求 ID 记录到联调笔记，便于后续回溯与复盘。',
    },
  ],
}

// 示例回答: [n] 与 sources[n - 1] 对齐; quote 必须是对应段落 text 的子串
const sampleKnowledgeAnswer = {
  question: 'React 的状态更新为什么不会立刻反映到页面上？接口联调时又该按什么顺序排查？',
  answer:
    'React 把更新分成两个阶段：render 阶段负责计算新的 UI 树，commit 阶段才把变化提交到 DOM，所以状态更新后页面不会立刻改变。[1]\n\n' +
    '并发模式下，render 阶段还可能被中断或重放，因此副作用应放在 commit 阶段之后再执行。[2]\n\n' +
    '联调接口时，先确认请求是否成功发出，再核对参数、响应码与服务端日志；跨域通常表现为浏览器直接拦截响应，而超时更可能是服务端没有返回。[3]',
  sources: [
    {
      id: 'src-1',
      documentId: 1,
      documentName: 'React 官方文档摘录.md',
      paragraphId: 'p-2',
      locator: '第 2 段',
      quote: 'render 阶段只负责计算新的 UI 树，commit 阶段才把变化提交到 DOM',
    },
    {
      id: 'src-2',
      documentId: 1,
      documentName: 'React 官方文档摘录.md',
      paragraphId: 'p-3',
      locator: '第 3 段',
      quote: 'render 阶段可能被中断或重放',
    },
    {
      id: 'src-3',
      documentId: 3,
      documentName: '接口联调记录.docx',
      paragraphId: 'p-3',
      locator: '第 3 段',
      quote: '先确认请求是否成功发出，再核对参数、响应码与服务端日志',
    },
  ] satisfies CitationSource[],
}

// ── 知识库管理演示: 知识库实体与内存数据 ─────────────────────
// 与文档不同, 这里管理的是"知识库"本身(名称 / 描述 / 可见性),
// 文档列表接口保持不变, 两个页面各自独立演示

type KnowledgeBaseVisibility = 'private' | 'team' | 'public'

interface KnowledgeBase {
  id: number
  name: string
  description: string
  visibility: KnowledgeBaseVisibility
  documentCount: number
  createdAt: string
  updatedAt: string
}

// 预置知识库: 覆盖三种可见性, 方便列表筛选与详情展示(重启 dev server 复位)
const knowledgeBases: KnowledgeBase[] = [
  {
    id: 1,
    name: 'React 官方文档',
    description: 'React 核心概念与常用 API 的整理摘录',
    visibility: 'public',
    documentCount: 3,
    createdAt: '2026-10-08T10:20:00+08:00',
    updatedAt: '2026-10-14T18:40:00+08:00',
  },
  {
    id: 2,
    name: '产品需求资料库',
    description: '需求说明、评审记录与版本计划',
    visibility: 'team',
    documentCount: 12,
    createdAt: '2026-10-10T09:00:00+08:00',
    updatedAt: '2026-10-20T16:05:00+08:00',
  },
  {
    id: 3,
    name: '接口联调笔记',
    description: '前后端联调问题记录与接口约定',
    visibility: 'private',
    documentCount: 5,
    createdAt: '2026-10-12T14:30:00+08:00',
    updatedAt: '2026-10-16T11:10:00+08:00',
  },
]
let nextKnowledgeBaseId = 4

// 解析并校验新建 / 更新请求体: 返回 input 或可直接返回给前端的错误文案
function parseKnowledgeBaseInput(
  raw: string,
): { input: Omit<KnowledgeBase, 'id' | 'documentCount' | 'createdAt' | 'updatedAt'> } | { error: string } {
  let data: Partial<KnowledgeBase> = {}
  try {
    data = JSON.parse(raw || '{}') as Partial<KnowledgeBase>
  } catch {
    // 请求体不是合法 JSON: 按空表单处理, 走下面的"名称不能为空"分支
  }

  const name = (data.name ?? '').trim()
  if (!name) return { error: '知识库名称不能为空' }
  if (name.length > 40) return { error: '知识库名称不能超过 40 个字符' }

  const description = (data.description ?? '').trim()
  if (description.length > 200) return { error: '描述不能超过 200 个字符' }

  const visibility = data.visibility
  if (visibility !== 'private' && visibility !== 'team' && visibility !== 'public') {
    return { error: '可见性不合法' }
  }

  return { input: { name, description, visibility } }
}

// 名称查重: 更新时把"自己"排除在外, 否则不改名也会被判定为重复
function hasDuplicateKnowledgeBaseName(name: string, exceptId?: number): boolean {
  return knowledgeBases.some((item) => item.id !== exceptId && item.name === name)
}

// ── 会话列表演示: 数据结构 ─────────────────────────────────

interface ChatSession {
  id: number
  title: string
  messageCount: number
  updatedAt: string
}

// 预置会话: 最近更新的排在前面(每次重启 dev server 复位)
const chatSessions: ChatSession[] = [
  {
    id: 1,
    title: 'React 学习路线咨询',
    messageCount: 12,
    updatedAt: '2026-10-19T09:32:00+08:00',
  },
  {
    id: 2,
    title: '如何理解 useEffect 的依赖数组',
    messageCount: 8,
    updatedAt: '2026-10-18T21:05:00+08:00',
  },
  {
    id: 3,
    title: 'Ant Design 表单校验',
    messageCount: 6,
    updatedAt: '2026-10-16T15:20:00+08:00',
  },
]
let nextSessionId = 4
// 新建会话的标题序号: 新会话 1、新会话 2……
let nextSessionNo = 1

// ── 消息演示: 数据结构与预置对话 ───────────────────────────

interface ChatMessage {
  id: number
  sessionId: number
  // user: 用户提问; assistant: AI 回复(只有回复可以重新生成)
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

const chatMessages: ChatMessage[] = []
let nextMessageId = 1

// 按"一问一答"成对写入, 时间从 endAt 往前均匀排开(每 2 分钟一条),
// 让消息时间与左侧会话的 updatedAt 对得上
function seedMessages(
  sessionId: number,
  pairs: Array<[question: string, answer: string]>,
  endAt: string,
): void {
  const step = 2 * 60 * 1000
  const start = new Date(endAt).getTime() - (pairs.length * 2 - 1) * step
  pairs.forEach(([question, answer], index) => {
    chatMessages.push(
      {
        id: nextMessageId++,
        sessionId,
        role: 'user',
        content: question,
        createdAt: new Date(start + index * 2 * step).toISOString(),
      },
      {
        id: nextMessageId++,
        sessionId,
        role: 'assistant',
        content: answer,
        createdAt: new Date(start + (index * 2 + 1) * step).toISOString(),
      },
    )
  })
}

seedMessages(
  1,
  [
    [
      '我已经掌握了 JS 基础, 想系统学 React, 顺序应该怎么安排?',
      '可以按四步走: 先把组件、JSX、Props/State 用熟; 再集中练 Hooks; 然后做路由、请求、表单这类工程化能力; 最后补状态管理和性能优化。每步都配一个小项目, 比只看文档有效。',
    ],
    [
      'Hooks 里哪些是必须优先掌握的?',
      'useState 和 useEffect 是地基, 先把它们用顺; useRef 常用来存定时器或 DOM 引用; useMemo / useCallback 等到出现明显性能问题或需要稳定引用时再引入, 不要一上来就到处包。',
    ],
    [
      'useEffect 的依赖数组应该怎么理解?',
      '依赖数组是"副作用重新执行的条件": 数组里的值在两次渲染之间变了, effect 就再跑一次。空数组表示只在挂载后执行一次; 不写数组则每次渲染后都执行。',
    ],
    [
      '基础学完之后, 用什么项目练手比较好?',
      '推荐待办清单 → 聊天界面 → 知识库管理, 难度递进: 第一个练增删改查, 第二个练列表选中、消息操作和异步状态, 第三个练上传、轮询和接口分层。',
    ],
    [
      '现在就需要上状态管理库吗?',
      '不必。先用 props 和 Context 把组件通信走通; 当跨页面共享、频繁更新的状态变多, 再引入 Zustand 这类轻量方案, 概念负担更小。',
    ],
    [
      'TypeScript 要同步学吗?',
      '建议同步。先把接口、联合类型、泛型和工具类型用起来, 再配合组件 Props 做类型约束, 后期重构会省很多排查时间。',
    ],
  ],
  '2026-10-19T09:32:00+08:00',
)

seedMessages(
  2,
  [
    [
      'useEffect 的依赖数组到底决定什么?',
      '它决定 effect 什么时候"重新执行"。React 在每次渲染后比较依赖数组的每一项, 只要有变化, 就先执行上一次的清理函数, 再执行新的 effect。',
    ],
    [
      '空数组和完全不写有什么区别?',
      '空数组只在首次挂载后执行一次; 完全不写则每次渲染后都执行。开发时的 StrictMode 会把挂载流程跑两遍, 所以空数组的 effect 也会执行两次, 这是故意的检查。',
    ],
    [
      '把对象直接放进依赖数组会怎样?',
      '每次渲染都会创建新对象, 引用不同, effect 就会反复执行, 容易形成"请求 → setState → 再请求"的循环。解决思路是把需要的字段拆成基本类型, 或在创建处用 useMemo 稳定引用。',
    ],
    [
      '怎么快速判断依赖写多了还是写少了?',
      '用 ESLint 的 exhaustive-deps 规则做基线: 它提示缺少的依赖通常要补; 如果故意省略, 要能说清"省略后 effect 使用的仍是旧值"是否可以接受。',
    ],
  ],
  '2026-10-18T21:05:00+08:00',
)

seedMessages(
  3,
  [
    [
      'Ant Design 的 Form.Item rules 什么时候触发校验?',
      '默认在字段值变化和提交时触发; 也可以在 rules 里用 validateTrigger 指定, 或在 Form 上用 validateTrigger 统一设置。失去焦点触发可以用 onBlur。',
    ],
    [
      '怎么自定义一条校验规则?',
      '给 rules 传一个带 validator 的规则: 校验通过 resolve, 不通过 reject 一个 Error, 错误信息会显示在对应表单项下面。异步校验也一样, 注意处理好并发。',
    ],
    [
      '提交时校验失败, 怎么定位到具体字段?',
      'form.validateFields() 失败时会 reject 一个 errorInfo, 其中 errorFields 列出了每个出错字段的 name 和错误信息; 用 scrollToField(name) 还能滚动到对应位置并聚焦。',
    ],
  ],
  '2026-10-16T15:20:00+08:00',
)

// 重新生成: 内容里带上生成轮次, 方便肉眼确认消息确实被替换了
let regenerateRound = 0

function buildRegeneratedAnswer(question: string): string {
  regenerateRound += 1
  return (
    `这是第 ${regenerateRound} 次重新生成的回复。` +
    `关于「${question}」, 换一个角度概括: 先明确要解决的问题, ` +
    '再写出最小可用实现, 最后补齐边界情况与错误处理。' +
    '重新生成只替换当前这一条 AI 回复, 不会影响上下文中的其他消息。'
  )
}

// 发送提问后的演示回复: 用固定模板拼一段, 把用户的问题原样带回去
function buildReply(question: string): string {
  return (
    `收到你的提问:「${question}」。\n\n` +
    '这条回复是 mock-api.ts 按模板生成的, 没有接真实模型; ' +
    '真实项目里这里是模型接口, 想边生成边显示就配合 SSE 一块块推给前端。\n\n' +
    '当前示例落在输入侧的三件事: 多行输入(Shift+Enter 换行)、Enter 发送、输入关键字弹出联想。'
  )
}

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
          // 首次拉列表才开始"解析"预置文档: 前端轮询 2 次左右就能看到状态变为可用
          startSeedParseOnce()
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

        // 带引用来源的示例回答: 前端直接用 [n] 渲染可点击的引用编号
        if (method === 'GET' && path === '/knowledge/answer') {
          sendJson(res, 200, { code: 0, message: 'ok', data: sampleKnowledgeAnswer })
          return
        }

        // 文档正文: 打开来源时按段落返回, 前端按 paragraphId 滚动并高亮 quote
        if (method === 'GET' && /^\/knowledge\/documents\/\d+\/content$/.test(path)) {
          const id = Number(path.split('/')[3])
          const doc = knowledgeDocs.find((item) => item.id === id)
          const paragraphs = documentContents[id]
          if (!doc) {
            sendJson(res, 200, { code: 1, message: '文档不存在或已被删除', data: null })
            return
          }
          if (!paragraphs) {
            sendJson(res, 200, { code: 1, message: '这份文档还没有可预览的正文', data: null })
            return
          }
          sendJson(res, 200, {
            code: 0,
            message: 'ok',
            data: { documentId: id, name: doc.name, paragraphs },
          })
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

        // ── 知识库管理接口: 列表 / 详情 / 新建 / 更新 / 删除 ─────
        if (method === 'GET' && path === '/knowledge/bases') {
          sendJson(res, 200, { code: 0, message: 'ok', data: knowledgeBases })
          return
        }

        if (method === 'GET' && /^\/knowledge\/bases\/\d+$/.test(path)) {
          const id = Number(path.split('/')[3])
          const base = knowledgeBases.find((item) => item.id === id)
          if (!base) {
            sendJson(res, 200, { code: 1, message: '知识库不存在或已被删除', data: null })
            return
          }
          sendJson(res, 200, { code: 0, message: 'ok', data: base })
          return
        }

        if (method === 'POST' && path === '/knowledge/bases') {
          const parsed = parseKnowledgeBaseInput(await readRawBody(req))
          if ('error' in parsed) {
            sendJson(res, 200, { code: 1, message: parsed.error, data: null })
            return
          }
          if (hasDuplicateKnowledgeBaseName(parsed.input.name)) {
            sendJson(res, 200, { code: 1, message: '知识库名称已存在', data: null })
            return
          }

          const now = new Date().toISOString()
          const base: KnowledgeBase = {
            id: nextKnowledgeBaseId++,
            ...parsed.input,
            documentCount: 0,
            createdAt: now,
            updatedAt: now,
          }
          // 新建的排在最前面: 与真实产品"最近创建"的顺序一致
          knowledgeBases.unshift(base)
          sendJson(res, 200, { code: 0, message: 'ok', data: base })
          return
        }

        if (method === 'PATCH' && /^\/knowledge\/bases\/\d+$/.test(path)) {
          const id = Number(path.split('/')[3])
          const base = knowledgeBases.find((item) => item.id === id)
          if (!base) {
            sendJson(res, 200, { code: 1, message: '知识库不存在或已被删除', data: null })
            return
          }

          const parsed = parseKnowledgeBaseInput(await readRawBody(req))
          if ('error' in parsed) {
            sendJson(res, 200, { code: 1, message: parsed.error, data: null })
            return
          }
          if (hasDuplicateKnowledgeBaseName(parsed.input.name, id)) {
            sendJson(res, 200, { code: 1, message: '知识库名称已存在', data: null })
            return
          }

          // 只覆盖用户可编辑的字段, 文档数与创建时间保持不变
          Object.assign(base, parsed.input)
          base.updatedAt = new Date().toISOString()
          sendJson(res, 200, { code: 0, message: 'ok', data: base })
          return
        }

        if (method === 'DELETE' && /^\/knowledge\/bases\/\d+$/.test(path)) {
          const id = Number(path.split('/')[3])
          const index = knowledgeBases.findIndex((item) => item.id === id)
          if (index === -1) {
            sendJson(res, 200, { code: 1, message: '知识库不存在或已被删除', data: null })
            return
          }
          knowledgeBases.splice(index, 1)
          sendJson(res, 200, { code: 0, message: 'ok', data: null })
          return
        }

        // ── 会话列表接口: 查询 / 新建 / 重命名 / 删除 ────────────
        if (method === 'GET' && path === '/chat/sessions') {
          sendJson(res, 200, { code: 0, message: 'ok', data: chatSessions })
          return
        }

        if (method === 'POST' && path === '/chat/sessions') {
          const session: ChatSession = {
            id: nextSessionId++,
            title: `新会话 ${nextSessionNo++}`,
            messageCount: 0,
            updatedAt: new Date().toISOString(),
          }
          // 新会话排在最前面: 与真实产品"最近会话"的顺序一致
          chatSessions.unshift(session)
          sendJson(res, 200, { code: 0, message: 'ok', data: session })
          return
        }

        if (method === 'PATCH' && path.startsWith('/chat/sessions/')) {
          const id = Number(path.slice('/chat/sessions/'.length))
          const session = chatSessions.find((item) => item.id === id)
          if (!session) {
            sendJson(res, 200, { code: 1, message: '会话不存在或已被删除', data: null })
            return
          }

          const raw = await readRawBody(req)
          let title = ''
          try {
            title = ((JSON.parse(raw || '{}') as { title?: string }).title ?? '').trim()
          } catch {
            // 请求体不是合法 JSON 时按"标题为空"处理
          }
          if (!title) {
            sendJson(res, 200, { code: 1, message: '会话标题不能为空', data: null })
            return
          }

          session.title = title
          session.updatedAt = new Date().toISOString()
          sendJson(res, 200, { code: 0, message: 'ok', data: session })
          return
        }

        if (method === 'DELETE' && path.startsWith('/chat/sessions/')) {
          const id = Number(path.slice('/chat/sessions/'.length))
          const index = chatSessions.findIndex((item) => item.id === id)
          if (index === -1) {
            sendJson(res, 200, { code: 1, message: '会话不存在或已被删除', data: null })
            return
          }
          chatSessions.splice(index, 1)
          sendJson(res, 200, { code: 0, message: 'ok', data: null })
          return
        }

        // ── 消息接口: 查询 / 重新生成 / 删除 ───────────────────
        if (method === 'GET' && /^\/chat\/sessions\/\d+\/messages$/.test(path)) {
          const sessionId = Number(path.split('/')[3])
          if (!chatSessions.some((session) => session.id === sessionId)) {
            sendJson(res, 200, { code: 1, message: '会话不存在或已被删除', data: null })
            return
          }
          const list = chatMessages
            .filter((item) => item.sessionId === sessionId)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          sendJson(res, 200, { code: 0, message: 'ok', data: list })
          return
        }

        if (method === 'POST' && /^\/chat\/sessions\/\d+\/messages$/.test(path)) {
          const sessionId = Number(path.split('/')[3])
          const session = chatSessions.find((item) => item.id === sessionId)
          if (!session) {
            sendJson(res, 200, { code: 1, message: '会话不存在或已被删除', data: null })
            return
          }

          const raw = await readRawBody(req)
          let content = ''
          try {
            content = ((JSON.parse(raw || '{}') as { content?: string }).content ?? '').trim()
          } catch {
            // 请求体不是合法 JSON 时按"内容为空"处理
          }
          if (!content) {
            sendJson(res, 200, { code: 1, message: '消息内容不能为空', data: null })
            return
          }

          // 多等一会儿再回: 前端能看清楚"发送中"的状态
          await delay(700)
          if (res.destroyed) return

          const now = Date.now()
          const userMessage: ChatMessage = {
            id: nextMessageId++,
            sessionId,
            role: 'user',
            content,
            createdAt: new Date(now).toISOString(),
          }
          const assistantMessage: ChatMessage = {
            id: nextMessageId++,
            sessionId,
            role: 'assistant',
            content: buildReply(content),
            createdAt: new Date(now + 1000).toISOString(),
          }
          chatMessages.push(userMessage, assistantMessage)
          // 会话列表的条数与更新时间同步推进, 与消息区保持一致
          session.messageCount += 2
          session.updatedAt = assistantMessage.createdAt
          sendJson(res, 200, { code: 0, message: 'ok', data: [userMessage, assistantMessage] })
          return
        }

        if (method === 'POST' && /^\/chat\/messages\/\d+\/regenerate$/.test(path)) {
          const id = Number(path.split('/')[3])
          const message = chatMessages.find((item) => item.id === id)
          if (!message) {
            sendJson(res, 200, { code: 1, message: '消息不存在或已被删除', data: null })
            return
          }
          if (message.role !== 'assistant') {
            // 重新生成只对 AI 回复开放: 用户提问没有"再生成一次"的语义
            sendJson(res, 200, { code: 1, message: '只能重新生成 AI 回复', data: null })
            return
          }

          // 往上找最近的一条用户提问作为上下文
          const index = chatMessages.indexOf(message)
          const question = chatMessages
            .slice(0, index)
            .reverse()
            .find((item) => item.sessionId === message.sessionId && item.role === 'user')?.content

          // 在全局延迟之外再等一会儿: 模拟重新生成比普通查询更耗时
          await delay(800)
          if (res.destroyed) return

          message.content = buildRegeneratedAnswer(question ?? '这个问题')
          sendJson(res, 200, { code: 0, message: 'ok', data: message })
          return
        }

        if (method === 'DELETE' && /^\/chat\/messages\/\d+$/.test(path)) {
          const id = Number(path.split('/')[3])
          const index = chatMessages.findIndex((item) => item.id === id)
          if (index === -1) {
            sendJson(res, 200, { code: 1, message: '消息不存在或已被删除', data: null })
            return
          }
          const [removed] = chatMessages.splice(index, 1)
          // 会话列表里的消息数同步减一
          const session = chatSessions.find((item) => item.id === removed.sessionId)
          if (session && session.messageCount > 0) session.messageCount -= 1
          sendJson(res, 200, { code: 0, message: 'ok', data: null })
          return
        }

        sendJson(res, 404, { code: 404, message: `接口不存在: ${method} ${path}`, data: null })
      })
    },
  }
}
