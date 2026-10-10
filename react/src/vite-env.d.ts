/// <reference types="vite/client" />

// ── 环境变量类型声明 ────────────────────────────────────────
// .env / .env.development / .env.production 里定义的 VITE_ 变量,
// 在这里补上类型, 代码里写 import.meta.env.XXX 时才有补全和检查,
// 变量名拼错会在编译阶段直接报错

interface ImportMetaEnv {
  /** 接口基础地址: dev 走 mock/代理, 生产由部署方式决定 */
  readonly VITE_API_BASE_URL: string
  /** 站点标题: index.html 里 %VITE_APP_TITLE% 的替换值 */
  readonly VITE_APP_TITLE: string
  /** 是否启用本地 mock(仅 dev 有意义): 'true' | 'false' */
  readonly VITE_USE_MOCK: string
  /** 代理目标地址(仅 dev 且关闭 mock 时有意义) */
  readonly VITE_API_PROXY_TARGET: string
  /** 生产构建是否输出 sourcemap: 'true' | 'false' */
  readonly VITE_BUILD_SOURCEMAP: string
}
