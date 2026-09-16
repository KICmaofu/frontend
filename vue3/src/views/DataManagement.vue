<template>
  <div class="data-management">
    <!-- 主卡片容器 -->
    <div class="main-card-container card">
      <!-- 切换按钮 -->
      <div class="main-card-tabs">
        <button 
          class="main-tab-btn" 
          :class="{ 'active': activeMainCard === 'chart' }" 
          @click="switchMainCard('chart')"
        >
          温度数据报表
        </button>
        <!-- <button 
          class="main-tab-btn" 
          :class="{ 'active': activeMainCard === 'sensor' }" 
          @click="switchMainCard('sensor')"
        >
          传感器记录
        </button> -->
        <button 
          class="main-tab-btn" 
          :class="{ 'active': activeMainCard === 'alarm' }" 
          @click="switchMainCard('alarm')"
        >
          预警记录
        </button>
        <!-- <button
          class="main-tab-btn"
          :class="{ 'active': activeMainCard === 'report' }"
          @click="switchMainCard('report')"
        >
          风险报表
        </button> -->
      </div>
      <!-- 显示错误信息 -->
      <div v-if="errorMessage" class="error-message">
        <p>错误：{{ errorMessage }}</p>
      </div>
      
      <!-- 通知提示 -->
      <transition name="notification-fade">
        <div v-if="showNotificationFlag" :class="['notification', notificationType]">
          <span class="notification-icon">{{ getNotificationIcon(notificationType) }}</span>
          <span class="notification-message">{{ notificationMessage }}</span>
        </div>
      </transition>
      
      <!-- 加载状态指示器 -->
      <div v-if="isLoading" class="loading-indicator">
        <div class="loading-spinner"></div>
        <p>数据加载中，请稍候...</p>
      </div>
      
      <!-- 环境数据曲线卡片 -->
      <div class="card-content" v-show="activeMainCard === 'chart'">
        <div class="data-charts">
          <div class="chart-section">
            <h3>温度数据曲线</h3>
            <div class="chart-container" v-if="showChart">
              <Line :data="chartData" :options="chartOptions" />
            </div>
          </div>
          
          <div class="chart-section">
            <h3>湿度与可燃气体折线图</h3>
            <div class="chart-container" v-if="showChart">
              <Line :data="barChartData" :options="barChartOptions" />
            </div>
          </div>
        </div>
      </div>

      <!-- 传感器记录卡片 -->
      <div class="card-content" v-show="activeMainCard === 'sensor'"></div>
      <!-- 预警记录卡片 -->
      <div class="card-content" v-show="activeMainCard === 'alarm'">
        <div class="alarm-header">
          <h3>预警记录</h3>
          <button @click="updateLocalData" class="refresh-btn" title="刷新预警记录">
            🔄
          </button>
        </div>
        <div class="data-sequences">
          <table class="table">
            <thead>
              <tr>
                <th>设备名</th>
                <th>预警项</th>
                <th>预警级别</th>
                <th>预警值</th>
                <th>发生时间</th>
                <th>处理状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="alarm in alarms" :key="alarm.id">
                <td>{{ alarm.deviceName }}</td>
                <td>{{ alarm.alarmItem }}</td>
                <td>
                  <span :class="['alarm-level', alarm.level]">{{ alarm.levelText }}</span>
                </td>
                <td>{{ alarm.value }}</td>
                <td>{{ alarm.time }}</td>
                <td>
                  <span :class="['status-badge', alarm.status]">{{ alarm.statusText }}</span>
                </td>
                <td>
                  <button class="btn btn-small btn-primary" @click="viewAlarm(alarm)">详情</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 风险报表卡片 -->
      <div class="card-content" v-show="activeMainCard === 'report'"></div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'vue-chartjs';
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
// 定义 props
const props = defineProps({
  title: {
    type: String,
    default: '环境数据监控'
  },
  subtitle: {
    type: String,
    default: '监控和管理环境传感器数据'
  },
  initialCategory: {
    type: String,
    default: ''
  },
  autoRefresh: {
    type: Boolean,
    default: true
  },
  refreshInterval: {
    type: Number,
    default: 2000
  }
});
// 定义 emits
const emit = defineEmits(['data-loaded', 'category-selected', 'error']);
// 响应式数据
const startDate = ref('');
const endDate = ref('');
const currentDate = ref('');
const reportType = ref('daily');
const showChart = ref(true);
const reportGenerated = ref(false);
const showCategoryDropdown = ref(true);
const selectedCategory = ref(props.initialCategory);
const errorMessage = ref('');
const isLoading = ref(false);
const notificationMessage = ref(''); // 通知消息
const notificationType = ref('info'); // 通知类型：info, success, warning, error
const showNotificationFlag = ref(false); // 控制通知显示

// 数据日志相关
const dataLogs = ref([]);
const maxLogEntries = 50;
const logContainer = ref(null);
// 数据更新定时器
let refreshTimer = null;

// 连接状态持久化相关
const connectionId = ref('');
const lastConnectionTime = ref(0);
const connectionTimeout = 30 * 60 * 1000; // 30分钟连接超时
// 自动重连相关
const reconnectAttempts = ref(0);
// 图表实时数据（最多保留 20 个时间点）
const maxChartPoints = 20;
// 主卡片切换
const activeMainCard = ref('chart');
// 切换主卡片
const switchMainCard = (type) => {
  activeMainCard.value = type;
};
// 图表数据
const chartData = ref({
  labels: [],
  datasets: [
    {
      label: '温度',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderColor: 'rgba(255, 99, 132, 1)',
      data: [],
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgba(255, 99, 132, 1)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }
  ],
});

// 折线图数据
const barChartData = ref({
  labels: [],
  datasets: [
    {
      label: '湿度',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 2,
      data: [],
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgba(75, 192, 192, 1)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    },
    {
      label: '可燃气体浓度',
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 2,
      data: [],
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgba(54, 162, 235, 1)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }
  ],
});

// 折线图配置
const barChartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    title: {
      display: false
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      min: 0,
      max: 2000,
      title: {
        display: true,
        text: '数值'
      }
    },
    x: {
      title: {
        display: true,
        text: '时间'
      }
    }
  },
  animation: {
    duration: 1000, // 动画持续时间
    easing: 'easeInOutQuart', // 缓动函数
    animateScale: true, // 启用缩放动画
    animateRotate: true, // 启用旋转动画
    onComplete: function() {
      // 动画完成后的回调
    }
  }
});
// 优化后的图表配置
const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    title: {
      display: false
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: function(context) {
          return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
        }
      }
    }
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: '时间',
        font: {
          size: 12,
          weight: 'bold'
        }
      },
      ticks: {
        maxRotation: 45,
        minRotation: 45,
        autoSkip: true,
        maxTicksLimit: 10,
        font: {
          size: 11
        }
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)'
      }
    },
    y: {
      beginAtZero: false,
      min: 0,
      max: 50,
      title: {
        display: true,
        text: '温度 (°C) / 湿度 (%)',
        font: {
          size: 12,
          weight: 'bold'
        }
      },
      ticks: {
        stepSize: 5,
        font: {
          size: 11
        }
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)'
      }
    }
  }
});
// 报表数据
const reportTitle = ref('每日风险报告');
const highRiskPoints = ref([]);
// 传感器记录数据
const sensors = ref([]);
// 预警记录数据
const alarms = ref([]);
// 格式化日期
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// 格式化时间（时分秒）
const formatTime = (date) => {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${hour}:${minute}:${second}`;
};
// 获取通知图标
const getNotificationIcon = (type) => {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  return icons[type] || icons.info;
};

// 加载连接状态
const loadConnectionState = () => {
  try {
    const storedState = localStorage.getItem('connectionState');
    if (storedState) {
      const state = JSON.parse(storedState);
      connectionId.value = state.connectionId || '';
      lastConnectionTime.value = state.lastConnectionTime || 0;
    }
  } catch (error) {
    console.error('加载连接状态失败:', error);
  }
};

// 保存连接状态
const saveConnectionState = () => {
  try {
    const state = {
      connectionId: connectionId.value,
      lastConnectionTime: lastConnectionTime.value
    };
    localStorage.setItem('connectionState', JSON.stringify(state));
  } catch (error) {
    console.error('保存连接状态失败:', error);
  }
};

// 检查连接是否有效
const checkConnectionValidity = () => {
  const now = Date.now();
  return connectionId.value && (now - lastConnectionTime.value) < connectionTimeout;
};

// 监听 selectedCategory 变化
watch(selectedCategory, (newVal) => {
  emit('category-selected', newVal);
});
// 监听 reportType 变化
watch(reportType, (newVal) => {
  updateReportTitle();
});
// 获取报表类型名称
const getReportTypeName = () => {
  const reportTypes = {
    daily: '日报',
    weekly: '周报',
    monthly: '月报'
  };
  return reportTypes[reportType.value] || '报表';
};

// 更新报表标题
const updateReportTitle = () => {
  reportTitle.value = `${getReportTypeName()} - ${currentDate.value}`;
};
// 点击外部关闭菜单
const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.category-dropdown');
  if (dropdown && !dropdown.contains(event.target)) {
    showCategoryDropdown.value = false;
  }
};
// 键盘事件处理
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    showCategoryDropdown.value = false;
  }
};
// 生成报表
const generateReport = async () => {
  try {
    isLoading.value = true;
    reportTitle.value = `${getReportTypeName()} - ${currentDate.value}`;
    
    // 从图表数据中提取风险点
    const riskPoints = extractRiskPointsFromChartData();
    highRiskPoints.value = riskPoints;
    reportGenerated.value = true;
    
  } catch (error) {
    console.error('生成报表失败:', error);
    errorMessage.value = '生成报表失败，请检查数据';
  } finally {
    isLoading.value = false;
  }
};

// 从图表数据中提取风险点
const extractRiskPointsFromChartData = () => {
  const riskPoints = [];
  const now = new Date();
  const currentTime = now.toLocaleString('zh-CN');
  
  // 风险阈值
  const thresholds = {
    temperature: {
      high: 35,  // 高温阈值
      low: 0     // 低温阈值
    },
    humidity: {
      high: 80,  // 高湿度阈值
      low: 20    // 低湿度阈值
    },
    gas: {
      high: 1000 // 高烟雾浓度阈值
    }
  };
  
  // 检查温度数据
  if (chartData.value.labels.length > 0 && chartData.value.datasets[0].data.length > 0) {
    const tempData = chartData.value.datasets[0].data;
    const labels = chartData.value.labels;
    
    tempData.forEach((temp, index) => {
      if (temp > thresholds.temperature.high) {
        riskPoints.push({
          device: '温度传感器',
          location: '环境监测区域',
          risk: '温度过高',
          level: '高',
          time: labels[index] || currentTime
        });
      } else if (temp < thresholds.temperature.low) {
        riskPoints.push({
          device: '温度传感器',
          location: '环境监测区域',
          risk: '温度过低',
          level: '中',
          time: labels[index] || currentTime
        });
      }
    });
  }
  
  // 检查湿度数据
  if (barChartData.value.datasets[0] && barChartData.value.datasets[0].data.length > 0) {
    const humidityData = barChartData.value.datasets[0].data;
    const labels = barChartData.value.labels;
    
    humidityData.forEach((humidity, index) => {
      if (humidity > thresholds.humidity.high) {
        riskPoints.push({
          device: '湿度传感器',
          location: '环境监测区域',
          risk: '湿度过高',
          level: '中',
          time: labels[index] || currentTime
        });
      } else if (humidity < thresholds.humidity.low) {
        riskPoints.push({
          device: '湿度传感器',
          location: '环境监测区域',
          risk: '湿度过低',
          level: '低',
          time: labels[index] || currentTime
        });
      }
    });
  }
  
  // 检查烟雾浓度数据
  if (barChartData.value.datasets[1] && barChartData.value.datasets[1].data.length > 0) {
    const gasData = barChartData.value.datasets[1].data;
    const labels = barChartData.value.labels;
    
    gasData.forEach((gas, index) => {
      if (gas > thresholds.gas.high) {
        riskPoints.push({
          device: '可燃气体传感器',
          location: '环境监测区域',
          risk: '可燃气体浓度过高',
          level: '高',
          time: labels[index] || currentTime
        });
      }
    });
  }
  
  // 从本地存储中读取预警信息
  try {
    const alerts = JSON.parse(localStorage.getItem('alerts') || '[]');
    if (alerts.length > 0) {
      // 转换预警信息为风险点格式
      alerts.forEach(alert => {
        riskPoints.push({
          device: alert.device,
          location: alert.location,
          risk: alert.risk,
          level: alert.level,
          time: alert.time
        });
      });
    }
  } catch (error) {
    console.error('❌ 读取预警信息失败:', error);
  }
  
  // 按时间排序，最近的风险点排在前面
  riskPoints.sort((a, b) => {
    return new Date(b.time) - new Date(a.time);
  });
  
  // 限制风险点数量，只显示前10个
  return riskPoints.slice(0, 10);
};

// 显示通知
const showNotification = (message, type = 'info') => {
  notificationMessage.value = message;
  notificationType.value = type;
  showNotificationFlag.value = true;
  
  // 3 秒后自动关闭
  setTimeout(() => {
    showNotificationFlag.value = false;
  }, 3000);
};

const viewSensor = (sensor) => {
  // 跳转到传感器详情页面
  router.push({
    path: '/DeviceManagement',
    query: { id: sensor.id, action: 'view' }
  });
};
const editSensor = (sensor) => {
  // 跳转到传感器编辑页面
  router.push({
    path: '/DeviceManagement',
    query: { id: sensor.id, action: 'edit' }
  });
};
const viewAlarm = (alarm) => {
  // 跳转到预警详情页面
  router.push({
    path: '/MessageCenter',
    query: { id: alarm.id, type: 'alarm' }
  });
};
// 添加数据日志
const addDataLog = (time, temperature, humidity) => {
  dataLogs.value.push({
    time,
    temperature,
    humidity
  });
  
  // 保持日志数量
  if (dataLogs.value.length > maxLogEntries) {
    dataLogs.value.shift();
  }
  
  // 滚动到底部
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
};


// 组件挂载
// 温度数据（接口层已移除，使用空状态兜底）
const fetchEnvironmentData = async () => {
  errorMessage.value = '';

  // 更新连接时间和 ID
  lastConnectionTime.value = Date.now();
  if (!connectionId.value) {
    connectionId.value = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 保存连接状态
  saveConnectionState();

  // 图表使用空数据兜底
  updateChartDataFromHistory({ labels: [], temperatures: [], humidities: [], gasLevels: [] });
};

// 从温度历史数据更新图表
const updateChartDataFromHistory = (historyData) => {
  const { labels, temperatures, humidities, gasLevels } = historyData;
  
  // 克隆数据以避免响应式更新导致的问题
  const newLabels = [...labels];
  const newTempData = [...temperatures];
  
  // 确保湿度和烟雾浓度数据存在且长度与温度数据一致
  const newHumidityData = humidities && humidities.length > 0 
    ? humidities.map(hum => parseFloat(hum)) 
    : newTempData.map(() => 50); // 默认湿度50%
  
  const newGasData = gasLevels && gasLevels.length > 0 
    ? gasLevels.map(gas => parseFloat(gas)) 
    : newTempData.map(() => 800); // 默认烟雾浓度800
  
  // 保持数据点数量
  if (newLabels.length > maxChartPoints) {
    const excess = newLabels.length - maxChartPoints;
    newLabels.splice(0, excess);
    newTempData.splice(0, excess);
    newHumidityData.splice(0, excess);
    newGasData.splice(0, excess);
  }
  
  // 一次性更新图表数据
  chartData.value = {
    ...chartData.value,
    labels: newLabels,
    datasets: [
      { ...chartData.value.datasets[0], data: newTempData }
    ]
  };
  
  // 更新柱状图数据
  barChartData.value = {
    ...barChartData.value,
    labels: newLabels,
    datasets: [
      { ...barChartData.value.datasets[0], data: newHumidityData },
      { ...barChartData.value.datasets[1], data: newGasData }
    ]
  };
  
};

// 传感器数据（接口层已移除，使用空状态兜底）
const fetchSensors = async () => {
  sensors.value = [];
};

// 风险报表数据（接口层已移除，使用空状态兜底）
const fetchReports = async () => {
  highRiskPoints.value = [];
  reportGenerated.value = false;
};

// 更新本地数据（刷新按钮）
const updateLocalData = async () => {
  try {
    showNotification('正在刷新数据...', 'info');
    
    // 重新获取所有数据
    await fetchEnvironmentData();
    await fetchSensors();
    await fetchReports();
    
    showNotification('数据已更新', 'success');
  } catch (error) {
    console.error('❌ 更新数据失败:', error);
    showNotification('更新数据失败', 'error');
  }
};

onMounted(async () => {
  // 检查身份验证
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    router.push('/login');
    return;
  }
  
  isLoading.value = true;
  
  try {
    // 加载连接状态
    loadConnectionState();
    
    // 检查连接是否有效
    if (checkConnectionValidity()) {
      // 复用现有连接，只更新数据
    } else {
      // 重新建立连接，从热成像数据源获取温度数据
      await fetchEnvironmentData();
    }
    
    // 加载传感器和风险报表数据
    await fetchSensors();
    // 从图表数据生成风险报表
    const riskPoints = extractRiskPointsFromChartData();
    highRiskPoints.value = riskPoints;
    reportGenerated.value = true;
    
    
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    startDate.value = formatDate(oneWeekAgo);
    endDate.value = formatDate(today);
    currentDate.value = formatDate(today);
    
    reportTitle.value = `每日风险报告 - ${currentDate.value}`;
    
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  } catch (error) {
    console.error('初始化数据失败:', error);
  } finally {
    isLoading.value = false;
  }
});

// 组件卸载
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);

  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<style scoped>
/* 页面容器 */
.data-management {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: var(--page-gutter);
  min-height: calc(100vh - 104px);
  box-sizing: border-box;
  overflow-x: hidden;
  position: relative;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
  overflow: visible;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 20px;
  overflow: visible;
  position: relative;
}

.header-content .page-title {
  color: #1e293b;
  margin-top: 0;
  margin-bottom: 5px;
  font-size: 1.8rem;
  font-weight: 600;
}

.header-content .subtitle {
  color: #64748b;
  margin-top: 0;
  font-size: 1rem;
}

/* 主卡片容器 - 允许滚动 */
.main-card-container {
  padding: 0;
  overflow: visible;  /* 允许滚动 */
  height: auto;
  display: flex;
  flex-direction: column;
}

/* 主卡片切换按钮 */
.main-card-tabs {
  display: flex;
  gap: 5px;
  padding: clamp(10px, 1.5vw, 20px) clamp(10px, 1.5vw, 20px) 0;
  border-bottom: 1px solid #eee;
  background: #fafbfc;
  flex-wrap: wrap;
}

.main-tab-btn {
  padding: clamp(8px, 1vw, 12px) clamp(14px, 2vw, 28px);
  border: none;
  background: #e2e8f0;
  color: #64748b;
  font-size: clamp(13px, 1.1vw, 15px);
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.main-tab-btn:hover {
  color: #1e293b;
  background: #e2e8f0;
}

.main-tab-btn.active {
  color: #2563eb;
  background: white;
  border-bottom: 2px solid #2563eb;
  margin-bottom: -1px;
}

/* 卡片内容区域 */
.card-content {
  padding: clamp(12px, 1.8vw, 20px);
  animation: fadeIn 0.3s ease;
  flex: 1;
  overflow: visible;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 图表区域 */
.data-charts {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(12px, 1.5vw, 20px);
  margin-bottom: 20px;
  padding: 0;
  height: auto;
}

.chart-section {
  display: flex;
  flex-direction: column;
  min-width: 0; /* 防止 canvas 撑破网格 */
  height: auto;
  min-height: 360px;
}

.chart-section h3 {
  margin-bottom: 15px;
  color: #1e293b;
  font-size: 1.2rem;
  font-weight: 600;
}

.chart-container {
  flex: 1;
  min-height: clamp(260px, 32vw, 340px);
  margin-top: 10px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px;
}

/* 表格容器：窄屏时在容器内横向滚动，不撑破页面 */
.data-sequences {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  height: 100%;
}

.table {
  width: 100%;
  min-width: 680px; /* 窄屏时由外层 .data-sequences 横向滚动 */
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.table th {
  background-color: #f8fafc;
  font-weight: 600;
  white-space: nowrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-weight: 500;
  color: #334155;
}

.status-indicator {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}

.status-indicator.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-indicator.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.status-indicator.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.status-text {
  color: #64748b;
  font-size: 0.8rem;
}

/* 加载状态样式 */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-indicator p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

/* 错误信息样式 */
.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  margin: 20px;
  text-align: center;
}

.error-message p {
  margin: 0;
  font-size: 14px;
}

/* 通知提示样式 */
.notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  animation: slideDown 0.3s ease;
}

.notification.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.notification.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.notification.warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.notification.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.notification-icon {
  font-size: 16px;
}

.notification-message {
  margin: 0;
}

.notification-fade-enter-active,
.notification-fade-leave-active {
  transition: all 0.3s ease;
}

.notification-fade-enter-from,
.notification-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.sensor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sensor-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.sensor-header .refresh-btn,
.report-header .refresh-btn {
  padding: 8px 12px;
  background: #2563eb;
  border: 1px solid #2563eb;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.sensor-header .refresh-btn:hover,
.report-header .refresh-btn:hover {
  transform: rotate(180deg);
  background: #1d4ed8;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}

.alarm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.alarm-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.alarm-header .refresh-btn {
  padding: 8px 12px;
  background: #2563eb;
  border: 1px solid #2563eb;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.alarm-header .refresh-btn:hover {
  transform: rotate(180deg);
  background: #1d4ed8;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}


.log-container {
  height: 150px;
  overflow: hidden;  /* 禁用滚动 */
  padding: 10px;
}

.log-entry {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.8rem;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: #64748b;
  font-weight: 500;
  min-width: 80px;
}

.log-temp {
  color: #e74c3c;
  font-weight: 600;
  min-width: 100px;
}

.log-humidity {
  color: #3498db;
  font-weight: 600;
  min-width: 100px;
}

/* 报表头部样式 */
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.report-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.2rem;
  font-weight: 600;
}

.report-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 表格区域 */
.data-sequences {
  padding: 0;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0;
}

.table th, .table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.table th {
  background-color: #f8fafc;
  font-weight: 600;
  color: #475569;
}

.high-value {
  color: #e74c3c;
  font-weight: bold;
}

/* 按钮样式 */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.85rem;
  margin-right: 5px;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: #64748b;
  color: white;
}

.btn-secondary:hover {
  background: #475569;
}

/* 报表样式 */
.report-content h4 {
  color: #333;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.1rem;
}

.report-header select {
  color: #64748b;
  font-size: 0.9rem;
  background: #f8fafc;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #eee;
  cursor: pointer;
  outline: none;
}

.stat-card {
  background: #f8fafc;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.stat-card h5 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #2563eb;
  font-size: 1rem;
  font-weight: 600;
}

.stat-card ul {
  padding-left: 0;
  margin: 8px 0;
}

.stat-card li {
  list-style: none;
  padding: 8px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}

.risk-level {
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.risk-level.high {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

.risk-level.medium {
  background: rgba(243, 156, 18, 0.2);
  color: #f39c12;
}

.risk-level.low {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
}

.generate-report-section {
  padding: 20px;
  text-align: center;
  background: #f8fafc;
  border-radius: 8px;
}

.report-type-selector {
  margin-bottom: 15px;
}

.report-type-selector label {
  margin-right: 10px;
  font-weight: 500;
  color: #1e293b;
}

.report-type-selector select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

/* 预警级别样式 */
.alarm-level {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.alarm-level.high {
  background: rgba(243, 156, 18, 0.2);
  color: #f39c12;
}

.alarm-level.critical {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

.alarm-level.low {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
}

/* 状态徽章 */
.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  display: inline-block;
}

.status-badge.pending {
  background: rgba(243, 156, 18, 0.2);
  color: #f39c12;
}

.status-badge.handling {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
}

.status-badge.handled {
  background: rgba(46, 204, 113, 0.2);
  color: #27ae60;
}

/* ========================================
   响应式设计（断点：1024 / 768 / 640 / 480）
   ======================================== */

/* 平板及以下：两个图表上下排列 */
@media (max-width: 1024px) {
  .data-charts {
    grid-template-columns: minmax(0, 1fr);
  }

  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}

/* 手机横屏 / 小平板：收紧间距与表格字号，生成报表区纵向排列 */
@media (max-width: 768px) {
  .main-card-container {
    height: auto;
    overflow: visible;
  }

  .table th,
  .table td {
    padding: 8px 10px;
    font-size: 13px;
  }

  .chart-section {
    min-height: 0;
  }

  .generate-report-section {
    padding: 14px;
  }

  .sensor-header,
  .alarm-header {
    margin-bottom: 12px;
  }
}

/* 窄手机：标签页改为纵向全宽，操作更易点击 */
@media (max-width: 640px) {
  .main-card-tabs {
    flex-direction: column;
    gap: 5px;
  }

  .main-tab-btn {
    width: 100%;
    justify-content: center;
    border-radius: 8px;
    margin-bottom: 0;
  }

  .main-tab-btn.active {
    border-bottom: none;
    border-left: 3px solid #2563eb;
  }

  .stat-card li {
    gap: 6px;
  }
}

/* 超窄屏：进一步压缩字号与内边距 */
@media (max-width: 480px) {
  .card-content {
    padding: 10px;
  }

  .chart-container {
    padding: 6px;
  }

  .table th,
  .table td {
    padding: 6px 8px;
    font-size: 12px;
  }

  .btn-small {
    padding: 4px 8px;
    font-size: 11px;
  }
}
</style>