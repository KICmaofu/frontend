<template>
  <div
    ref="widgetRef"
    class="chat-widget"
    :style="{ transform: `translate(${offsetX}px, ${offsetY}px)` }"
  >
    <!-- 右下角浮动聊天入口按钮 -->
    <button
      class="chat-fab"
      :class="{ active: isOpen }"
      :aria-expanded="isOpen"
      aria-label="打开 AI 智能助手聊天"
      @pointerdown="startDrag"
      @click="onFabClick"
    >
      <svg
        v-if="!isOpen"
        class="fab-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
      <svg
        v-else
        class="fab-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 6 6 18" />
        <path d="M6 6l12 12" />
      </svg>
    </button>

    <!-- 悬浮迷你聊天窗 -->
    <transition name="chat-panel">
      <div v-if="isOpen" class="chat-panel" role="dialog" aria-label="AI 智能助手">
        <div class="panel-header" @pointerdown="startDrag">
          <span class="panel-title">AI 智能助手</span>
          <div class="panel-actions">
            <button class="panel-btn" title="新建对话" @click="createNewConversation">＋</button>
            <button class="panel-btn" title="清除聊天" @click="clearChat">🗑</button>
            <button class="panel-btn" title="关闭" @click="toggleChat">✕</button>
          </div>
        </div>

        <div class="panel-messages" ref="messagesRef">
          <div
            v-for="(message, index) in chatMessages"
            :key="index"
            :class="['msg', message.role]"
          >
            <div class="msg-bubble">{{ message.content }}</div>
            <div class="msg-time">{{ message.time }}</div>
          </div>

          <div v-if="isTyping" class="msg ai">
            <div class="msg-bubble typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>

        <div class="panel-input">
          <textarea
            v-model="userInput"
            placeholder="请输入您的问题..."
            rows="2"
            @keyup.enter="handleEnterKey"
          ></textarea>
          <button
            class="panel-send"
            :disabled="!userInput.trim() || isTyping"
            @click="sendMessage"
          >
            发送
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted } from 'vue';

const isOpen = ref(false);
const chatMessages = ref([]);
const userInput = ref('');
const isTyping = ref(false);
const messagesRef = ref(null);

// ============ 拖拽定位 ============
const widgetRef = ref(null);
const offsetX = ref(0);
const offsetY = ref(0);
const didDrag = ref(false);

let dragging = false;
let startX = 0;
let startY = 0;
let startOffsetX = 0;
let startOffsetY = 0;
let baseRect = null;

function startDrag(e) {
  dragging = true;
  didDrag.value = false;
  startX = e.clientX;
  startY = e.clientY;
  startOffsetX = offsetX.value;
  startOffsetY = offsetY.value;
  baseRect = widgetRef.value ? widgetRef.value.getBoundingClientRect() : null;
  document.addEventListener('pointermove', onDrag);
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
}

function onDrag(e) {
  if (!dragging) return;
  let dx = e.clientX - startX;
  let dy = e.clientY - startY;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag.value = true;

  // 限制在可视区域内，避免拖出屏幕后找不到
  if (baseRect) {
    const margin = 8;
    const minX = margin - baseRect.left;
    const maxX = window.innerWidth - margin - baseRect.right;
    const minY = margin - baseRect.top;
    const maxY = window.innerHeight - margin - baseRect.bottom;
    dx = Math.min(Math.max(dx, minX), maxX);
    dy = Math.min(Math.max(dy, minY), maxY);
  }

  offsetX.value = startOffsetX + dx;
  offsetY.value = startOffsetY + dy;
}

function endDrag() {
  dragging = false;
  baseRect = null;
  document.removeEventListener('pointermove', onDrag);
  document.removeEventListener('pointerup', endDrag);
  document.removeEventListener('pointercancel', endDrag);
}

function onFabClick() {
  if (didDrag.value) {
    didDrag.value = false;
    return;
  }
  toggleChat();
}

onUnmounted(() => {
  document.removeEventListener('pointermove', onDrag);
  document.removeEventListener('pointerup', endDrag);
  document.removeEventListener('pointercancel', endDrag);
});

function getCurrentTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function toggleChat() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    ensureWelcomeMessage();
    nextTick(scrollToBottom);
  }
}

function ensureWelcomeMessage() {
  if (chatMessages.value.length === 0) {
    chatMessages.value.push({
      role: 'ai',
      content: '您好！我是 AI 智能助手，有什么可以帮您？',
      time: getCurrentTime()
    });
  }
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  }
}

function handleEnterKey(event) {
  if (!event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function sendMessage() {
  if (!userInput.value.trim() || isTyping.value) return;

  const query = userInput.value.trim();
  userInput.value = '';

  chatMessages.value.push({
    role: 'user',
    content: query,
    time: getCurrentTime()
  });
  scrollToBottom();

  isTyping.value = true;
  scrollToBottom();

  // AI 服务暂未接入，统一以中性提示兜底
  const fallbackResponse = 'AI 服务暂未接入，无法回答该问题，请稍后再试。';
  const aiMessage = {
    role: 'ai',
    content: '',
    time: getCurrentTime()
  };
  chatMessages.value.push(aiMessage);
  scrollToBottom();

  let currentIndex = 0;
  const typingInterval = setInterval(() => {
    if (currentIndex < fallbackResponse.length) {
      aiMessage.content += fallbackResponse[currentIndex];
      currentIndex++;
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      isTyping.value = false;
      saveToHistory(query, fallbackResponse);
    }
  }, 50);
}

function clearChat() {
  chatMessages.value = [];
  userInput.value = '';
  isTyping.value = false;
  nextTick(scrollToBottom);
}

function createNewConversation() {
  chatMessages.value = [{
    role: 'ai',
    content: '您好！我是 AI 智能助手，有什么可以帮您？',
    time: getCurrentTime()
  }];
  userInput.value = '';
  nextTick(scrollToBottom);
}

function saveToHistory(query, response) {
  try {
    const saved = localStorage.getItem('chatHistory');
    const history = saved ? JSON.parse(saved) : [];
    history.unshift({
      title: query.substring(0, 30),
      preview: response.substring(0, 50) + '...',
      time: new Date().toLocaleString('zh-CN'),
      messages: [...chatMessages.value]
    });
    if (history.length > 50) history.pop();
    localStorage.setItem('chatHistory', JSON.stringify(history));
  } catch (error) {
    console.error('保存历史对话失败:', error);
  }
}
</script>

<style scoped>
.chat-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 14px;
  user-select: none;
}

/* ============ 浮动入口按钮 ============ */
.chat-fab {
  position: relative;
  width: 58px;
  height: 58px;
  border: none;
  border-radius: 50%;
  cursor: grab;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 60%, #1d4ed8 100%);
  box-shadow: 0 10px 26px rgba(37, 99, 235, 0.45);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.chat-fab:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 14px 32px rgba(37, 99, 235, 0.55);
}

.chat-fab:active {
  transform: scale(0.96);
}

.chat-fab.active {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  box-shadow: 0 8px 22px rgba(71, 85, 105, 0.45);
}

.chat-fab::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(59, 130, 246, 0.5);
  animation: fab-pulse 2s ease-out infinite;
  pointer-events: none;
}

.chat-fab.active::after {
  display: none;
}

@keyframes fab-pulse {
  0% { transform: scale(1); opacity: 0.8; }
  70% { transform: scale(1.35); opacity: 0; }
  100% { transform: scale(1.35); opacity: 0; }
}

.fab-icon {
  width: 28px;
  height: 28px;
}

/* ============ 迷你聊天窗 ============ */
.chat-panel {
  width: min(360px, calc(100vw - 32px));
  height: min(500px, calc(100vh - 120px));
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #fff;
  cursor: grab;
  touch-action: none;
}

.panel-header:active {
  cursor: grabbing;
}

.chat-fab:active {
  cursor: grabbing;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.panel-btn:hover {
  background: rgba(255, 255, 255, 0.32);
}

.panel-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}

.msg.user {
  align-self: flex-end;
  align-items: flex-end;
}

.msg.ai {
  align-self: flex-start;
  align-items: flex-start;
}

.msg-bubble {
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg.ai .msg-bubble {
  background: #ffffff;
  color: var(--text-1);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
}

.msg.user .msg-bubble {
  background: #2563eb;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg-time {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 4px;
  padding: 0 4px;
}

.msg-bubble.typing {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 14px;
}

.msg-bubble.typing span {
  width: 7px;
  height: 7px;
  background: #3b82f6;
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out both;
}

.msg-bubble.typing span:nth-child(1) { animation-delay: -0.32s; }
.msg-bubble.typing span:nth-child(2) { animation-delay: -0.16s; }
.msg-bubble.typing span:nth-child(3) { animation-delay: 0s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.panel-input {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 12px;
  border-top: 1px solid var(--border);
  background: #ffffff;
}

.panel-input textarea {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  resize: none;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.panel-input textarea:focus {
  outline: none;
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
}

.panel-send {
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease, transform 0.15s ease;
}

.panel-send:hover:not(:disabled) {
  background: #1d4ed8;
}

.panel-send:active:not(:disabled) {
  transform: scale(0.97);
}

.panel-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 面板显隐过渡 */
.chat-panel-enter-active,
.chat-panel-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.chat-panel-enter-from,
.chat-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

/* ============ 响应式 ============ */
@media (max-width: 480px) {
  .chat-widget {
    right: 16px;
    bottom: 16px;
  }

  .chat-fab {
    width: 52px;
    height: 52px;
  }

  .fab-icon {
    width: 24px;
    height: 24px;
  }
}
</style>
