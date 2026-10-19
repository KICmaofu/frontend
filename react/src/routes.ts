import type { ComponentType } from 'react'
import JsxDemo from './learn/JsxDemo'
import ComponentsDemo from './learn/ComponentsDemo'
import PropsDemo from './learn/PropsDemo'
import StateDemo from './learn/StateDemo'
import HooksDemo from './learn/HooksDemo'
import FormDemo from './learn/FormDemo'
import CommunicationDemo from './learn/CommunicationDemo'
import ConditionalListDemo from './learn/ConditionalListDemo'
import AntdDemo from './learn/AntdDemo'
import RequestDemo from './learn/RequestDemo'
import SseDemo from './learn/SseDemo'
import ZustandDemo from './learn/ZustandDemo'
import TypeScriptDemo from './learn/TypeScriptDemo'
import MarkdownDemo from './learn/MarkdownDemo'
import KnowledgeBaseDemo from './learn/KnowledgeBaseDemo'

// ── 路由表: 路由与导航栏共用的"单一数据源" ────────────────────
// App.tsx 用它批量生成 <Route>, Layout.tsx 用它批量生成导航 <NavLink>;
// 新增一个学习示例, 只需在下面的数组里加一项, 路由和导航会同时生效

export interface LearnRoute {
  // 相对路径(不带 /): 作为子路由时相对父级布局路由解析,
  // 导航跳转时在 Layout 里拼成 /xx 形式的绝对路径
  path: string
  // 导航栏显示文字
  label: string
  Component: ComponentType
}

export const learnRoutes: LearnRoute[] = [
  { path: 'jsx', label: 'JSX', Component: JsxDemo },
  { path: 'components', label: '函数组件', Component: ComponentsDemo },
  { path: 'props', label: 'Props', Component: PropsDemo },
  { path: 'state', label: 'State', Component: StateDemo },
  { path: 'hooks', label: '核心 Hooks', Component: HooksDemo },
  { path: 'form', label: '表单与事件', Component: FormDemo },
  { path: 'communication', label: '组件通信', Component: CommunicationDemo },
  { path: 'conditional-list', label: '条件与列表渲染', Component: ConditionalListDemo },
  { path: 'antd', label: 'Ant Design', Component: AntdDemo },
  { path: 'request', label: '网络请求', Component: RequestDemo },
  { path: 'sse', label: 'SSE 流式', Component: SseDemo },
  { path: 'zustand', label: '状态管理', Component: ZustandDemo },
  { path: 'typescript', label: 'TypeScript 进阶', Component: TypeScriptDemo },
  { path: 'markdown', label: 'Markdown 渲染', Component: MarkdownDemo },
  { path: 'knowledge-base', label: '知识库原型', Component: KnowledgeBaseDemo },
]
