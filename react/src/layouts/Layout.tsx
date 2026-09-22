import { NavLink, Outlet } from 'react-router-dom'
import { learnRoutes } from '../routes'
import '../learn/learn.css'

// ── 页面布局: 所有路由页面共享的外壳 ─────────────────────────
// 顶部是标题和导航栏; 下方 <Outlet /> 是"渲染出口":
// URL 匹配到的子路由页面渲染在这里, 布局本身(标题/导航)保持不变

function Layout() {
  return (
    <main className="learn-page">
      <header>
        <h1>React 核心用法</h1>
        <p className="learn-subtitle">
          点击导航切换示例;对照阅读源码 src/learn/ 目录,改动后 HMR 会自动刷新
        </p>
      </header>

      {/* 导航栏: to 指向目标路由; NavLink 比 Link 多出 isActive 状态,
          当前 URL 命中该链接时会自动追加样式类名, 无需手动维护选中项 */}
      <nav className="learn-nav">
        {learnRoutes.map(({ path, label }) => (
          <NavLink
            key={path}
            to={`/${path}`}
            className={({ isActive }) => (isActive ? 'learn-nav-link active' : 'learn-nav-link')}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* 子路由渲染出口: /jsx、/state 等页面轮流显示在这里 */}
      <Outlet />
    </main>
  )
}

export default Layout
