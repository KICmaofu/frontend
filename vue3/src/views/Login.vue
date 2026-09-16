<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <!-- 左侧标题区域 -->
      <div class="login-left-section">
        <div class="welcome-title-overlay">
          <div class="logo-section">
            <div class="logo-circle">
              <img class="logo-icon" :src="logoImg" alt="智能巡检" />
            </div>
          </div>
          <div class="form-header">
            <h2>室内微型火灾巡检系统</h2>
          </div>
          <div class="slogan-section">
            <p class="slogan">智能感知·主动预警·安全守护</p>
            <p class="sub-slogan">用科技守护每一个角落</p>
          </div>
          <div class="decorative-elements">
            <div class="decorative-line"></div>
            <div class="decorative-dots">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧表单区域 -->
      <div class="login-form card">
        <div class="form-body">

          <!-- 登录表单：仅用户名和密码 -->
          <form v-if="!isRegistering" class="login-form-content">
            <div class="input-group">
              <label>用户名</label>
              <input
                type="text"
                class="input-field"
                placeholder="请输入用户名"
                v-model="loginForm.username"
              />
            </div>

            <div class="input-group">
              <label>密码</label>
              <input
                type="password"
                class="input-field"
                placeholder="请输入密码"
                v-model="loginForm.password"
              />
            </div>

            <button type="button" class="btn login-btn" @click="handleLogin">
              登录
            </button>
          </form>

          <!-- 注册表单：用户名、真实姓名、密码和邮箱 -->
          <form v-if="isRegistering" class="login-form-content">
            <div class="input-group">
              <label>用户名</label>
              <input
                type="text"
                class="input-field"
                placeholder="请输入用户名"
                v-model="registerForm.username"
              />
            </div>

            <div class="input-group">
              <label>真实姓名</label>
              <input
                type="text"
                class="input-field"
                placeholder="请输入真实姓名"
                v-model="registerForm.realName"
              />
            </div>

            <div class="input-group">
              <label>密码</label>
              <input
                type="password"
                class="input-field"
                placeholder="请输入密码"
                v-model="registerForm.password"
              />
            </div>

            <div class="input-group">
              <label>邮箱</label>
              <input
                type="email"
                class="input-field"
                placeholder="请输入邮箱"
                v-model="registerForm.email"
              />
            </div>

            <button type="button" class="btn login-btn" @click="handleRegister">
              注册
            </button>
          </form>
        </div>

        <div class="form-footer">
          <p>{{ isRegistering ? '已有账户？' : '还没有账户？'}}  
            <a href="#" class="toggle-link" @click.prevent="toggleAuthType">
               {{ isRegistering ? '立即登录' : '立即注册' }}
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import logoImg from '../assets/login-logo.jpg';

const router = useRouter();
const isRegistering = ref(false);

// 登录表单数据（仅用户名和密码）
const loginForm = reactive({
  username: '',
  password: ''
});

// 注册表单数据（用户名、真实姓名、密码、邮箱）
const registerForm = reactive({
  username: '',
  realName: '',
  password: '',
  email: ''
});

// 登录模拟数据（内置测试账号）
const MOCK_USER = {
  username: 'admin',
  password: '123456',
  realName: '系统管理员',
  email: 'admin@example.com'
};

const toggleAuthType = () => {
  isRegistering.value = !isRegistering.value;
};

const handleLogin = async () => {
  // 验证用户名
  if (!loginForm.username) {
    alert('请填写用户名');
    return;
  }

  // 验证密码
  if (!loginForm.password) {
    alert('请填写密码');
    return;
  }

  // 内置模拟账号登录
  if (loginForm.username === MOCK_USER.username && loginForm.password === MOCK_USER.password) {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify({
      username: MOCK_USER.username,
      realName: MOCK_USER.realName,
      email: MOCK_USER.email
    }));

    router.push('/Home');
    return;
  }

  // 注册账号登录：从本地读取注册资料校验
  try {
    const registered = localStorage.getItem('registeredUser');
    const data = registered ? JSON.parse(registered) : null;

    if (!data || data.username !== loginForm.username || data.password !== loginForm.password) {
      alert('账号或密码错误');
      return;
    }

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify({
      username: data.username,
      realName: data.realName || '',
      email: data.email || ''
    }));

    router.push('/Home');
  } catch (error) {
    console.error('登录失败:', error);
    alert('账号或密码错误');
  }
};

const handleRegister = async () => {
  // 验证必填项
  if (!registerForm.username || !registerForm.realName || !registerForm.password || !registerForm.email) {
    alert('请填写完整信息');
    return;
  }

  // 验证用户名格式
  const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
  if (!usernameRegex.test(registerForm.username)) {
    alert('用户名需为 3-16 位字母/数字/下划线');
    return;
  }

  // 验证密码长度
  if (registerForm.password.length < 6) {
    alert('密码长度至少为 6 位');
    return;
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(registerForm.email)) {
    alert('请输入正确的邮箱地址');
    return;
  }

  // 接口层已移除：将注册资料保存在本地，登录时读取
  try {
    localStorage.setItem('registeredUser', JSON.stringify({
      username: registerForm.username,
      realName: registerForm.realName.trim(),
      email: registerForm.email,
      password: registerForm.password
    }));
  } catch (error) {
    console.error('保存注册信息失败:', error);
  }

  alert('注册成功，请登录');
  isRegistering.value = false;
};
</script>


<style scoped>
/* ============================================================
   登录/注册页 —— 专业蓝灰白
   ============================================================ */
.login-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background:
    radial-gradient(1000px 600px at 12% -10%, rgba(37, 99, 235, 0.10), transparent 60%),
    radial-gradient(900px 560px at 110% 110%, rgba(29, 78, 216, 0.08), transparent 55%),
    #eef2f7;
}

/* 双栏卡片 */
.login-form-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  width: 100%;
  max-width: 880px;
  background: #ffffff;
  border: 1px solid #e5e9f0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
  animation: cardIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ================= 左侧品牌区 ================= */
.login-left-section {
  flex: 1 1 46%;
  background: linear-gradient(160deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  color: #fff;
  text-align: center;
  position: relative;
  overflow: hidden;
}

/* 背景光斑纹理 */
.login-left-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 18% 45%, rgba(255, 255, 255, 0.14) 0%, transparent 45%),
    radial-gradient(circle at 82% 26%, rgba(255, 255, 255, 0.10) 0%, transparent 45%),
    radial-gradient(circle at 45% 85%, rgba(255, 255, 255, 0.12) 0%, transparent 45%);
  z-index: 1;
}

.welcome-title-overlay {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  animation: fadeInUp 0.8s ease-out;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-left-section .logo-circle {
  width: 96px;
  height: 96px;
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.22);
  transition: transform 0.3s ease;
}

.login-left-section .logo-circle:hover {
  transform: scale(1.06);
}

.login-left-section .logo-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  border-radius: 14px;
}

.login-left-section .form-header h2 {
  font-size: 1.55rem;
  line-height: 1.45;
  margin: 0;
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.slogan-section {
  margin: 4px 0;
}

.slogan {
  font-size: 1.02rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.92);
  margin: 0 0 8px 0;
  letter-spacing: 2px;
}

.sub-slogan {
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.68);
  margin: 0;
}

.decorative-elements {
  margin-top: 8px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.decorative-line {
  width: 60%;
  height: 1px;
  background: rgba(255, 255, 255, 0.28);
  position: relative;
}

.decorative-line::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.18);
}

.decorative-dots {
  display: flex;
  gap: 10px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  transition: all 0.3s ease;
}

.dot:hover {
  background: #fff;
  transform: scale(1.25);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ================= 右侧表单区 ================= */
.login-form {
  flex: 1 1 54%;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 44px 48px;
}

.form-body {
  width: 100%;
}

.login-form-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.input-group {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.88rem;
}

/* 输入框：覆盖全局 .input-field 的 scoped 版本 */
.login-form-wrapper .input-field {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid #d4dae4;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #1f2937;
  background-color: #f8fafc;
  margin: 0;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.login-form-wrapper .input-field::placeholder {
  color: #98a2b3;
}

.login-form-wrapper .input-field:focus {
  outline: none;
  background-color: #fff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
}

/* 主按钮：覆盖全局 .btn */
.login-form-wrapper .btn.login-btn {
  width: 100%;
  height: 44px;
  padding: 0;
  margin: 6px 0 0;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 0.98rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.22);
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
}

.login-form-wrapper .btn.login-btn:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
  transform: translateY(-1px);
}

.login-form-wrapper .btn.login-btn:active {
  transform: translateY(0) scale(0.99);
}

/* 底部切换区 */
.form-footer {
  text-align: center;
  padding-top: 20px;
  margin-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.form-footer p {
  color: #6b7280;
  margin: 0;
  font-size: 0.88rem;
}

.toggle-link {
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
  margin-left: 4px;
  transition: color 0.2s ease;
}

.toggle-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

/* ================= 平板：纵向堆叠 ================= */
@media (max-width: 820px) {
  .login-form-wrapper {
    flex-direction: column;
    max-width: 460px;
  }

  .login-left-section {
    flex: none;
    padding: 32px 28px;
  }

  .login-left-section .logo-circle {
    width: 72px;
    height: 72px;
  }

  .login-left-section .form-header h2 {
    font-size: 1.25rem;
  }

  .slogan-section {
    margin: 0;
  }

  .decorative-elements {
    display: none;
  }

  .login-form {
    padding: 32px 36px 36px;
  }
}

/* ================= 手机 ================= */
@media (max-width: 480px) {
  .login-container {
    padding: 12px;
  }

  .login-left-section {
    padding: 26px 20px;
  }

  .login-left-section .form-header h2 {
    font-size: 1.1rem;
  }

  .slogan {
    font-size: 0.92rem;
    letter-spacing: 1px;
  }

  .sub-slogan {
    font-size: 0.8rem;
  }

  .login-form {
    padding: 26px 22px 30px;
  }
}
</style>
