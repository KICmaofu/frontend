import { useEffect, useState } from 'react'

// 跟随系统深色模式: 与 index.css 里的 prefers-color-scheme 是同一个媒体查询,
// 目的: 让 antd 组件的主题算法和页面 CSS 变量保持同步(系统切换时实时更新)
export function usePrefersDark(): boolean {
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setDark(event.matches)
    media.addEventListener('change', onChange)
    // 清理函数: 卸载时移除监听(参考 Hooks 示例里的"清理函数"小节)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return dark
}
