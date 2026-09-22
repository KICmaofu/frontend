import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './layouts/Layout'
import { learnRoutes } from './routes'

// ── 路由配置(React Router v6) ────────────────────────────────
// BrowserRouter 已在 main.tsx 中包住 <App />, 这里只声明"URL → 页面"的映射:
//   1. <Route element={<Layout />}> 是不带 path 的"布局路由",
//      所有子路由页面都渲染在它的 <Outlet /> 里
//   2. index 子路由: 访问根路径 / 时重定向到第一个示例
//   3. path="*" 通配符放最后, 兜底匹配所有未定义的 URL(404)

// 404 页面: 就是一个普通组件, 这里就近定义便于对照; 页面多时可拆到独立文件
function NotFound() {
  return (
    <div className="learn-demo">
      <h3>404: 页面不存在</h3>
      <p>没有匹配到当前 URL 的路由。</p>
      <Link className="learn-nav-link" to="/jsx">
        返回第一个示例
      </Link>
    </div>
  )
}

function App() {
  return (
    <Routes>
      {/* 布局路由: 导航栏常驻, 切换子路由时只有 <Outlet /> 部分变化 */}
      <Route element={<Layout />}>
        {/* replace: 用重定向结果替换掉 / 的历史记录, 避免"后退"又回到根路径 */}
        <Route index element={<Navigate to="/jsx" replace />} />

        {/* 学习示例页面: 从路由表批量生成(见 src/routes.ts) */}
        {learnRoutes.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}

        {/* 通配符兜底: 以上都没匹配到就显示 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
