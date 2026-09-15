import { useState } from 'react'
import type { ReactNode } from 'react'

// ── Props 核心用法 ──────────────────────────────────────────
// props = 父组件传给子组件的参数,只读,单向流动(父 → 子)

// 1. 用 interface 定义 props 的类型(推荐,写法和 TS 函数参数完全一致)
interface UserCardProps {
  name: string
  age: number
  isVip?: boolean // ? 表示可选
  hobby?: string
}

// 2. 解构接收 + 参数默认值(函数组件已不支持 defaultProps,直接用默认参数)
function UserCard({ name, age, isVip = false, hobby = '暂无' }: UserCardProps) {
  return (
    <div className="learn-card">
      <p>
        {name}({age} 岁){isVip && ' [VIP]'}
      </p>
      <p>爱好: {hobby}</p>
    </div>
  )
}

// 3. children: 写在开闭标签中间的内容,会自动作为 children 传入
function FancyBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="learn-card">
      <h4>{title}</h4>
      {children}
    </div>
  )
}

// 4. 回调函数作为 props: 子组件在合适的时机调用它,从而通知父组件
function ActionButton({
  label,
  onAction,
}: {
  label: string
  onAction: () => void
}) {
  return (
    <button type="button" className="learn-btn" onClick={onAction}>
      {label}
    </button>
  )
}

function PropsDemo() {
  const [log, setLog] = useState('(还没点击)')

  return (
    <div className="learn-demo">
      <h3>1. 传递与接收</h3>
      <p>
        <code>{'name="小明"'}</code> 直接写双引号传字符串,
        <code>{'age={18}'}</code> 用花括号传任意表达式
      </p>
      <UserCard name="小明" age={18} isVip hobby="篮球" />
      {/* 可选 props 可以不传,由组件内部的默认值兜底 */}
      <UserCard name="小红" age={16} />

      <h3>2. children: 开闭标签之间的内容</h3>
      <FancyBox title="这个标题通过 props 传入">
        <p>我写在开闭标签中间,子组件通过 children 拿到我</p>
      </FancyBox>

      <h3>3. 回调函数 props: 子组件 → 父组件 通信</h3>
      <ActionButton
        label="点一下试试"
        onAction={() => setLog('子组件调用了父组件传下来的函数')}
      />
      <p>{log}</p>

      <h3>4. props 是只读的</h3>
      <p>
        子组件只能读取 props 而不能修改它。需要"会被修改的数据",要用 state
        管理(见 State 标签页)
      </p>
    </div>
  )
}

export default PropsDemo
