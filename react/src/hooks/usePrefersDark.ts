import { useEffect, useState } from 'react'

// 读取系统深色偏好: 这里只有"系统怎么说", 不包含用户的手动选择;
// 最终深浅色由 useTheme 里的 useIsDark 合成(手选优先, 否则看 system),
// 这样 antd 主题、代码高亮主题和页面 CSS 变量始终同步
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
