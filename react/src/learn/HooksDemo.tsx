import { useEffect, useRef, useState } from 'react'

// ── 核心 Hooks 用法 ─────────────────────────────────────────
// Hook = 以 use 开头的函数,只能在函数组件(或自定义 Hook)的顶层调用
//
// 本项目 main.tsx 开启了 <StrictMode>: 开发模式下组件会多渲染一次,
// effect 在挂载时会"执行 → 清理 → 再执行"跑两遍(用来提前暴露问题),
// 生产构建只执行一次。控制台里看到 log 打两次是正常现象。

// ── 1. useState ─────────────────────────────────────────────

// 1.1 定义与更新: useState(初始值) 返回 [当前值, 更新函数],调用更新函数触发重新渲染
function BasicCounter() {
  const [count, setCount] = useState(0)

  return (
    <div className="learn-card">
      <p>count 当前值: {count}</p>
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={() => setCount(count + 1)}>
          setCount(count + 1)
        </button>
        <button type="button" className="learn-btn" onClick={() => setCount(0)}>
          重置
        </button>
      </div>
    </div>
  )
}

// 1.2 为什么不能直接修改 state:
// React 用 Object.is 比较新旧值来判断"变没变"。直接 push / 改属性时引用没变,
// 会被判定为没变化而跳过渲染; 更糟的是数据已被偷偷改掉,会在之后的某次渲染里突然冒出来。
function MutationDemo() {
  const [todos, setTodos] = useState(['第一天: 学习 state'])

  // 错误示范: 直接改原数组再塞回 set 函数
  const mutateDirectly = () => {
    todos.push(`偷偷 push 的第 ${todos.length + 1} 项`)
    setTodos(todos)
  }

  // 正确示范: 先复制出新数组,再基于新数组修改
  const updateByCopy = () => {
    setTodos([...todos, `正常新增的第 ${todos.length + 1} 项`])
  }

  return (
    <div className="learn-card">
      <p>
        待办(共 {todos.length} 项): {todos.join('、')}
      </p>
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={mutateDirectly}>
          错误示范: 直接 push
        </button>
        <button type="button" className="learn-btn" onClick={updateByCopy}>
          正确示范: 展开复制
        </button>
      </div>
      <p>
        先点"错误示范"界面纹丝不动;再点"正确示范",被偷改的项会一起冒出来。数组用 [...arr]
        、对象用 {'{ ...obj }'},永远传入"新的引用"
      </p>
    </div>
  )
}

// 1.3 更新函数的两种传参方式:
//   setCount(新值)        —— 不依赖旧值,或直接用本次渲染闭包里的值时
//   setCount(c => c + 1)  —— 新值依赖旧值时(如连续多次更新),React 会把最新值交给每个 updater
function UpdaterDemo() {
  const [count, setCount] = useState(0)

  // 三次都"直接传值": count 是本次渲染读到的同一个旧值,三次计算互相覆盖,最终只 +1
  const addThreeDirect = () => {
    setCount(count + 1)
    setCount(count + 1)
    setCount(count + 1)
  }

  // 三次都传 updater 函数: 按顺序拿到最新值,正确 +3
  const addThreeFunctional = () => {
    setCount((c) => c + 1)
    setCount((c) => c + 1)
    setCount((c) => c + 1)
  }

  return (
    <div className="learn-card">
      <p>count 当前值: {count}</p>
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={addThreeDirect}>
          直接传值调用 3 次(只 +1)
        </button>
        <button type="button" className="learn-btn" onClick={addThreeFunctional}>
          函数式调用 3 次(+3)
        </button>
        <button type="button" className="learn-btn" onClick={() => setCount(0)}>
          重置
        </button>
      </div>
    </div>
  )
}

// ── 2. useEffect ────────────────────────────────────────────
// 渲染只负责"算 UI";与外部世界打交道的事(订阅、请求、操作 DOM)叫副作用,放进 useEffect

// 2.1 依赖数组的三种写法: 打开控制台(F12)对比输出
function DependencyDemo() {
  const [count, setCount] = useState(0)
  const [keyword, setKeyword] = useState('')

  // ① 不写依赖数组: 每次渲染后都执行,最容易写出死循环,大部分场景不该这么用
  useEffect(() => {
    console.log('[① 无依赖数组] 每次渲染后执行')
  })

  // ② 空数组 []: 只在组件挂载后执行一次,适合初始化请求、一次性订阅
  useEffect(() => {
    console.log('[② 空数组] 只在挂载后执行一次')
  }, [])

  // ③ 带依赖 [count]: 挂载后执行一次,之后每次 count 变化都再执行; keyword 变化则不会
  useEffect(() => {
    console.log('[③ [count]] count 变化了,当前值 =', count)
  }, [count])

  // 操作 DOM / 浏览器 API 也是典型副作用: 把输入关键字同步到标签页标题
  useEffect(() => {
    document.title = keyword ? `正在搜索: ${keyword}` : 'React 核心用法'
    return () => {
      document.title = 'React 核心用法' // 离开时恢复标题
    }
  }, [keyword])

  return (
    <div className="learn-card">
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={() => setCount((c) => c + 1)}>
          count +1 (当前 {count})
        </button>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="输入关键字,看标签页标题和控制台"
        />
      </div>
      <p>
        点按钮或打字都会触发渲染: ① 每次打印;③ 只有 count 变化才打印,打字不会触发它
      </p>
    </div>
  )
}

// 2.2 清理函数: return 的函数会在"组件卸载"和"依赖变化、effect 重跑之前"执行
function CleanupDemo() {
  const [width, setWidth] = useState(window.innerWidth)
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)

  // 订阅窗口大小: 清理函数负责退订,避免监听器越挂越多
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 秒表: running 变化时,先执行清理函数清掉旧定时器,再决定是否启动新的
  useEffect(() => {
    if (!running) return
    const timerId = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timerId)
  }, [running])

  return (
    <div className="learn-card">
      <p>当前窗口宽度: {width}px(拖动浏览器窗口试试,监听器只注册了一次)</p>
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={() => setRunning(!running)}>
          {running ? '暂停秒表' : '启动秒表'}
        </button>
        <button type="button" className="learn-btn" onClick={() => setSeconds(0)}>
          归零
        </button>
        <span className="learn-tag">已计时 {seconds} 秒</span>
      </div>
      <p>反复启停不会叠加出多个定时器,靠的就是每次重跑前先执行 return 的清理函数</p>
    </div>
  )
}

// 2.3 模拟请求: 订阅 / 请求这类异步副作用,都要考虑"结果回来时组件可能已经不需要它了"
function FetchDemo() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false // 标记: 本次 effect 是否已失效

    // 注意这里没有同步调用 setLoading(true): loading 的初始值本来就是 true,
    // 能靠初始值表达的状态就不要放进 effect 里 setState,否则会多触发一次渲染
    const timerId = setTimeout(() => {
      if (cancelled) return // 过期结果直接丢掉,不再 setState
      setUsers(['小明', '小红', '小刚'])
      setLoading(false)
    }, 800)

    return () => {
      cancelled = true
      clearTimeout(timerId)
    }
  }, [])

  return (
    <div className="learn-card">
      {loading ? <p>加载中…(800ms 模拟网络请求)</p> : <p>请求结果: {users.join('、')}</p>}
      <p>
        StrictMode 下你会看到 effect 跑了两次: 第一次的定时器被清理函数取消,最终只生效一次,
        这正是清理函数的价值
      </p>
    </div>
  )
}

// 2.4 避免无限循环: 死循环的公式是"effect 里更新了依赖数组中的 state"
function ChainReactionDemo() {
  const [value, setValue] = useState(0)

  // 真实项目里下面这种写法就是死循环(浏览器直接卡死):
  //   useEffect(() => { setValue(value + 1) }, [value])
  // 这里加了 value >= 3 的"刹车"让你安全观察: 依赖变化 → effect 执行 → 更新依赖 → 再执行…
  useEffect(() => {
    if (value === 0 || value >= 3) return
    const timerId = setTimeout(() => setValue((v) => v + 1), 700)
    return () => clearTimeout(timerId)
  }, [value])

  return (
    <div className="learn-card">
      <p>value 当前值: {value}</p>
      <div className="learn-row">
        <button
          type="button"
          className="learn-btn"
          onClick={() => setValue(1)}
          disabled={value !== 0}
        >
          启动连锁反应(1 → 2 → 3 后刹车)
        </button>
        <button type="button" className="learn-btn" onClick={() => setValue(0)}>
          重置
        </button>
      </div>
      <p>
        避免方法: effect 里不要更新自己的依赖;确实要联动时,只让"触发源"进依赖数组,
        或在 effect 内部用函数式更新
      </p>
    </div>
  )
}

// ── 3. useRef ───────────────────────────────────────────────
// useRef 返回一个跨渲染持久的 { current } 对象: 改它不会触发重新渲染
function RefDemo() {
  // 3.1 获取 DOM 元素: 初始值写 null,渲染完成后 ref.current 就是真实 DOM 节点
  const inputRef = useRef<HTMLInputElement>(null)

  const [stateCount, setStateCount] = useState(0)
  // 3.2 保存跨渲染的可变值: 普通变量每次渲染都会被重置,ref 不会
  const refCount = useRef(0)

  const focusInput = () => {
    inputRef.current?.focus() // 直接调用 DOM API,这是 React 之外的操作
  }

  const addRefCount = () => {
    refCount.current += 1
    // 没有 setState,界面不会刷新;打开控制台能看到它在持续累加
    console.log('ref 计数 =', refCount.current, '(界面不动)')
  }

  return (
    <div className="learn-card">
      <div className="learn-row">
        <input ref={inputRef} placeholder="点右边按钮让我获得焦点" />
        <button type="button" className="learn-btn" onClick={focusInput}>
          inputRef.current.focus()
        </button>
      </div>
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={() => setStateCount((c) => c + 1)}>
          state +1(立即刷新界面)
        </button>
        <button type="button" className="learn-btn" onClick={addRefCount}>
          ref +1(界面不动)
        </button>
      </div>
      <p>state 计数: {stateCount} —— 更新会触发重新渲染</p>
      <p>
        ref 计数只在控制台可见: 点"ref +1"页面纹丝不动,说明改 ref 不会触发渲染;但它确实
        跨渲染记住了数据(控制台里累加 1 → 2 → 3,而不会像普通局部变量那样每次归零)
      </p>
      <p>
        区别一句话: state 用于"会显示在界面上、变了要重新渲染"的数据; ref
        用于"渲染无关、但需要跨渲染记住"的数据(DOM 节点、定时器 id、上一次的值等)
      </p>
    </div>
  )
}

// ── 4. 调用规则与页面装配 ───────────────────────────────────

function HooksDemo() {
  return (
    <div className="learn-demo">
      <h3>1. useState: 定义与更新</h3>
      <BasicCounter />

      <h3>2. 为什么不能直接修改 state</h3>
      <MutationDemo />

      <h3>3. 两种更新方式: 直接传新值 vs 函数式 updater</h3>
      <UpdaterDemo />

      <h3>4. useEffect: 依赖数组的三种写法</h3>
      <DependencyDemo />

      <h3>5. useEffect: 清理函数(订阅 / 定时器 / 请求)</h3>
      <CleanupDemo />

      <h3>6. useEffect: 模拟请求与"过期结果"处理</h3>
      <FetchDemo />

      <h3>7. useEffect: 无限循环是怎么来的</h3>
      <ChainReactionDemo />

      <h3>8. useRef: DOM 引用 + 跨渲染可变值</h3>
      <RefDemo />

      <h3>9. Hooks 的调用规则</h3>
      <div className="learn-card">
        <p>✅ 只能在函数组件(或自定义 Hook)的顶层调用,保证每次渲染时调用顺序完全一致</p>
        <p>
          ❌ 不能放在 <code>if</code> / <code>for</code> / 嵌套函数里,否则某次渲染少调用一个
          Hook,后面的 state 会全部错位
        </p>
        <p>
          错误写法: <code>{'if (isReady) { const [x] = useState(0) }'}</code>
        </p>
        <p>
          正确写法: 所有 Hook 都写在组件顶层,再用条件、循环去"使用"它们返回的值
        </p>
        <p>
          本项目的 .oxlintrc.json 开启了 <code>react/rules-of-hooks</code> 规则,违反会直接标红
        </p>
      </div>
    </div>
  )
}

export default HooksDemo
