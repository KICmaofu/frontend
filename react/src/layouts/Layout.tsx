import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Drawer } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import ThemeToggle from '../components/ThemeToggle'
import { learnRoutes } from '../routes'
import '../learn/learn.css'

// ── 页面布局: 所有路由页面共享的外壳 ─────────────────────────
// 顶部是标题、主题切换和导航栏; 下方 <Outlet /> 是"渲染出口":
// URL 匹配到的子路由页面渲染在这里, 布局本身(标题/导航)保持不变
//
// 响应式: 宽屏导航横排在页面上; 窄屏隐藏横向导航, 把同一份路由表
// 再渲染进右侧抽屉(见 learn.css 的断点) —— 两处都来自 learnRoutes, 不会漏项

interface NavLinksProps {
  // 抽屉里竖排显示
  vertical?: boolean
  // 点击后要做的额外动作: 抽屉里用于收起抽屉
  onNavigate?: () => void
}

function NavLinks({ vertical = false, onNavigate }: NavLinksProps) {
  return (
    <nav className={vertical ? 'learn-nav learn-nav-vertical' : 'learn-nav'}>
      {/* to 指向目标路由; NavLink 比 Link 多出 isActive 状态,
          当前 URL 命中该链接时会自动追加样式类名, 无需手动维护选中项 */}
      {learnRoutes.map(({ path, label }) => (
        <NavLink
          key={path}
          to={`/${path}`}
          className={({ isActive }) => (isActive ? 'learn-nav-link active' : 'learn-nav-link')}
          onClick={onNavigate}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function Layout() {
  // 窄屏抽屉导航的开合状态; 宽屏下这个状态用不到, 也不影响渲染
  const [navOpen, setNavOpen] = useState(false)

  return (
    <main className="learn-page">
      <header className="learn-header">
        <div className="learn-header-text">
          <h1>React 核心用法</h1>
          <p className="learn-subtitle">
            点击导航切换示例;对照阅读源码 src/learn/ 目录,改动后 HMR 会自动刷新
          </p>
        </div>

        {/* 右侧动作区: 主题切换常驻; 菜单按钮只在窄屏出现 */}
        <div className="learn-header-actions">
          <ThemeToggle />
          <button
            type="button"
            className="learn-nav-toggle"
            aria-label="打开示例导航"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <MenuOutlined />
          </button>
        </div>
      </header>

      <NavLinks />

      {/* 窄屏导航抽屉: 与横向导航共用 <NavLinks />, 点击链接后自动收起 */}
      <Drawer
        title="示例导航"
        placement="right"
        width={272}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      >
        <NavLinks vertical onNavigate={() => setNavOpen(false)} />
      </Drawer>

      {/* 子路由渲染出口: /jsx、/state 等页面轮流显示在这里 */}
      <Outlet />
    </main>
  )
}

export default Layout
