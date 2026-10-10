import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { mockApiPlugin } from './mock-api.ts'

// ── 配置总览: 环境文件 / 代理 / 打包 ─────────────────────────
//   .env                所有环境共享的变量
//   .env.development    npm run dev 时加载
//   .env.production     npm run build / preview 时加载
// 只有 VITE_ 前缀的变量会注入前端代码(import.meta.env),
// 前缀之外的变量只有本文件这类 node 侧代码能读到
// defineConfig 用函数写法才能拿到 mode(development / production),
// 再由 loadEnv 读取"当前模式"对应的 .env 文件

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  // 接口基础地址: 与 src/api/request.ts 里 axios 的 baseURL 保持一致
  const apiBaseUrl = env.VITE_API_BASE_URL || '/api'
  // 是否启用本地 mock: 见 .env.development 的 VITE_USE_MOCK
  const useMock = env.VITE_USE_MOCK === 'true'
  // 代理目标: 联调真实后端时指向后端地址
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

  return {
    // mockApiPlugin 只实现了 configureServer 钩子, 因此在 build 时不生效
    plugins: [react(), ...(useMock ? [mockApiPlugin()] : [])],

    // ── 前端代理(只在 dev server 生效) ───────────────────────
    // 浏览器请求 /api/xxx -> dev server 转发给后端, 绕开浏览器跨域(CORS);
    // 生产环境没有 dev server, 同样的转发由 nginx 等反向代理承担
    // 注意: proxy 中间件注册在插件中间件之前, 开着 mock 时 /api 会先被
    // mock 插件响应(收不到请求), 所以两者互斥, 用 VITE_USE_MOCK 切换
    server: useMock
      ? undefined
      : {
          proxy: {
            [apiBaseUrl]: {
              target: proxyTarget,
              // changeOrigin: 转发时把请求头 Host 改成目标地址, 后端按 Host 校验时需要
              changeOrigin: true,
              // 若后端接口自身不带 /api 前缀, 转发前把前缀剥掉; 后端本身就带 /api 时删掉这行
              rewrite: (path) => path.replace(new RegExp(`^${apiBaseUrl}`), ''),
            },
          },
        },

    // ── 生产构建(Vite 8 已换成 Rolldown + Oxc) ───────────────
    // 以下默认值一般不用改, 这里写明方便对照:
    //   build.target     默认 'baseline-widely-available'(约 2026-01 的浏览器基线)
    //   build.minify     默认 'oxc'; cssMinify 默认 'lightningcss'
    //   rollupOptions    已更名 rolldownOptions(旧名兼容但会提示 deprecated)
    build: {
      // 生产默认不出 sourcemap: 不把源码交给浏览器;
      // 排查线上问题时把 .env.production 的 VITE_BUILD_SOURCEMAP 改成 true
      sourcemap: env.VITE_BUILD_SOURCEMAP === 'true',
      // antd 这类组件库体积大, 分包后单 chunk 仍可能超过默认 500KB 阈值
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        output: {
          // 手动分包: 把变动频率低的三方库拆成独立 chunk,
          // 业务代码发版时这些 chunk 的 hash 不变, 浏览器继续命中缓存
          //   注意: 匹配路径分隔符用 [\\/], 兼容 Windows 的反斜杠
          //   未命中任何组的模块(axios / zustand 等)由 Rolldown 自动分包
          codeSplitting: {
            groups: [
              { name: 'react-vendor', test: /node_modules[\\/](react|scheduler)/ },
              { name: 'antd-vendor', test: /node_modules[\\/](@ant-design|@rc-component|antd)/ },
            ],
          },
        },
      },
    },
  }
})
