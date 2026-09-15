import type { ReactNode } from 'react'

// ── 函数组件核心用法 ────────────────────────────────────────
// 组件 = 返回 JSX 的函数,名字必须大写开头

// 1. 最小组件: 一个函数 + 一段 JSX
function Greeting() {
  return <p>你好,我是一个函数组件</p>
}

// 2. 组件可以接收 props 并复用(传参细节见 Props 标签页)
function Tag({ text }: { text: string }) {
  return <span className="learn-tag">{text}</span>
}

// 3. 组件可以包裹内容,通过 children 拿到(细节见 Props 标签页)
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="learn-card">
      <h4>{title}</h4>
      {children}
    </div>
  )
}

function ComponentsDemo() {
  return (
    <div className="learn-demo">
      <h3>1. 组件就是一个返回 JSX 的函数</h3>
      <Greeting />

      <h3>2. 组件组合: 在组件内部使用其他组件,像搭积木一样嵌套</h3>
      <Card title="Card 组件">
        <Greeting />
        <p>Greeting 被 Card 包裹着渲染,组件可以层层嵌套成组件树</p>
      </Card>

      <h3>3. 组件复用: 同一个组件用多次,彼此独立</h3>
      <div className="learn-row">
        <Tag text="React" />
        <Tag text="TypeScript" />
        <Tag text="Vite" />
      </div>

      <h3>4. 命名规则: 大写开头才是组件</h3>
      <p>
        <code>&lt;Card /&gt;</code> 会被当作组件渲染,
        <code>&lt;card /&gt;</code> 则会被当成普通 HTML 标签
      </p>

      <h3>5. 组件是独立的单元</h3>
      <p>
        每个组件有自己的 JSX、数据(state)和逻辑。组件之间如何传数据、如何管理各自的状态,
        就是下面 Props 和 State 两部分要解决的问题
      </p>
    </div>
  )
}

export default ComponentsDemo
