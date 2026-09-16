import { useState } from 'react'
import './App.css'
import './learn/learn.css'
import JsxDemo from './learn/JsxDemo'
import ComponentsDemo from './learn/ComponentsDemo'
import PropsDemo from './learn/PropsDemo'
import StateDemo from './learn/StateDemo'
import HooksDemo from './learn/HooksDemo'
import FormDemo from './learn/FormDemo'

// 本页本身就是一个综合示例: 列表渲染 + key + className 动态切换 + state 驱动视图
const tabs = [
  { id: 'jsx', label: 'JSX' },
  { id: 'components', label: '函数组件' },
  { id: 'props', label: 'Props' },
  { id: 'state', label: 'State' },
  { id: 'hooks', label: '核心 Hooks' },
  { id: 'form', label: '表单与事件' },
] as const

type TabId = (typeof tabs)[number]['id']

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('jsx')

  return (
    <main className="learn-page">
      <h1>React 核心用法</h1>
      <p className="learn-subtitle">
        点击标签切换示例;对照阅读源码 src/learn/ 目录,改动后 HMR 会自动刷新
      </p>

      <nav className="learn-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? 'learn-tab active' : 'learn-tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'jsx' && <JsxDemo />}
      {activeTab === 'components' && <ComponentsDemo />}
      {activeTab === 'props' && <PropsDemo />}
      {activeTab === 'state' && <StateDemo />}
      {activeTab === 'hooks' && <HooksDemo />}
      {activeTab === 'form' && <FormDemo />}
    </main>
  )
}

export default App
