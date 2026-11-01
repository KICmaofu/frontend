import { Segmented } from 'antd'
import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import type { ThemeMode } from '../store/themeStore'
import { useThemeStore } from '../store/themeStore'

// ── 主题切换开关 ────────────────────────────────────────────
// 三态 Segmented: 跟随系统 / 亮色 / 暗色。
// 组件本身只管"写 store", 真正切配色的是 useIsDark + useSyncTheme,
// 所以这里不需要任何 DOM 操作, 也不关心系统当前是深还是浅。
// 图标按钮在窄屏也放得下, 文案放 tooltip 里(鼠标悬停可见)
const options = [
  { value: 'system', icon: <DesktopOutlined />, tooltip: '跟随系统' },
  { value: 'light', icon: <SunOutlined />, tooltip: '亮色' },
  { value: 'dark', icon: <MoonOutlined />, tooltip: '暗色' },
]

function ThemeToggle() {
  const mode = useThemeStore((state) => state.mode)
  const setMode = useThemeStore((state) => state.setMode)

  return (
    <Segmented
      size="small"
      aria-label="切换主题"
      value={mode}
      // Segmented 的值类型是 string | number, 选项只有上面三个, 收窄一下即可
      onChange={(value) => setMode(value as ThemeMode)}
      options={options}
    />
  )
}

export default ThemeToggle
