import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mockApiPlugin } from './mock-api.ts'

// https://vite.dev/config/
export default defineConfig({
  // mockApiPlugin: 本地 mock 接口(根目录 mock-api.ts), 仅 dev 环境生效
  plugins: [react(), mockApiPlugin()],
})
