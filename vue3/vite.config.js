import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
// const base_url = 'http://KIC:8080'
const base_url = 'http://192.168.1.120:8080'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    },
  },
  server: {
    proxy: {
      '/api': {
        target: base_url,
        secure: false,
        changeOrigin: true,
        ws: true,
        configureProxy: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.log('❌ 代理错误:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('📡 代理请求:', req.method, req.url);
          });
        }
      },
      '/qwen': {
        target: base_url,    
        secure: false,
        changeOrigin: true
      },
      // 仅匹配 /device 与 /device/...，避免误伤前端路由 /device-management
      '^/device(/|$)': {
        target: base_url,
        secure: false,
        changeOrigin: true
      },
      '/robots': {
        target: base_url,    
        secure: false,
        changeOrigin: true
      },
      '/device-profile': {
        target: base_url,    
        secure: false,
        changeOrigin: true
      },
      '/sse': {
        target: base_url,    
        secure: false,
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    // 代码分割策略
    rollupOptions: {
      output: {
        // 分包策略
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'chart-vendor': ['chart.js']
        },
        // 文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // 构建优化
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: true,
    sourcemap: false
  },
  // 性能优化
  optimizeDeps: {
    include: ['vue', 'vue-router', 'chart.js'],
    exclude: []
  }
})