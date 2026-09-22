import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { useUserStore } from '../store/userStore'

// ── Zustand: 轻量全局状态管理 ────────────────────────────────
// 需要"跨组件共享、且会频繁更新"的状态时, useState 要层层传 props,
// Context 会让所有消费者跟着一起重渲染, 都不够顺手。
// Zustand 的方案(依赖: npm install zustand, 本项目已装):
//   1. 在组件外(模块顶层)创建 store, 全应用共享同一份状态, 不需要任何 Provider 包裹
//   2. 组件通过 hook 订阅, 并且用选择器(selector)精确到"字段"级别:
//      没用到的字段变化, 组件不会重渲染
// 全局用户状态的真实组织方式见 src/store/userStore.ts(第 3 节使用)

// ── 1. 定义 store: state + action ───────────────────────────

// create<T>()((set) => ({ ... })) 接收的函数返回一个对象:
//   普通字段 = 数据(state), 函数字段 = 改数据的方法(action)
//   set 用来更新状态: set({ count: 1 }) 或函数式 set((state) => ({ count: state.count + 1 }))
// 泛型后面多出的一对括号, 是配合中间件时的类型推断写法, 照着写即可

interface LearnState {
  count: number
  nickname: string
  inc: () => void
  dec: () => void
  reset: () => void
  setNickname: (nickname: string) => void
}

const nicknames = ['小明', '小红', '小刚', '小美']

// store 定义在模块顶层: 不管多少个组件 import 它, 拿到的都是同一份状态
const useLearnStore = create<LearnState>()((set) => ({
  count: 0,
  nickname: nicknames[0],
  inc: () => set((state) => ({ count: state.count + 1 })),
  dec: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
  setNickname: (nickname) => set({ nickname }),
}))

function BasicDemo() {
  // 订阅: useLearnStore(选择器), 选择器返回什么, 组件就订阅什么
  const count = useLearnStore((s) => s.count)
  // action 的引用是固定的, 订阅它永远不会引起额外渲染
  const inc = useLearnStore((s) => s.inc)
  const dec = useLearnStore((s) => s.dec)
  const reset = useLearnStore((s) => s.reset)

  return (
    <div className="learn-card">
      <div className="learn-row">
        <span className="learn-tag">count = {count}</span>
        <button type="button" className="learn-btn" onClick={inc}>
          +1
        </button>
        <button type="button" className="learn-btn" onClick={dec}>
          -1
        </button>
        <button type="button" className="learn-btn" onClick={reset}>
          重置
        </button>
      </div>
      <p>
        数字和按钮读写的是同一份 store: 点按钮调用 action, action 里的 set 更新状态,
        所有订阅 count 的组件自动重新渲染 —— 全程没有任何 props 传递
      </p>
    </div>
  )
}

// ── 2. 选择器(selector): 只订阅用得到的字段 ─────────────────

// 教学观察用: 每次提交后把"已渲染 N 次"写进徽标 DOM。
// 为什么不把次数放进 state: 显示计数本身会再触发一轮渲染, 干扰观察;
// 直接写这块 DOM 不会触发 React 渲染(提交后操作 DOM 正是 effect 的用途之一)。
// 初值会显示 2: StrictMode 开发模式挂载时 effect 会跑两遍, 看增量即可
function useRenderBadge() {
  const badgeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const badge = badgeRef.current
    if (!badge) return
    const times = Number(badge.dataset.renders ?? 0) + 1
    badge.dataset.renders = String(times)
    badge.textContent = `已渲染 ${times} 次`
  })

  return badgeRef
}

// 只订阅 count: 之后改昵称, 这个组件的渲染次数不会增加
function CountOnlyCard() {
  const count = useLearnStore((s) => s.count)
  const badgeRef = useRenderBadge()

  return (
    <div className="learn-card" style={{ flex: 1 }}>
      <h4>只订阅 count</h4>
      <p>count = {count}</p>
      <span className="learn-tag" ref={badgeRef} />
    </div>
  )
}

// 整店订阅(不带选择器): 任何字段变化都会重渲染, 不推荐
function WholeStoreCard() {
  const state = useLearnStore()
  const badgeRef = useRenderBadge()

  return (
    <div className="learn-card" style={{ flex: 1 }}>
      <h4>整店订阅(不推荐)</h4>
      <p>
        count = {state.count}, nickname = {state.nickname}
      </p>
      <span className="learn-tag" ref={badgeRef} />
    </div>
  )
}

function SelectorDemo() {
  // 这里刻意没有订阅 nickname: 父组件不因昵称变化而重渲染,
  // 上面两个卡片的重渲染才纯粹由各自的订阅决定, 便于对比
  const inc = useLearnStore((s) => s.inc)

  const changeNickname = () => {
    // 事件回调里用 getState() 取最新值, 这和"订阅"是两回事(见第 4 节)
    const { nickname, setNickname } = useLearnStore.getState()
    setNickname(nicknames[(nicknames.indexOf(nickname) + 1) % nicknames.length])
  }

  return (
    <>
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={inc}>
          count +1
        </button>
        <button type="button" className="learn-btn" onClick={changeNickname}>
          换一个昵称
        </button>
      </div>
      <div className="learn-row">
        <CountOnlyCard />
        <WholeStoreCard />
      </div>
      <p>
        连点"换一个昵称": 整店订阅的卡片次数一直涨, "只订阅 count"的卡片纹丝不动;
        再点"count +1": 两张卡片都变。选择器把"字段"作为订阅粒度, 无关更新不会拖着重渲染
      </p>
      <p>
        另一个坑: 选择器要返回"单个值"或 store 里现成的引用, 写成{' '}
        <code>{'(s) => ({ count: s.count })'}</code> 每次都产生新对象, 会被当成"一直在变"
      </p>
    </>
  )
}

// ── 3. 全局用户状态: 跨组件共享登录态 ───────────────────────
// store 定义在 src/store/userStore.ts, 下面两个组件都直接从它取数:
// 模拟的站内顶栏(常驻)与登录面板(操作区)之间没有任何父子关系

function MockHeader() {
  const user = useUserStore((s) => s.user)

  return (
    <div className="learn-mock-header">
      <span>React 学习站(模拟顶栏)</span>
      {user ? (
        <span className="learn-row">
          <span className="learn-avatar">{user.name.slice(0, 1)}</span>
          <span>
            {user.name} · {user.role}
          </span>
        </span>
      ) : (
        <span>未登录</span>
      )}
    </div>
  )
}

function LoginPanel() {
  const user = useUserStore((s) => s.user)
  const token = useUserStore((s) => s.token)
  const logging = useUserStore((s) => s.logging)
  const login = useUserStore((s) => s.login)
  const logout = useUserStore((s) => s.logout)
  const rename = useUserStore((s) => s.rename)

  // 输入框内容只是"待提交的草稿", 是登录面板自己的事, 用普通 useState 即可
  const [name, setName] = useState('小明')

  return (
    <div className="learn-card">
      <h4>登录面板(模拟 600ms 的登录请求)</h4>
      {user ? (
        <>
          <p className="learn-log-text">token: {token}</p>
          <div className="learn-row">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="新的显示名" />
            <button
              type="button"
              className="learn-btn"
              onClick={() => rename(name.trim() || user.name)}
            >
              改名(函数式 set)
            </button>
            <button type="button" className="learn-btn" onClick={logout}>
              退出登录
            </button>
          </div>
        </>
      ) : (
        <div className="learn-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="输入用户名" />
          <button
            type="button"
            className="learn-btn"
            onClick={() => void login(name.trim() || '匿名同学')}
            disabled={logging}
          >
            {logging ? '登录中…' : '登录'}
          </button>
        </div>
      )}
      <p>
        登录动作是异步的: 先置 logging 为 true(按钮变成"登录中…"), 600ms 后写入 user 与
        token; 此刻顶栏的头像同步出现 —— 两个组件之间没有传过任何 props
      </p>
    </div>
  )
}

function GlobalUserDemo() {
  return (
    <>
      <MockHeader />
      <LoginPanel />
      <div className="learn-card">
        <p>
          登录成功后刷新页面, 登录态不会丢: userStore 用 persist 中间件把 user 与 token
          存进了 localStorage, 页面加载时自动恢复
        </p>
        <p>
          顶栏与登录面板互不相关, 也没有共同的父组件传 props —— 任何页面、任何层级的组件
          import 同一个 hook, 就能共享这份"全局"状态
        </p>
      </div>
    </>
  )
}

// ── 4. 在组件外读写 store: getState ─────────────────────────

// 普通函数(不是组件、不是 Hook)照样能读写 store; 典型场景: axios 拦截器里取 token
function describeLogin(): string {
  // getState(): 读取"此刻"的快照, 不订阅、也不会触发渲染
  const { user, token } = useUserStore.getState()
  if (!user) return '未登录(user = null)'
  return `已登录: ${user.name}, token 前 12 位: ${token?.slice(0, 12)}`
}

function OutsideUsageDemo() {
  const [logs, setLogs] = useState<{ id: number; text: string }[]>([])
  const nextId = useRef(0)

  const readOnce = () => {
    nextId.current += 1
    setLogs((prev) => [...prev.slice(-4), { id: nextId.current, text: describeLogin() }])
  }

  return (
    <div className="learn-card">
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={readOnce}>
          在普通函数里 getState() 读一次
        </button>
      </div>
      {logs.map((log) => (
        <p key={log.id} className="learn-log-text">
          {log.text}
        </p>
      ))}
      <p>
        点按钮只取"这一瞬间"的快照, 之后 store 再变也不会补一条 —— 想持续接收变化:
        组件内用 hook 订阅, 组件外用 useUserStore.subscribe(监听器) 注册回调
      </p>
    </div>
  )
}

// ── 5. 页面装配 ─────────────────────────────────────────────

function ZustandDemo() {
  return (
    <div className="learn-demo">
      <h3>1. 定义 store: state + action</h3>
      <BasicDemo />

      <h3>2. 选择器(selector): 只订阅用得到的字段</h3>
      <SelectorDemo />

      <h3>3. 全局用户状态: 跨组件共享登录态</h3>
      <GlobalUserDemo />

      <h3>4. 在组件外读写: getState / subscribe</h3>
      <OutsideUsageDemo />

      <h3>5. 小结: 什么时候该用状态管理库</h3>
      <div className="learn-card">
        <p>适合放进 store: 多组件共享、生命周期长的状态(登录态、主题、购物车、全局配置)</p>
        <p>留在 useState: 单个组件自己的表单草稿、开关等; 别把 store 当成随意创建的"全局变量"</p>
        <p>
          和 Context 的分工: Context 适合"提供后极少变化"的数据(如静态配置); 频繁更新、消费者
          多时, Zustand 的选择器订阅能让无关组件免于重渲染, 也免去层层包 Provider
        </p>
        <p>
          常用中间件都在 zustand/middleware: persist(持久化到 localStorage)、devtools(接入
          浏览器调试面板, 需安装 Redux DevTools 扩展), userStore 用它们包裹很常见
        </p>
      </div>
    </div>
  )
}

export default ZustandDemo
