// src/main.js
import { createApp } from 'vue'
import './assets/style.css'
import App from './views/App.vue'
import router from './router/index.js'

const app = createApp(App)

// 全局注册路由
app.use(router)

// 挂载 Vue 实例
app.mount('#app')
