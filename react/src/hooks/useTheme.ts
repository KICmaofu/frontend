import { useEffect } from 'react'
import { useThemeStore } from '../store/themeStore'
import { usePrefersDark } from './usePrefersDark'

// ── 主题的两个小工具 ────────────────────────────────────────

// 把"用户选择 + 系统偏好"合成为最终深浅色:
//   mode = system 时听系统的, 否则完全听用户的;
//   组件只关心"现在到底是深还是浅", 不需要自己判断 mode
export function useIsDark(): boolean {
  const mode = useThemeStore((state) => state.mode)
  const prefersDark = usePrefersDark()
  return mode === 'system' ? prefersDark : mode === 'dark'
}

// 把最终深浅色同步到 DOM:
//   1. <html data-theme="dark"> 驱动 index.css 里那套深色 CSS 变量;
//   2. color-scheme 让滚动条、原生输入控件也切成深色;
//   3. 更新 <meta name="theme-color">, 移动端浏览器地址栏颜色跟着变
// 放在一个 effect 里统一写, 避免多个组件各自改 DOM
export function useSyncTheme(isDark: boolean): void {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = isDark ? 'dark' : 'light'
    root.style.colorScheme = isDark ? 'dark' : 'light'

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#16171d' : '#ffffff')
  }, [isDark])
}
