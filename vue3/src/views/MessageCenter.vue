<template>
  <div class="message-center">
    <div class="message-layout">
      <!-- 顶部导航栏（包含所有过滤和操作） -->
      <div class="navigation-bar card">
        <div class="nav-tabs">
          <button
            :class="['nav-btn', { active: activeTab === 'all' && !activeCategory }]"
            @click="setTabAll"
          >
            全部消息
          </button>
          <button
            :class="['nav-btn', { active: activeTab === 'unread' && !activeCategory }]"
            @click="setTabUnread"
          >
            未读消息
          </button>
          <button
            :class="['nav-btn', { active: activeTab === 'alerts' && !activeCategory }]"
            @click="setTabAlerts"
          >
            已读消息
          </button>
        </div>
      </div>

      <!-- 中间消息列表（带滚动条） -->
      <div class="message-content card">
        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-state">
          <p>加载中...</p>
        </div>
        
        <!-- 错误信息 -->
        <div v-else-if="errorMessage" class="error-state">
          <p>{{ errorMessage }}</p>
          <button class="btn btn-secondary" @click="errorMessage = ''">重试</button>
        </div>
        
        <!-- 消息列表 -->
        <div v-else class="messages-list">
          <div
            v-for="message in filteredMessages"
            :key="message.id"
            :class="[
              'message-item',
              { unread: message.unread },
              message.level || '',
            ]"
          >
            <div class="message-header">
              <div class="message-type-icon" :class="message.type">
                <i>{{ getTypeIcon(message.type) }}</i>
              </div>
              <h4 class="message-title">{{ message.title }}</h4>
              <span class="message-time">{{ message.time }}</span>
              <span
                v-if="message.level"
                class="level-badge"
                :class="message.level"
              >
                {{ getLevelText(message.level) }}
              </span>
              <button
                v-if="message.unread"
                class="mark-read-btn"
                @click="markAsRead(message)"
              >
                标记已读
              </button>
            </div>
            <div class="message-content-body">
              <p>{{ message.content }}</p>
            </div>
            <div class="message-actions">
              <button
                v-if="message.isAlert"
                class="btn btn-small"
                @click="showEvidenceModal(message)"
              >
                查看证据链
              </button>
              <button
                v-if="message.isAlert"
                :class="[
                  'btn',
                  'btn-small',
                  message.processed ? 'btn-secondary' : 'btn-warning',
                ]"
                @click="toggleProcessed(message)"
              >
                {{ message.processed ? "已处理" : "标记处理" }}
              </button>
              <button class="btn btn-small btn-secondary">稍后处理</button>
            </div>
          </div>

          <div v-if="filteredMessages.length === 0" class="no-messages">
            <p>暂无消息</p>
          </div>
        </div>
      </div>

    </div>

    <!-- 预警证据链模态框 -->
    <div v-if="showEvidence" class="modal-overlay" @click="closeEvidenceModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>预警证据链</h3>
          <button class="close-btn" @click="closeEvidenceModal">×</button>
        </div>
        <div class="evidence-content">
          <div class="evidence-row">
            <div class="evidence-section evidence-section-thermal">
              <h4>热成像温度图</h4>
              <div class="thermal-image">
                <div class="heatmap-simulation">
                  <div
                    v-for="(row, rowIndex) in currentEvidence.maxTemp"
                    :key="'row' + rowIndex"
                    class="thermal-row"
                  >
                    <div
                      v-for="(cell, cellIndex) in row"
                      :key="'cell' + cellIndex"
                      class="thermal-cell"
                      :style="{ backgroundColor: getThermalColor(cell.temp) }"
                      :title="`温度: ${cell.temp}°C`"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="evidence-section evidence-section-radar">
              <h4>雷达人体检测状态</h4>
              <div class="radar-log">
                <p>
                  <strong>时间:</strong> {{ currentEvidence.radarLog.timestamp }}
                </p>
                <p>
                  <strong>状态:</strong>
                  <span
                    :class="[
                      'status',
                      currentEvidence.radarLog.presence ? 'present' : 'absent',
                    ]"
                  >
                    {{
                      currentEvidence.radarLog.presence
                        ? "检测到人员"
                        : "未检测到人员"
                    }}
                  </span>
                </p>
                <p><strong>区域:</strong> {{ currentEvidence.radarLog.area }}</p>
              </div>
            </div>
          </div>

          <div class="processing-section">
            <h4>处理记录</h4>
            <div v-if="currentMessage && currentMessage.processRecord">
              <p>
                <strong>处理人:</strong>
                {{ currentMessage.processRecord.processor }}
              </p>
              <p>
                <strong>处理时间:</strong>
                {{ currentMessage.processRecord.processTime }}
              </p>
              <p>
                <strong>处理说明:</strong>
                {{ currentMessage.processRecord.description }}
              </p>
            </div>
            <div v-else>
              <p>尚未处理</p>
            </div>
          </div>
        </div>

        <div class="modal-footer" v-if="currentMessage && !currentMessage.processed">
          <textarea
            v-model="processDescription"
            placeholder="请输入处理说明..."
            class="process-input"
          ></textarea>
          <button class="btn btn-primary" @click="recordProcess">
            确认处理
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from 'vue-router';

const router = useRouter();

// 响应式状态
const activeTab = ref("all");
const activeCategory = ref(null);
const showEvidence = ref(false);
const currentMessage = ref(null);
const currentEvidence = ref({});
const processDescription = ref("");

// 加载状态
const isLoading = ref(false);
const errorMessage = ref("");

// 消息数据（模拟数据已移除，默认为空）
const messages = ref([]);

// 组件挂载时初始化数据
// 从本地存储获取消息数据
const fetchMessages = async () => {
  try {
    // 从本地存储获取消息数据
    const data = JSON.parse(localStorage.getItem('messages') || '[]');
    // 确保messages.value始终是一个数组
    if (Array.isArray(data)) {
      messages.value = data;
    } else {
      messages.value = [];
    }
  } catch (error) {
    console.error('获取消息数据失败:', error);
    // 发生错误时，确保messages.value是一个数组
    messages.value = [];
  }
};

onMounted(async () => {
  // 检查身份验证
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    router.push('/login');
    return;
  }

  // 从本地存储获取消息数据
  await fetchMessages();

  // 初始化本地数据
});

// 过滤后的消息列表
const filteredMessages = computed(() => {
  let filtered = [...messages.value];

  if (activeTab.value === "unread") {
    filtered = filtered.filter((m) => m.unread);
  } else if (activeTab.value === "alerts") {
    filtered = filtered.filter((m) => m.type === "alert");
  }

  if (activeCategory.value !== null) {
    filtered = filtered.filter((m) => m.category === activeCategory.value);
  }

  return filtered;
});

// 级别文本
const getLevelText = (level) => {
  const map = { red: "红色预警", orange: "橙色预警", yellow: "黄色预警", blue: "蓝色预警" };
  return map[level] || "";
};

// 标记消息为已读
const markAsRead = (message) => {
  message.unread = false;
};

// 批量标记当前过滤列表中的所有消息为已读
const markAllAsRead = () => {
  const unreadMessages = filteredMessages.value.filter(msg => msg.unread);
  if (unreadMessages.length === 0) return;
  
  unreadMessages.forEach(msg => {
    msg.unread = false;
  });
  
};

// 获取类型图标
const getTypeIcon = (type) => {
  const map = {
    alert: "⚠️",
    notification: "📢",
    system: "⚙️",
    info: "ℹ️",
  };
  return map[type] || "✉️";
};

// 设置标签页并清除分类
const setTabAll = () => {
  activeTab.value = "all";
  activeCategory.value = null;
};
const setTabUnread = () => {
  activeTab.value = "unread";
  activeCategory.value = null;
};
const setTabAlerts = () => {
  activeTab.value = "alerts";
  activeCategory.value = null;
};

// 彻底清除所有消息
const clearAllMessages = () => {
  if (confirm("确定要彻底清除所有消息吗？此操作不可恢复。")) {
    // 清空所有消息
    messages.value = [];
    // 同时清空本地存储中的消息
    localStorage.setItem('messages', JSON.stringify([]));
  }
};

// 生成8x8热成像数据
const generateMaxTemp8x8 = () => {
  const rows = 8;
  const cols = 8;
  const data = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      let baseTemp = 20 + Math.random() * 15;
      const centerDist = Math.abs(i - 3.5) + Math.abs(j - 3.5);
      if (centerDist < 4) {
        baseTemp += (4 - centerDist) * 15 + Math.random() * 20;
      }
      const temp = Math.min(120, Math.round(baseTemp));
      row.push({ temp });
    }
    data.push(row);
  }
  return data;
};

// 显示证据链模态框
const showEvidenceModal = (message) => {
  currentMessage.value = message;
  currentEvidence.value = {
    maxTemp: generateMaxTemp8x8(),
    radarLog: {
      timestamp: message.time,
      presence: message.level === "orange" ? false : true,
      area: message.content.includes("B栋") ? "B栋3楼" : "C栋2楼",
    },
  };
  showEvidence.value = true;
};

// 关闭证据链模态框
const closeEvidenceModal = () => {
  showEvidence.value = false;
  currentMessage.value = null;
  currentEvidence.value = {};
  processDescription.value = "";
};

// 根据温度获取颜色
const getThermalColor = (temp) => {
  if (temp < 30) return "rgba(33, 150, 243, 0.6)";
  if (temp <= 60) return "rgba(33, 150, 243, 0.8)";
  if (temp <= 70) return "rgba(255, 193, 7, 0.6)";
  if (temp <= 90) return "rgba(255, 152, 0, 0.7)";
  return "rgba(244, 67, 54, 0.6)";
};

// 切换处理状态（未处理时打开模态框）
const toggleProcessed = async (message) => {
  if (!message.processed) {
    await showEvidenceModal(message);
  }
};

// 记录处理
const recordProcess = () => {
  if (!processDescription.value.trim()) {
    alert("请输入处理说明");
    return;
  }

  // 直接更新本地消息状态
  currentMessage.value.processed = true;
  currentMessage.value.processRecord = {
    processor: "当前用户",
    processTime: new Date().toLocaleString(),
    description: processDescription.value,
  };

  closeEvidenceModal();
};
</script>

<style scoped>
.message-center {
  padding: 0 var(--page-gutter);
  width: 100%;
  margin: 0;
  min-height: calc(100vh - 104px);
  box-sizing: border-box;
}

.message-layout {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
  gap: 0;
  align-items: start;
  min-height: calc(100vh - 104px);
}

/* 导航栏跨越两列 */
.navigation-bar {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-radius: 0;
  gap: 15px;
  box-sizing: border-box;
}

.nav-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 导航按钮样式：参照 .main-tab-btn */
.nav-btn {
  padding: 12px 28px;
  border: none;
  background: #e2e8f0;
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.nav-btn:hover {
  color: #1e293b;
  background: #e2e8f0;
}

.nav-btn.active {
  color: #2563eb;
  background: white;
  border-bottom: 2px solid #2563eb;
  margin-bottom: -2px; /* 使底部边框与下方内容紧贴 */
}

.nav-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* 左侧消息列表 */
.message-content {
  padding: 0 20px 20px 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 500px;
  height: calc(100vh - 174px);
  border-radius: 0;
  box-sizing: border-box;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-right: 4px;
}

/* 响应式布局 */
@media (max-width: 1024px) {
  .nav-btn {
    padding: 10px 20px;
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .message-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .message-content {
    height: calc(100vh - 400px);
  }

  .navigation-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .nav-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .nav-btn {
    padding: 8px 16px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .navigation-bar {
    padding: 10px;
  }
  
  .nav-tabs {
    gap: 4px;
  }
  
  .nav-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .message-content {
    padding: 0 10px 10px 10px;
    height: calc(100vh - 350px);
  }

  .message-item {
    padding: 15px;
  }
  
  .message-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .message-actions {
    flex-wrap: wrap;
    gap: 5px;
  }
}

/* 卡片通用样式，移除圆角 */
.card {
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-radius: 0;
}

.input-field {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 0;
  font-size: 14px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 0;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
  text-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-warning {
  background: #f39c12;
  color: white;
}

.btn-warning:hover {
  background: #e67e22;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.85rem;
}

.message-item {
  padding: 20px;
  border-radius: 0;
  border-left: 4px solid #e0e0e0;
  transition: all 0.3s ease;
}

.message-item:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.message-item.unread {
  border-left-color: #2563eb;
  background-color: rgba(52, 152, 219, 0.05);
}

.message-item.red {
  border-left-color: #e74c3c;
}

.message-item.orange {
  border-left-color: #f39c12;
}

.message-item.yellow {
  border-left-color: #f1c40f;
}

.message-item.blue {
  border-left-color: #2563eb;
}

.message-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 10px;
}

.message-type-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.message-type-icon.alert {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.message-type-icon.notification {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}

.message-type-icon.system {
  background: rgba(100, 116, 139, 0.12);
  color: #64748b;
}

.message-type-icon.info {
  background: rgba(52, 73, 94, 0.1);
  color: #34495e;
}

.message-title {
  flex: 1;
  margin: 0;
  color: #1e293b;
}

.message-time {
  color: #64748b;
  font-size: 0.9rem;
}

.level-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  color: white;
}

.level-badge.red {
  background: #e74c3c;
}

.level-badge.orange {
  background: #f39c12;
}

.level-badge.yellow {
  background: #f1c40f;
  color: #333;
}

.level-badge.blue {
  background: #2563eb;
}

.mark-read-btn {
  background: #e2e8f0;
  color: #475569;
  border: none;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.3s ease;
}

.mark-read-btn:hover {
  background: #dce2ea;
}

.message-content-body {
  margin-bottom: 15px;
}

.message-content-body p {
  color: #555;
  line-height: 1.6;
}

.message-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.no-messages {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}

/* 加载状态 */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #64748b;
  font-size: 16px;
}

/* 错误状态 */
.error-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #e74c3c;
  font-size: 16px;
  text-align: center;
  padding: 0 20px;
}

.error-state p {
  margin-bottom: 15px;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  border-radius: 0;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #777;
}

.evidence-content {
  padding: 18px 20px 20px 20px;
  overflow-y: auto;
}

.evidence-row {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
}

.evidence-row .evidence-section {
  margin-bottom: 0;
}

.evidence-section-thermal {
  flex: 0 0 auto;
}

.evidence-section-radar {
  flex: 1;
}

.evidence-section {
  margin-bottom: 25px;
}

.evidence-section h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #1e293b;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.thermal-image {
  background: #f8fafc;
  padding: 15px;
  border-radius: 0;
  margin-bottom: 0;
}

.heatmap-simulation {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.thermal-row {
  display: flex;
  gap: 2px;
}

.thermal-cell {
  width: 30px;
  height: 30px;
  border-radius: 0;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}

.thermal-cell:hover {
  transform: scale(1.2);
  z-index: 1;
}

.radar-log {
  background: #f8fafc;
  padding: 15px;
  border-radius: 0;
  height: 100%;
  box-sizing: border-box;
}

.radar-log .status.present {
  color: #27ae60;
  font-weight: bold;
}

.radar-log .status.absent {
  color: #e74c3c;
  font-weight: bold;
}

.processing-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.process-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 0;
  margin-bottom: 10px;
  resize: vertical;
  min-height: 80px;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

/* ========== 响应式设计增强 ========== */

/* 大屏幕 (1200px - 1399px) 移除 max-width 限制 */
@media (max-width: 1399px) {
  /* 仅调整按钮内边距，不再限制容器宽度 */
  .nav-btn {
    padding: 10px 22px;
    font-size: 14px;
  }
}

/* 中等屏幕 (992px - 1199px) */
@media (max-width: 1199px) {
  .nav-btn {
    padding: 8px 18px;
    font-size: 13px;
  }
  .message-content {
    height: 450px;
  }
}

/* 小屏幕 (768px - 991px) 改为单列布局 */
@media (max-width: 991px) {
  .message-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .message-content {
    height: auto;
    max-height: 450px;
  }
  .nav-tabs {
    justify-content: center;
  }
  .nav-btn {
    padding: 8px 16px;
    font-size: 13px;
  }
  .nav-actions {
    width: 100%;
    justify-content: center;
  }
}

/* 超小屏幕 (576px - 767px) */
@media (max-width: 767px) {
  .message-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .message-title {
    width: 100%;
  }
  .message-time {
    align-self: flex-end;
  }
  .message-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-small {
    width: 100%;
  }
  .evidence-row {
    flex-direction: column;
    gap: 15px;
  }
  .nav-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  .nav-actions .btn {
    padding: 6px 12px;
    font-size: 12px;
  }
}

/* 极小屏幕 (≤575px) */
@media (max-width: 575px) {
  .message-center {
    padding: 0 var(--page-gutter);
  }
  .navigation-bar {
    padding: 8px 10px;
  }
  .nav-btn {
    padding: 5px 10px;
    font-size: 11px;
    gap: 4px;
  }
  .message-item {
    padding: 15px;
  }
  .level-badge {
    padding: 2px 6px;
    font-size: 0.7rem;
  }
  .mark-read-btn {
    padding: 3px 6px;
    font-size: 0.7rem;
  }
  .modal-content {
    width: 95%;
  }
}
</style>