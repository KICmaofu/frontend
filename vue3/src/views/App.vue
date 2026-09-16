<template>
  <div id="app">
    <header class="site-header" v-if="!isLoginPage">
      <div class="container-nav">
        <div class="logo-container">
          <router-link to="/home" class="logo-wrapper">
            <img :src="logoImg" alt="智能巡检系统" class="logo-image">
            <div class="logo-text-group">
              <h1 class="logo">智能巡检系统</h1>
              <p class="tagline">高效 · 安全 · 智能</p>
            </div>
          </router-link>
        </div>

        <!-- 移动端汉堡按钮 -->
        <button
          class="nav-toggle"
          :class="{ open: mobileMenuOpen }"
          :aria-expanded="mobileMenuOpen"
          aria-label="切换导航菜单"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav class="main-nav" :class="{ open: mobileMenuOpen }">
          <router-link to="/home" class="nav-link" @click="closeMobileMenu">首页</router-link>
          <router-link to="/device-management" class="nav-link" @click="closeMobileMenu">设备管理</router-link>
          <router-link to="/data-management" class="nav-link" @click="closeMobileMenu">数据管理</router-link>
          <router-link to="/message-center" class="nav-link" @click="closeMobileMenu">消息中心</router-link>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <router-view />
    </main>

    <footer class="site-footer" v-if="!isLoginPage">
      <div class="footer-inner">
        <span class="footer-brand">智能巡检系统 · 高效 · 安全 · 智能</span>
        <span class="footer-divider">|</span>
        <span class="footer-copy">© 2026 室内微型火灾巡检系统 v1.0</span>
      </div>
    </footer>

    <!-- 右下角悬浮聊天入口 -->
    <ChatWidget v-if="!isLoginPage" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import logoImg from '../assets/login-logo.jpg'
import ChatWidget from './ChatWidget.vue'

const route = useRoute()

// 登录页隐藏导航栏与页脚
const isLoginPage = computed(() => route.path === '/login')

// 移动端菜单
const mobileMenuOpen = ref(false)
const closeMobileMenu = () => { mobileMenuOpen.value = false }

// 路由切换后自动收起菜单
watch(() => route.path, () => { mobileMenuOpen.value = false })
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f3f5f8;
}

/* ================= 顶部导航 ================= */
.site-header {
  height: var(--header-h);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e5e9f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
  position: sticky;
  top: 0;
  z-index: 9999;
}

.container-nav {
  max-width: var(--shell-max);
  height: 100%;
  margin: 0 auto;
  padding: 0 var(--page-gutter);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-image {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.logo-text-group {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.logo {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1d4ed8;
  margin: 0;
  letter-spacing: 0.2px;
}

.tagline {
  font-size: var(--fs-xs);
  color: #98a2b3;
  margin: 2px 0 0;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  font-size: var(--fs-base);
  font-weight: 500;
  color: #4b5563;
  text-decoration: none;
  padding: 7px 15px;
  border-radius: 8px;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  white-space: nowrap;
}

.nav-link:hover {
  color: #1d4ed8;
  background: #eff6ff;
}

.nav-link.router-link-exact-active {
  color: #fff;
  background: #2563eb;
  box-shadow: 0 3px 10px rgba(37, 99, 235, 0.25);
}

/* 汉堡按钮（仅移动端显示） */
.nav-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 8px;
  background: transparent;
  border: 1px solid #d4dae4;
  border-radius: 8px;
  cursor: pointer;
}

.nav-toggle span {
  display: block;
  height: 2px;
  width: 100%;
  background: #374151;
  border-radius: 2px;
  transition: transform 0.25s ease, opacity 0.2s ease;
}

.nav-toggle.open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.nav-toggle.open span:nth-child(2) {
  opacity: 0;
}

.nav-toggle.open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ================= 主内容区 ================= */
.main-content {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
}

/* ================= 标准页脚 ================= */
.site-footer {
  min-height: var(--footer-h);
  height: var(--footer-h);
  flex-shrink: 0;
  background: #ffffff;
  border-top: 1px solid #e5e9f0;
}

.footer-inner {
  max-width: var(--shell-max);
  height: 100%;
  margin: 0 auto;
  padding: 0 var(--page-gutter);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: var(--fs-xs);
  color: #98a2b3;
  white-space: nowrap;
}

.footer-divider {
  color: #d4dae4;
}

/* ================= 响应式：平板/手机 ================= */
@media (max-width: 860px) {
  .nav-toggle {
    display: flex;
  }

  .main-nav {
    position: absolute;
    top: var(--header-h);
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    padding: 10px var(--page-gutter) 14px;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #e5e9f0;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
    display: none;
  }

  .main-nav.open {
    display: flex;
    animation: menuIn 0.2s ease;
  }

  .nav-link {
    padding: 12px 14px;
    border-radius: 8px;
    font-size: 0.95rem;
  }

  @keyframes menuIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}

@media (max-width: 480px) {
  .site-footer {
    height: auto;
    padding: 8px 0;
  }

  .logo-text-group .tagline {
    display: none;
  }

  .footer-divider {
    display: none;
  }

  .footer-inner {
    flex-direction: column;
    gap: 2px;
    white-space: normal;
    text-align: center;
    line-height: 1.3;
  }
}
</style>
