import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntdApp, ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './index.css'
import App from './App.tsx'
import { setGlobalMessage } from './api/request'
import { useIsDark, useSyncTheme } from './hooks/useTheme'

// ── Ant Design 接入(全局配置) ────────────────────────────────
// <ConfigProvider> 是 antd 的全局配置入口, 放在应用最外层:
//   locale: 组件内置文案切换为中文(分页、日期、表单校验提示等)
//   theme:  主题算法跟随最终深浅色(用户手选优先, 否则跟随系统),
//           主色与 index.css 的 --accent 对齐, antd 与页面用同一套配色
// <AntdApp> 提供 message / modal / notification 的"上下文版"实例:
//   组件内用 AntdApp.useApp() 获取, 才会应用上面配置的主题和语言

// 桥接: 把 message 实例注册给 React 组件之外的代码(axios 拦截器要用),
// 对应 src/api/request.ts 里的 setGlobalMessage
function MessageBridge() {
  const { message } = AntdApp.useApp()
  useEffect(() => {
    setGlobalMessage(message)
  }, [message])
  return null
}

function Root() {
  // 最终深浅色: store 里是 light/dark/system, 这里合成一个布尔值
  const isDark = useIsDark()
  // 写 <html data-theme>: index.css 的整套 CSS 变量随之切换
  useSyncTheme(isDark)

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        // 主色对齐 --accent: 亮色 #aa3bff / 深色 #c084fc
        token: { colorPrimary: isDark ? '#c084fc' : '#aa3bff' },
      }}
    >
      <AntdApp>
        <MessageBridge />
        {/* BrowserRouter 放在应用最外层: 之后所有组件都能用路由能力
            (Link / NavLink / useNavigate 等), 它监听 URL 变化并让路由表重新匹配 */}
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
