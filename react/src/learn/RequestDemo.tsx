import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Empty,
  Input,
  List,
  Space,
  Table,
  Tag,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { api, request, subscribeInterceptorLog, TOKEN_KEY } from '../api/request'
import type { InterceptorLog } from '../api/request'
import { createTodo, fetchProfile, fetchTodos } from '../api/todo'
import type { Profile, TodoItem } from '../api/todo'

// ── Axios 封装与请求/响应拦截器 ─────────────────────────────
// 封装代码: src/api/request.ts(实例 + 两个拦截器) / src/api/todo.ts(业务接口)
// mock 后端: 根目录 mock-api.ts(Vite 插件, 仅 dev 环境)
//
// 本页每个按钮都会发出一次真实请求, 拦截器的执行过程通过底部日志面板实时展示;
// 页面里的 catch 都只做"局部状态收尾", 错误提示全部由响应拦截器统一负责;
// 第 4 节额外演示请求取消: AbortController + config.signal(慢接口见 mock-api.ts)

const todoColumns: TableColumnsType<TodoItem> = [
  { title: 'ID', dataIndex: 'id', width: 64 },
  { title: '标题', dataIndex: 'title' },
  {
    title: '状态',
    dataIndex: 'done',
    width: 100,
    render: (done: boolean) => (done ? <Tag color="success">已完成</Tag> : <Tag>进行中</Tag>),
  },
]

// ── 1. 正常请求: GET 列表 + POST 新增 ───────────────────────

function TodoSection() {
  const { message } = AntdApp.useApp()
  const [todos, setTodos] = useState<TodoItem[]>([])
  // loading 初值为 true: 组件挂载后马上要发请求, 首屏就展示加载态
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')

  // 只负责请求与落地数据; loading 的开关放在触发事件里(避免在 effect 内同步 setState)
  const load = async () => {
    try {
      // fetchTodos 内部走 request<T>(): 拦截器检查并解包后, 拿到的直接是数组
      setTodos(await fetchTodos())
    } catch {
      // 提示已经由响应拦截器统一弹出, 这里只负责收尾页面局部状态
    } finally {
      setLoading(false)
    }
  }

  const reload = () => {
    setLoading(true)
    void load()
  }

  const add = async (text: string) => {
    setLoading(true)
    try {
      const created = await createTodo(text)
      message.success(`新增成功: ${created.title}`)
      setTitle('')
      await load()
    } catch {
      // 空标题会命中后端的"业务失败"(HTTP 200 但 code !== 0), 同样在这里兜底
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 空依赖数组: 只在挂载后加载一次(StrictMode 下会发两次, 日志面板里能看到)
    void load()
  }, [])

  return (
    <Card size="small" title="GET /api/todos 与 POST /api/todos">
      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="新待办标题" />
        <Button type="primary" onClick={() => add(title.trim())}>
          新增
        </Button>
      </Space.Compact>

      <Table<TodoItem>
        columns={todoColumns}
        dataSource={todos}
        rowKey="id"
        size="small"
        pagination={false}
        loading={loading}
      />

      <Space wrap style={{ marginTop: 12 }}>
        <Button onClick={reload}>重新加载</Button>
        <Button danger onClick={() => add('')}>
          提交空标题(触发业务失败)
        </Button>
      </Space>
    </Card>
  )
}

// ── 2. 登录态与错误: 401 / 500 的统一处理 ───────────────────

function AuthSection() {
  const { message } = AntdApp.useApp()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hasToken, setHasToken] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))
  const [loading, setLoading] = useState(false)

  const login = () => {
    // 真实项目里 token 来自登录接口, 这里直接写一条模拟凭证:
    // 之后所有请求都会被请求拦截器自动带上 Authorization 头
    localStorage.setItem(TOKEN_KEY, 'demo-token-123')
    setHasToken(true)
    message.success('已模拟登录: 之后所有请求会自动携带 Authorization 头')
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setHasToken(false)
    setProfile(null)
    message.info('已退出登录: token 已清除')
  }

  const loadProfile = async () => {
    setLoading(true)
    try {
      setProfile(await fetchProfile())
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
      // 401 时响应拦截器会清掉失效 token, 这里同步按钮上的登录态显示
      setHasToken(Boolean(localStorage.getItem(TOKEN_KEY)))
    }
  }

  const probeServerError = async () => {
    setLoading(true)
    try {
      // 临时的单次请求可以直接用 api.get, 不用在 todo.ts 里为它建文件
      await api.get<null>('/server-error')
    } catch {
      // 500 的提示已由响应拦截器统一处理
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card size="small" title="登录态与错误处理">
      <Space wrap>
        <Button type="primary" onClick={login} disabled={hasToken}>
          模拟登录
        </Button>
        <Button onClick={logout} disabled={!hasToken}>
          退出登录
        </Button>
        <Button onClick={loadProfile} loading={loading}>
          获取个人信息(需要登录)
        </Button>
        <Button danger onClick={probeServerError}>
          触发 500 错误
        </Button>
      </Space>

      <p style={{ marginTop: 12 }}>
        当前登录态: {hasToken ? '已登录(token 在 localStorage 里)' : '未登录(请求不会带 token)'}
      </p>

      {profile ? (
        <>
          <p>
            加载成功: {profile.username} ({profile.role})
          </p>
          <p>后端收到的请求头: {profile.auth} —— 由请求拦截器自动注入</p>
        </>
      ) : (
        <p>先点「退出登录」, 再点「获取个人信息」: token 缺失会命中 401, 观察拦截器的处理</p>
      )}
    </Card>
  )
}

// ── 4. 请求取消机制: AbortController + config.signal ────────
// 取消的三个典型场景:
//   ① 用户等不及了: 慢请求点击"取消"立刻中止(本节可演示)
//   ② 连续触发防竞态: 新请求发出前先 abort 旧的, 只认最后一次的结果
//      (连点"发起慢请求"即可看到: 旧请求被取消, 过期结果被丢弃)
//   ③ 组件卸载: useEffect 清理函数里 abort, 避免请求回来时对已卸载组件 setState
// 取消不是故障: axios 抛 CanceledError(code=ERR_CANCELED), 响应拦截器对它
// 静默处理(只记日志, 不弹错误提示); 组件里用 axios.isCancel 区分"取消"与"真失败"

type SlowPhase = 'idle' | 'pending' | 'success' | 'canceled'

interface SlowResult {
  text: string
  servedAt: string
}

const phaseText: Record<SlowPhase, string> = {
  idle: '未发起',
  pending: '等待中…',
  success: '已完成',
  canceled: '已取消',
}

const phaseColor: Record<SlowPhase, string> = {
  idle: 'default',
  pending: 'processing',
  success: 'success',
  canceled: 'warning',
}

function CancelSection() {
  const [phase, setPhase] = useState<SlowPhase>('idle')
  const [result, setResult] = useState('')
  const ctrlRef = useRef<AbortController | null>(null)

  const start = async () => {
    // 场景②: 仍有请求在途时先取消它 —— 连点多次只有最后一次的结果算数
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl

    setPhase('pending')
    setResult('正在等待慢接口返回(约 5 秒)…')

    try {
      // signal 是 axios config 的原生字段, 无需额外封装即可取消
      const data = await request<SlowResult>({ url: '/slow', method: 'GET', signal: ctrl.signal })
      // 结果回来时若已被更新一轮的点击取代, 丢弃过期结果(这就是防竞态)
      if (ctrlRef.current !== ctrl) return
      setPhase('success')
      setResult(`${data.text}(服务端于 ${data.servedAt} 完成)`)
    } catch (error) {
      // 被新请求取代的旧请求: 收尾交给新一轮, 自己不碰任何状态
      if (ctrlRef.current !== ctrl) return
      if (axios.isCancel(error)) {
        setPhase('canceled')
        setResult('请求已取消: axios 抛出 CanceledError, 拦截器静默处理, 不会弹全局提示')
      } else {
        // 真失败: 提示已由响应拦截器统一弹出, 这里只复位局部状态
        setPhase('idle')
        setResult('')
      }
    } finally {
      // 只清"自己"的引用; 若已被新请求取代, 不能把新一轮的引用清掉
      if (ctrlRef.current === ctrl) ctrlRef.current = null
    }
  }

  const cancel = () => {
    ctrlRef.current?.abort()
  }

  return (
    <Card size="small" title="请求取消: AbortController + config.signal">
      <Space wrap>
        <Button type="primary" onClick={() => void start()} loading={phase === 'pending'}>
          发起慢请求(GET /api/slow, 约 5 秒)
        </Button>
        <Button danger onClick={cancel} disabled={phase !== 'pending'}>
          取消当前请求
        </Button>
        <Tag color={phaseColor[phase]}>{phaseText[phase]}</Tag>
      </Space>

      <p style={{ marginTop: 12 }}>
        {result || '点击「发起慢请求」后再点「取消当前请求」: 请求会立刻中止, 且不会弹错误提示'}
      </p>
      <p style={{ opacity: 0.8 }}>
        连点「发起慢请求」是另一个场景: 每次点击先取消上一次未完成的请求, 只保留最新一次的结果;
        组件卸载时在 useEffect 清理函数里调用 ctrl.abort() 是同样的套路, 可避免对已卸载
        组件 setState
      </p>
    </Card>
  )
}

// ── 5. 拦截器日志面板 ───────────────────────────────────────

const stageColor: Record<InterceptorLog['stage'], string> = {
  请求拦截器: 'blue',
  响应拦截器: 'green',
  失败处理: 'red',
}

function InterceptorLogPanel() {
  const [logs, setLogs] = useState<InterceptorLog[]>([])

  useEffect(() => {
    // 订阅拦截器日志; 返回的取消订阅函数由 React 在卸载时调用
    return subscribeInterceptorLog((log) => {
      // 只保留最近 8 条, 防止日志越滚越长
      setLogs((prev) => [...prev.slice(-7), log])
    })
  }, [])

  return (
    <Card size="small" title="拦截器日志(实时)">
      {logs.length === 0 ? (
        <Empty description="还没有日志: 点击上面的任意按钮发一次请求" />
      ) : (
        <List
          size="small"
          dataSource={logs}
          renderItem={(item) => (
            <List.Item>
              <Space>
                <Tag color={stageColor[item.stage]}>{item.stage}</Tag>
                <span className="learn-log-text">{item.text}</span>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}

// ── 页面装配 ────────────────────────────────────────────────

function RequestDemo() {
  return (
    <div className="learn-demo">
      <h3>1. 封装结构: 一个实例 + 两个拦截器</h3>
      <Alert
        type="info"
        showIcon
        message="src/api/request.ts"
        description={
          <>
            <p>① axios.create 创建实例: baseURL '/api'、超时 10s 等公共配置只写一次</p>
            <p>② 请求拦截器: 自动从 localStorage 取 token 注入 Authorization 头</p>
            <p>③ 响应拦截器: code !== 0 或 HTTP 4xx/5xx 时统一弹出错误提示</p>
            <p>④ 请求取消: config 传 signal(AbortController), 取消错误静默处理不误报</p>
            <p>业务侧调用 request&lt;T&gt;() / api.get / api.post, 拿到的就是解包后的 data</p>
          </>
        }
      />

      <h3>2. 正常请求: 加载列表与新增(含业务失败)</h3>
      <TodoSection />

      <h3>3. 登录态与错误: 401 / 500 的统一处理</h3>
      <AuthSection />

      <h3>4. 请求取消: AbortController + config.signal</h3>
      <CancelSection />

      <h3>5. 拦截器日志: 观察每次请求的完整链路</h3>
      <InterceptorLogPanel />
    </div>
  )
}

export default RequestDemo
