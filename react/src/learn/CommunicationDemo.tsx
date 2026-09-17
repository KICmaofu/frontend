import { createContext, useContext, useState } from 'react'

// ── 组件通信方式 ────────────────────────────────────────────
// React 是单向数据流: 数据只能从父组件流向子组件,不能反过来直接改
// 其他方向的通信,都是在这条单向通道上做文章:
//   父 → 子:  props 直接传
//   子 → 父:  父把函数作为 props 传下去,子组件调用它
//   兄弟之间: 状态提升到共同父组件,由父组件"中转"
//   跨层级:   Context,跳过中间组件直接取值

// 1. 父 → 子: props 是最基础的通信
function CountView({ count }: { count: number }) {
  return <span className="learn-tag">子组件读到 count: {count}</span>
}

function ParentToChildDemo() {
  const [count, setCount] = useState(0)

  return (
    <div className="learn-card">
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={() => setCount((c) => c + 1)}>
          父组件修改 count
        </button>
        <CountView count={count} />
      </div>
      <p>数据存放在父组件,通过 props 流给子组件;父组件的 state 一变,子组件自动重新渲染</p>
    </div>
  )
}

// 2. 子 → 父: 回调函数 props
// 父组件把 setNickname 传下去,子组件每次输入都调用它"上报"
function NicknameInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="在子组件的输入框里打字"
    />
  )
}

function ChildToParentDemo() {
  const [nickname, setNickname] = useState('')

  return (
    <div className="learn-card">
      <NicknameInput value={nickname} onChange={setNickname} />
      <p>父组件实时收到: {nickname || '还没输入'}</p>
      <p>输入框写在子组件里,内容却由父组件的 state 掌管: 子组件通过回调函数把每次输入交给父组件</p>
    </div>
  )
}

// 3. 兄弟组件: 状态提升,由父组件中转
// 两个兄弟互不相识,无法直接通信;把共享数据放到共同父组件里,一方上报,另一方下发
const books = ['React 快速入门', 'TypeScript 编程', 'Vite 实战', 'React 设计模式']

function KeywordInput({ onKeywordChange }: { onKeywordChange: (kw: string) => void }) {
  return (
    <input placeholder="输入关键字,如 React" onChange={(e) => onKeywordChange(e.target.value)} />
  )
}

function SearchResult({ keyword }: { keyword: string }) {
  const matched =
    keyword === '' ? books : books.filter((b) => b.toLowerCase().includes(keyword.toLowerCase()))

  return <p>兄弟组件显示匹配结果: {matched.length > 0 ? matched.join('、') : '没有匹配的书'}</p>
}

function SiblingDemo() {
  const [keyword, setKeyword] = useState('')

  return (
    <div className="learn-card">
      <KeywordInput onKeywordChange={setKeyword} />
      <SearchResult keyword={keyword} />
      <p>
        关键字存放在父组件: 输入框(兄弟 A)上报 → 父组件 setKeyword → 结果区(兄弟 B)收到新
        props 重新渲染
      </p>
    </div>
  )
}

// 4. 跨层级: Context
// 数据要从"爷爷"到"孙子"时,逐层用 props 接力太啰嗦(prop drilling);
// Context 让提供者和消费者无视中间层,直接对接
type Theme = { name: string; color: string }

const themes = {
  ocean: { name: '海洋蓝', color: '#0ea5e9' },
  coral: { name: '珊瑚红', color: '#e5484d' },
  forest: { name: '森林绿', color: '#0d9488' },
}

// createContext(默认值): 只有在没有任何 Provider 包住时才用默认值
const ThemeContext = createContext<Theme>({ name: '默认主题', color: 'inherit' })

function ThemeBadge() {
  // useContext 读取最近的 Provider 提供的值,与中间隔了几层无关
  const theme = useContext(ThemeContext)

  return (
    <span className="learn-tag" style={{ color: theme.color }}>
      孙子组件直接读到: {theme.name}
    </span>
  )
}

function MiddleLayer() {
  // 关键点: 这个中间组件没有接收、也没有传递任何与主题相关的 props
  return (
    <div className="learn-card">
      <p>中间层: 我不接收、也不传递任何 props</p>
      <ThemeBadge />
    </div>
  )
}

function ThemeProviderDemo() {
  const [theme, setTheme] = useState<Theme>(themes.ocean)

  return (
    // React 19 起 Context 对象本身可以直接当 Provider 用;
    // 旧版本需要写 <ThemeContext.Provider value={theme}>
    <ThemeContext value={theme}>
      <div className="learn-card">
        <p>爷爷组件是数据的持有者,通过 Context 提供出去</p>
        <div className="learn-row">
          {Object.entries(themes).map(([key, t]) => (
            <button key={key} type="button" className="learn-btn" onClick={() => setTheme(t)}>
              {t.name}
            </button>
          ))}
        </div>
        <MiddleLayer />
      </div>
    </ThemeContext>
  )
}

function CommunicationDemo() {
  return (
    <div className="learn-demo">
      <h3>1. 父 → 子: props</h3>
      <ParentToChildDemo />

      <h3>2. 子 → 父: 回调函数 props</h3>
      <ChildToParentDemo />

      <h3>3. 兄弟组件: 状态提升,父组件中转</h3>
      <SiblingDemo />

      <h3>4. 跨层级: Context 跳过中间组件</h3>
      <ThemeProviderDemo />

      <h3>5. 小结: 按场景选通信方式</h3>
      <div className="learn-card">
        <p>父 → 子: props 直接传,最常用</p>
        <p>子 → 父: 把回调函数当 props 传下去,子组件在事件里调用</p>
        <p>兄弟 / 近距离: 状态提升,共享数据放进共同父组件</p>
        <p>跨多层: Context,适合主题、当前用户这类"多处读取、很少修改"的数据</p>
        <p>更庞大的全局状态,交给状态管理库,属于后续主题</p>
      </div>
    </div>
  )
}

export default CommunicationDemo
