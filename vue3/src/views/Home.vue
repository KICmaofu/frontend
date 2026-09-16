<template>
    <!-- 整页容器 -->
    <div class="dashboard-container">
      <!-- 其他内容区域 -->
      <div class="content-grid">
        <!-- 左侧：数字孪生地图和机器人位置 -->
        <div class="map-section">
          <div class="map-header">
            <div class="map-title-group">
              <h3>热成像地图</h3>
              <div class="view-toggle-panel"> 
              </div>
            </div>
            <div class="robot-filter">
              <div class="dropdown-container">
           
                <div v-show="showDropdown" class="dropdown-menu">
                  <label v-for="robot in robots" :key="robot.id" class="dropdown-item">
                    <input 
                      type="checkbox" 
                      :value="robot.id" 
                      v-model="selectedRobots"
                    />
                    <span>{{ robot.id }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="map-container">
            <!-- 地图背景 -->
            <div class="map-background" v-if="!showVideoStream">
              <!-- AMG8833 热力图 -->
              <div class="heatmap-overlay" v-if="showThermalOverlay && thermalGrid.length > 0">
                <!-- 热力图 Canvas 渲染 -->
                <canvas 
                  ref="heatmapCanvas" 
                  class="heatmap-canvas"
                  :width="thermalGrid[0].length * 10"
                  :height="thermalGrid.length * 10"
                ></canvas>
              </div>
              <div class="heatmap-overlay" v-else-if="showThermalOverlay">
                <div class="no-data-message">
                  <p>热成像数据加载中...</p>
                </div>
              </div>
              
              <!-- 旧版热力点（可选显示） -->
              <div class="heatmap-overlay-old" v-if="!showThermalOverlay">
                <div 
                  class="heat-point"
                  v-for="(heatPoint, index) in heatPoints" 
                  :key="'heat-'+index"
                  :style="{ 
                    left: heatPoint.x + 'px', 
                    top: heatPoint.y + 'px',
                    backgroundColor: getHeatmapColor(heatPoint.temp),
                    width: heatPoint.radius + 'px',
                    height: heatPoint.radius + 'px'
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 右侧：数据概览和控制台 -->
        <div class="right-panel">
          <!-- 数据概览区域（缩小版） -->
          <div class="data-overview mini">
            <!-- 环境数据 -->
            <div class="data-section mini">
              <h4>环境监测</h4>
              <div class="environment-grid-row">
                <div class="env-item row-item">
                  <div class="env-label">热成像最高温度</div>
                  <div class="env-value">{{ environmentData.maxThermalTemp }}°C</div>
                </div>
                <div class="env-item row-item">
                  <div class="env-label">环境温度</div>
                  <div class="env-value">{{ environmentData.temperature }}°C</div>
                </div>
                <div class="env-item row-item">
                  <div class="env-label">环境湿度</div>
                  <div class="env-value">{{ environmentData.humidity }}%</div>
                </div>
                <div class="env-item row-item">
                  <div class="env-label">可燃气体浓度</div>
                  <div class="env-value">{{ environmentData.gas }}ppm</div>
                </div>
              </div>
            </div>

            <!-- 设备统计 -->
            <div class="data-section mini">
              <h4>设备统计</h4>
              <div class="stats-grid mini">
                <!-- 是否有人 -->
                <div class="stat-card mini">
                  <div class="stat-icon" :class="{
                    'bg-success mini': robotStats.humanDetected === true,
                    'bg-secondary mini': robotStats.humanDetected === false
                  }">
                    <i class="icon">{{ robotStats.humanDetected === true ? '' : '' }}</i>
                  </div>
                  <div class="stat-info mini">
                    <h3>人员检测</h3>
                    <p class="stat-number mini" :class="{
                      'text-success': robotStats.humanDetected === true,
                      'text-secondary': robotStats.humanDetected === false
                    }">
                      {{ robotStats.humanDetected === true ? '有人' : '无人' }}
                    </p>
                  </div>
                </div>
                
                <!-- 设备状态 -->
                <div class="stat-card mini">
                  <div class="stat-icon" :class="{
                    'bg-success mini': deviceStatus === 0,
                    'bg-warning mini': deviceStatus === 1,
                    'bg-danger mini': deviceStatus === 2
                  }">
                    <i class="icon"></i>
                  </div>
                  <div class="stat-info mini">
                    <h3>环境状态</h3>
                    <p class="stat-number mini" :class="{
                      'text-success': deviceStatus === 0,
                      'text-warning': deviceStatus === 1,
                      'text-danger': deviceStatus === 2
                    }">
                      {{ getDeviceStatusText(deviceStatus) }}
                    </p>
                  </div>
                </div>

                <div class="stat-card mini">
                  <div class="stat-icon bg-success mini">
                    <i class="icon"></i>
                  </div>
                  <div class="stat-info mini">
                    <h3>电量</h3>
                    <p class="stat-number mini">{{ environmentData.battery || 'N/A' }}%</p>
                    <p class="stat-change mini"></p>
                  </div>
                </div>
                
                <div class="stat-card mini">
                  <div class="stat-icon bg-primary mini">
                    <i class="icon"></i>
                  </div>
                  <div class="stat-info mini">
                    <h3>机器人数</h3>
                    <p class="stat-number mini">{{ robotStats.total }}个</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 温度趋势图 -->
          <div class="activity-section">
            <div class="chart-header">
              <h3>温度趋势图</h3>
            </div>
            <div class="chart-container">
              
              <!-- 加载状态 -->
              <div v-if="isLoading" class="chart-loading">
                <div class="loading-spinner"></div>
                <p>加载温度数据中...</p>
              </div>
              
              <!-- 错误信息 -->
              <div v-else-if="errorMessage" class="chart-error">
                <p>{{ errorMessage }}</p>
              </div>
              
              <!-- 图表 -->
              <canvas v-else id="temperatureChart" class="chart-canvas"></canvas>
            </div>
          </div>
        </div>
      </div>
    
    <!-- 设备状态弹窗 -->
    <transition name="alert-modal">
      <div v-if="showAlertModal" class="alert-modal" @click.self="closeAlertModal">
        <div class="alert-modal-content" @click.stop>
          <div class="alert-modal-header">
            <h3 v-if="fireRisk === 1">警告</h3>
            <h3 v-else-if="fireRisk === 2"> 危险</h3>
            <button @click="closeAlertModal" class="alert-modal-close">&times;</button>
          </div>
          <div class="alert-modal-body">
            <div class="alert-icon">
              <span v-if="fireRisk === 1"></span>
              <span v-else-if="fireRisk === 2"></span>
            </div>
            <p>{{ alertMessage }}</p>
            <div class="alert-details">
              <p><strong>设备状态：</strong>{{ getDeviceStatusText(deviceStatus) }}</p>
              <p><strong>预警时间：</strong>{{ new Date().toLocaleString('zh-CN') }}</p>
            </div>
          </div>
          <div class="alert-modal-footer">
            <button @click="ignoreAlert" class="btn btn-secondary">忽略</button>
            <button @click="viewAlertDetails" class="btn btn-info">查看详情</button>
            <button @click="closeAlertModal" class="btn btn-primary">确认</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Chart, registerables } from 'chart.js';

const router = useRouter();

// 注册 Chart.js 组件
Chart.register(...registerables);

// AMG8833 8x8 原始温度数据
const original_8x8 = ref([]);

// 双三次插值函数
const bicubicInterpolation = (srcData, scale) => {
  const srcHeight = srcData.length;
  const srcWidth = srcData[0].length;
  const dstHeight = srcHeight * scale;
  const dstWidth = srcWidth * scale;
  
  const dstData = new Array(dstHeight).fill(0).map(() => new Array(dstWidth).fill(0));
  
  // 辅助函数：获取像素值，处理边界情况
  const getCubicPixel = (data, x, y) => {
    const h = data.length;
    const w = data[0].length;
    
    // 边界处理：使用边缘值
    if (y < 0) y = 0;
    if (y >= h) y = h - 1;
    if (x < 0) x = 0;
    if (x >= w) x = w - 1;
    
    return data[y][x];
  };
  
  // 双三次插值主函数
  for (let dy = 0; dy < dstHeight; dy++) {
    for (let dx = 0; dx < dstWidth; dx++) {
      const srcX = dx / scale;
      const srcY = dy / scale;
      
      const x1 = Math.floor(srcX);
      const y1 = Math.floor(srcY);
      
      const u = srcX - x1;
      const v = srcY - y1;
      
      // 获取 4x4 邻域
      const pixels = [];
      for (let py = -1; py <= 2; py++) {
        const row = [];
        for (let px = -1; px <= 2; px++) {
          row.push(getCubicPixel(srcData, x1 + px, y1 + py));
        }
        pixels.push(row);
      }
      
      // 双三次插值计算
      const value = bicubicKernel(pixels, u, v);
      dstData[dy][dx] = parseFloat(value.toFixed(2));
    }
  }
  
  return dstData;
};

// 双三次插值核函数（优化版）
const bicubicKernel = (pixels, u, v) => {
  // 预计算权重值，避免重复计算
  const weights = [];
  for (let i = 0; i < 4; i++) {
    const vWeight = cubicCoeff(v - (i - 1));
    const rowWeights = [];
    for (let j = 0; j < 4; j++) {
      const uWeight = cubicCoeff(u - (j - 1));
      rowWeights.push(vWeight * uWeight);
    }
    weights.push(rowWeights);
  }
  
  let result = 0;
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result += pixels[i][j] * weights[i][j];
    }
  }
  
  return result;
};

// 三次样条插值系数计算函数
const cubicCoeff = (t) => {
  const absT = Math.abs(t);
  if (absT <= 1) {
    return 1.5 * absT * absT * absT - 2.5 * absT * absT + 1;
  } else if (absT <= 2) {
    return -0.5 * absT * absT * absT + 2.5 * absT * absT - 4 * absT + 2;
  }
  return 0;
};

// 机器人统计数据
const robotStats = ref({
  total: 0,
  change: 0,
  lowBatteryCount: 0,
  offline: 0,
  offlineChange: '0',
  humanDetected: false
});

// 环境数据
const environmentData = ref({
  temperature: 0,
  humidity: 0,
  gas: 0,
  pm25: 0,
  battery: 0,
  maxThermalTemp: 0 // 热成像最高温度
});

// 设备状态相关
const deviceStatus = ref(0); // 0: 正常, 1: 异常, 2: 危险
const fireRisk = ref(0); // 0: 无风险, 1: 警告, 2: 危险
const showAlertModal = ref(false); // 控制弹窗显示
const alertMessage = ref(''); // 弹窗消息内容

// 图表实例
const temperatureChart = ref(null);

// 加载状态
const isLoading = ref(false);

// 错误信息

// 设备状态相关方法
const getDeviceStatusText = (status) => {
  switch (status) {
    case 0: return '正常';
    case 1: return '异常';
    case 2: return '危险';
    default: return '未知';
  }
};

// 关闭弹窗
const closeAlertModal = () => {
  showAlertModal.value = false;
  alertMessage.value = '';
};

// 忽略预警
const ignoreAlert = () => {
  showAlertModal.value = false;
  alertMessage.value = '';
};

// 查看预警详情
const viewAlertDetails = () => {
  // 导航到预警详情页面
  router.push({
    path: '/message-center',
    query: {
      type: 'alarm',
      status: deviceStatus.value,
      risk: fireRisk.value,
      message: alertMessage.value
    }
  });
  
  showAlertModal.value = false;
  alertMessage.value = '';
};

const errorMessage = ref('');

// 机器人位置数据
const robots = ref([]);

// 选中的机器人 ID 列表（用于下拉多选）
const selectedRobots = ref([]);

// 计算属性：只显示选中的机器人
const visibleRobots = computed(() => {
  return robots.value.filter(robot => selectedRobots.value.includes(robot.id));
});

// 监听选中状态变化，同步更新机器人的 visible 属性
watch(selectedRobots, (newSelected) => {
  robots.value.forEach(robot => {
    robot.visible = newSelected.includes(robot.id);
  });
}, { deep: true });

// 热力点数据（用于旧版热力图）
const heatPoints = ref([]);

// AMG8833热成像数据相关
const showThermalOverlay = ref(true);  // 是否显示热力图叠加层
const gridSize = ref(32);  // 默认32x32网格
const thermalGrid = ref([]);  // 当前热成像网格数据
const heatmapCanvas = ref(null);  // 热力图 Canvas 引用

// 视频流数据
const videoStreamActive = ref(true);
const currentVideoFrame = ref(''); // 实际应用中会是视频帧的 URL 或 base64 数据
const showVideoStream = ref(false); // 控制是否显示视频流
const showDropdown = ref(false); // 控制下拉菜单显示
const localVideoStream = ref(null); // 本地摄像头视频流
const videoElement = ref(null); // 视频元素引用
const useLocalCamera = ref(true); // 默认使用本地摄像头

// 启动本地摄像头
const startLocalCamera = async () => {
  try {
    // 请求视频和音频权限
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: true
    });
    
    localVideoStream.value = stream;
    
    // 等待 DOM 更新后绑定到 video 元素
    setTimeout(() => {
      if (videoElement.value) {
        videoElement.value.srcObject = stream;
        videoElement.value.play();
        useLocalCamera.value = true;
      }
    }, 100);
  } catch (error) {
    console.error(' 无法访问本地摄像头:', error);
    useLocalCamera.value = false;
    videoStreamActive.value = false;
  }
};

// 停止本地摄像头
const stopLocalCamera = () => {
  if (localVideoStream.value) {
    const tracks = localVideoStream.value.getTracks();
    tracks.forEach(track => track.stop());
    localVideoStream.value = null;
  }
};

// 活动日志
const activityLogs = ref([]);

const getHeatmapColor = (temperature) => {
  // 根据温度值返回不同的颜色，符合风险热力图颜色编码规范
  if (temperature < 20) return 'rgba(33, 150, 243, 0.6)'; // 蓝色 - 低温
  if (temperature <= 30) return 'rgba(33, 150, 243, 0.8)'; // 浅蓝
  if (temperature <= 35) return 'rgba(255, 193, 7, 0.6)'; // 黄色 - 中温
  if (temperature <= 40) return 'rgba(255, 152, 0, 0.7)'; // 橙色
  return 'rgba(244, 67, 54, 0.6)'; // 红色 - 高温
};

// 新增：根据温度值获取热力图颜色（蓝-黄-红）
// 计算当前热力图数据的最小值和最大值
const getTempRange = () => {
  if (!thermalGrid.value || thermalGrid.value.length === 0) {
    return { min: 21, max: 100 };
  }
  
  // 展平二维数组并找出最小值和最大值
  const allTemps = thermalGrid.value.flat();
  const dynamicMin = Math.min(...allTemps);
  const dynamicMax = Math.max(...allTemps);
  
  let min, max;
  
  // 特殊情况处理：当动态最大值小于25时，使用动态最小值模式
  if (dynamicMax < 21) {
    min = dynamicMin;
    max = dynamicMax;
  } else {
    // 正常情况：最小值固定为25，最大值使用动态计算
    min = 21;
    max = dynamicMax;
   }
  
  // 避免 min 和 max 相等的情况
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  
  return { min, max };
};

// 根据温度值返回对应的颜色，只使用相对温度
const getThermalColor = (temp) => {
  // 使用动态计算的温度范围
  const { min: minTemp, max: maxTemp } = getTempRange();
  
  // 计算当前温度在动态范围内的相对位置 (0-1)
  const relativeRatio = Math.min(Math.max((temp - minTemp) / (maxTemp - minTemp), 0), 1);

  let r, g, b;
  if (relativeRatio < 0.25) {
    // 蓝色表示低温
    r = 0;
    g = 128;
    b = 255;
  } else if (relativeRatio < 0.4) {
    // 浅蓝色到黄色的过渡
    const t = (relativeRatio - 0.25) / 0.15;
    r = Math.floor(0 * (1 - t) + 255 * t);
    g = Math.floor(128 * (1 - t) + 255 * t);
    b = Math.floor(255 * (1 - t) + 0 * t);
  } else if (relativeRatio < 0.6) {
    // 黄色到橙色的过渡
    const t = (relativeRatio - 0.4) / 0.2;
    r = 255;
    g = Math.floor(255 * (1 - t) + 165 * t);
    b = 0;
  } else if (relativeRatio < 0.8) {
    // 橙色到红色的过渡
    const t = (relativeRatio - 0.6) / 0.2;
    r = 255;
    g = Math.floor(165 * (1 - t));
    b = 0;
  } else {
    // 深红色表示高温
    r = 255;
    g = 0;
    b = 0;
  }

  return `rgb(${r}, ${g}, ${b})`;
};

// 根据温度值计算透明度，只使用相对温度
const getOpacityByTemp = (temp) => {
  // 动态计算当前数据集的最小值和最大值
  const { min: minTemp, max: maxTemp } = getTempRange();
  
  // 计算当前温度在数据集中的相对位置 (0-1)
  const relativeRatio = Math.min(Math.max((temp - minTemp) / (maxTemp - minTemp), 0), 1);
  
  // 只使用相对温度计算透明度（温度越高，越不透明）
  const opacity = Math.min(Math.max(0.3 + relativeRatio * 0.7, 0.3), 1.0);
  
  return opacity;
};

// 使用 Canvas 渲染热力图
const renderHeatmap = () => {
  const canvas = heatmapCanvas.value;
  if (!canvas || thermalGrid.value.length === 0) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const gridWidth = thermalGrid.value[0].length;
  const gridHeight = thermalGrid.value.length;
  const cellWidth = width / gridWidth;
  const cellHeight = height / gridHeight;
  
  // 清空画布
  ctx.clearRect(0, 0, width, height);
  
  // 渲染每个格子
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const temp = thermalGrid.value[y][x];
      const color = getThermalColor(temp);
      const opacity = getOpacityByTemp(temp);
      
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
    }
  }
  
  // 重置透明度
  ctx.globalAlpha = 1;
};

// 从 API 获取环境数据
const fetchEnvironmentData = async () => {
  try {
    // 由于环境数据已经在fetchMaxTemp中从热成像数据提取，直接返回当前环境数据
    
    // 更新设备统计数据 - 电量
    if (environmentData.value.battery !== undefined) {
      robotStats.value.change = environmentData.value.battery;
    }
    
    return environmentData.value;
  } catch (error) {
    console.error('获取环境数据失败:', error);
    return null;
  }
};

// 机器人位置数据（接口层已移除，使用空状态兜底）
const fetchRobotPositions = async () => {
  robots.value = [];
  robotStats.value.offline = 0;
  robotStats.value.offlineChange = '0';
  return [];
};

// 热成像数据（接口层已移除，使用空状态兜底）
const fetchMaxTemp = async () => {
  original_8x8.value = [];
  thermalGrid.value = [];
  environmentData.value.maxThermalTemp = 0;
  return null;
};

// 温度历史数据（接口层已移除，返回空数据兜底）
const fetchTemperatureHistory = async () => {
  return { labels: [], data: [] };
};

// 初始化温度趋势图
let isInitializingChart = false;

const initTemperatureChart = async () => {
  // 避免并发初始化
  if (isInitializingChart) {
    return;
  }
  
  isInitializingChart = true;
  try {
    const ctx = document.getElementById('temperatureChart');
    if (ctx) {
      // 确保完全销毁旧的图表实例
      if (temperatureChart.value) {
        try {
          temperatureChart.value.destroy();
        } catch (destroyError) {
          console.warn(' 销毁图表实例时出错:', destroyError);
        }
        temperatureChart.value = null;
        // 等待足够的时间，确保销毁操作完成
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      let labels = [];
      let data = [];
      
      // 从后端获取温度历史数据
      const temperatureData = await fetchTemperatureHistory();
      
      if (temperatureData && temperatureData.labels && temperatureData.data) {
        labels = temperatureData.labels;
        data = temperatureData.data;
      } else {
        console.warn(' 未能获取温度历史数据，显示空图表');
        labels = [];
        data = [];
      }
      
      // 创建温度趋势图数据集
      const chartData = {
        labels: labels,
        datasets: [
          {
            label: '温度 (°C)',
            data: data,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.3)',
            borderWidth: 3,
            tension: 0.4,
            fill: false, // 不填充，因为有参考线
            pointBackgroundColor: (context) => {
              // 根据温度值设置点的颜色
              if (context.raw !== undefined) {
                const temp = context.raw;
                if (temp < 18) return 'rgba(54, 162, 235, 1)'; // 低温 - 蓝色
                if (temp > 24) return 'rgba(255, 99, 132, 1)'; // 高温 - 红色
                return 'rgba(75, 192, 192, 1)'; // 舒适 - 绿色
              }
              return 'rgba(75, 192, 192, 1)';
            },
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(75, 192, 192, 1)',
            pointHoverBorderWidth: 3
          },
          {
            label: '舒适温度上限',
            data: Array(labels.length).fill(24),
            borderColor: 'rgba(255, 99, 132, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
          },
          {
            label: '舒适温度下限',
            data: Array(labels.length).fill(18),
            borderColor: 'rgba(54, 162, 235, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
          }
        ]
      };
      
      // 再次检查temperatureChart.value是否为null，确保没有并发修改
      if (temperatureChart.value) {
        console.warn(' 图表实例仍然存在，尝试再次销毁');
        try {
          temperatureChart.value.destroy();
        } catch (destroyError) {
          console.warn(' 销毁图表实例时出错:', destroyError);
        }
        temperatureChart.value = null;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 尝试创建新的图表实例
      try {
        temperatureChart.value = new Chart(ctx, {
          type: 'line',
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false,
              axis: 'x'
            },
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  font: {
                    size: 12
                  },
                  usePointStyle: true,
                  padding: 20
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 4,
                callbacks: {
                  label: function(context) {
                    if (context.datasetIndex === 0) {
                      return `温度: ${context.parsed.y}°C`;
                    } else if (context.datasetIndex === 1) {
                      return `舒适温度上限: ${context.parsed.y}°C`;
                    } else if (context.datasetIndex === 2) {
                      return `舒适温度下限: ${context.parsed.y}°C`;
                    }
                    return context.dataset.label;
                  },
                  title: function(tooltipItems) {
                    return `时间: ${tooltipItems[0].label}`;
                  }
                }
              },
              zoom: {
                pan: {
                  enabled: true,
                  mode: 'x'
                },
                zoom: {
                  wheel: {
                    enabled: true
                  },
                  pinch: {
                    enabled: true
                  },
                  mode: 'x'
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
                    size: 14,
                    weight: 'bold'
                  }
                },
                ticks: {
                  maxRotation: 45,
                  minRotation: 45,
                  font: {
                    size: 11
                  },
                  stepSize: 3 // 每3小时显示一个标签
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.1)'
                }
              },
              y: {
                display: true,
                title: {
                  display: true,
                  text: '温度 (°C)',
                  font: {
                    size: 14,
                    weight: 'bold'
                  }
                },
                min: 0,
                max: 80,
                ticks: {
                  font: {
                    size: 11
                  },
                  stepSize: 10 // 每10°C显示一个标签
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.1)'
                },
                suggestedMin: 15, // 温度最小值
                suggestedMax: 30  // 温度最大值
              }
            },
            animation: {
              duration: 700,
              easing: 'easeOutQuart'
            },
            elements: {
              line: {
                tension: 0.4
              }
            }
          }
        });
      } catch (chartError) {
        console.error(' 创建图表实例失败:', chartError);
        // 如果创建失败，尝试清理Canvas
        if (ctx) {
          const parent = ctx.parentElement;
          if (parent) {
            // 保存Canvas的属性
            const canvasId = ctx.id;
            const canvasWidth = ctx.width;
            const canvasHeight = ctx.height;
            const canvasStyle = ctx.style.cssText;
            
            // 移除旧的Canvas
            parent.removeChild(ctx);
            
            // 创建新的Canvas
            const newCanvas = document.createElement('canvas');
            newCanvas.id = canvasId;
            newCanvas.width = canvasWidth;
            newCanvas.height = canvasHeight;
            newCanvas.style.cssText = canvasStyle;
            
            // 添加新的Canvas到父元素
            parent.appendChild(newCanvas);
            
            // 重新获取新的Canvas上下文
            const newCtx = newCanvas.getContext('2d');
            if (newCtx) {
              // 重新创建图表实例
              temperatureChart.value = new Chart(newCtx, {
                type: 'line',
                data: chartData,
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: {
                        font: {
                          size: 12
                        }
                      }
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                      callbacks: {
                        label: function(context) {
                          return `温度: ${context.parsed.y}°C`;
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
                          size: 12
                        }
                      },
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                          size: 10
                        }
                      }
                    },
                    y: {
                      display: true,
                      title: {
                        display: true,
                        text: '温度 (°C)',
                        font: {
                          size: 12
                        }
                      },
                      ticks: {
                        font: {
                          size: 10
                        }
                      }
                    }
                  },
                  animation: {
                    duration: 500
                  }
                }
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('初始化温度趋势图失败:', error);
  } finally {
    // 确保在函数结束时将isInitializingChart设置为false
    isInitializingChart = false;
  }
};

// ESC 键处理函数
const handleEscKey = (e) => {
  if (e.key === 'Escape' && showAlertModal.value) {
    closeAlertModal();
  }
};

onMounted(async () => {
  // 检查身份验证
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    router.push('/login');
    return;
  }
  
  // 初始化空状态数据（接口层已移除）
  fetchEnvironmentData();
  fetchRobotPositions();
  fetchMaxTemp();

  // 初始化温度趋势图
  await initTemperatureChart();

  // 添加 ESC 键监听
  document.addEventListener('keydown', handleEscKey);
});

onUnmounted(() => {
  // 移除 ESC 键监听
  document.removeEventListener('keydown', handleEscKey);

  // 停止本地摄像头
  stopLocalCamera();

  // 销毁图表实例
  if (temperatureChart.value) {
    temperatureChart.value.destroy();
    temperatureChart.value = null;
  }

});
</script>

<style scoped>
/* 预警弹窗过渡动画 */
.alert-modal-enter-active,
.alert-modal-leave-active {
  transition: all 0.3s ease;
}

.alert-modal-enter-from,
.alert-modal-leave-to {
  opacity: 0;
}

.alert-modal-enter-from .alert-modal-content,
.alert-modal-leave-to .alert-modal-content {
  transform: scale(0.9);
  opacity: 0;
}

.alert-modal-enter-to .alert-modal-content,
.alert-modal-leave-from .alert-modal-content {
  transform: scale(1);
  opacity: 1;
}

/* 设备状态弹窗样式 */
.alert-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.alert-modal-content {
  background-color: white;
  border-radius: 12px;
  padding: 25px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.alert-modal-header {
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 15px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-modal-header h3 {
  margin: 0;
  color: #000;
  font-size: 20px;
  font-weight: 600;
}

.alert-modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #000;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.alert-modal-close:hover {
  background-color: #f5f5f5;
  color: #000;
}

.alert-modal-body {
  margin-bottom: 20px;
}

.alert-icon {
  font-size: 48px;
  text-align: center;
  margin-bottom: 15px;
}

.alert-modal-body p {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: #000;
  text-align: center;
  margin-bottom: 15px;
}

.alert-details {
  background-color: #f8fafc;
  padding: 15px;
  border-radius: 8px;
  margin-top: 15px;
}

.alert-details p {
  margin: 8px 0;
  font-size: 14px;
  color: #000;
}

.alert-details strong {
  color: #000;
}

.alert-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.alert-modal-footer button {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-secondary {
  background-color: #64748b;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-info {
  background-color: #17a2b8 !important;
  color: white !important;
}

.btn-info:hover {
  background-color: #17a2b8 !important;
}

.btn-primary {
  background-color: #28a745 !important;
  color: white !important;
}

.btn-primary:hover {
  background-color: #28a745 !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .alert-modal-content {
    width: 95%;
    padding: 20px;
    max-width: none;
    height: 100%;
  }
  
  .alert-modal-header h3 {
    font-size: 18px;
  }
  
  .alert-icon {
    font-size: 40px;
  }
  
  .alert-modal-body p {
    font-size: 14px;
  }
  
  .alert-modal-footer {
    flex-direction: column;
  }
  
  .alert-modal-footer button {
    width: 100%;
    margin-bottom: 8px;
  }
}

/* 设备状态文本颜色 */
.text-success {
  color: #28a745 !important;
}

.text-warning {
  color: #ffc107 !important;
}

.text-danger {
  color: #dc3545 !important;
}

/* 全局样式 - 确保页面 100% 高度 */
.dashboard-container * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 整页布局样式 */
.dashboard-container {
  padding: 0;
  width: 100%;
  height: auto;
  margin: 0;
  background: var(--bg-page);
  overflow-x: hidden;
  overflow-y: visible;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.page-title {
  padding: 6px;
  margin-bottom: 2px;
  background: var(--surface);
  color: var(--text-1);
  text-align: center;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

/* 其他内容区域样式 - 紧凑，铺满整页（顶部 73px，底部留 12px 呼吸空间） */
.content-grid {
  width: 100%;
  height: calc(100vh - 104px);
  min-height: 520px;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: clamp(6px, 1vw, 12px);
  padding: clamp(10px, 2vw, 22px) clamp(8px, 1.5vw, 16px) 10px;
  box-sizing: border-box;
  flex: none;
  overflow: hidden;
}

.map-section, .video-section, .activity-section {
  width: 100%;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  box-sizing: border-box;
}

/* 数据概览区域 - 缩小版 */
.data-overview.mini {
  width: 100%;
  padding: 12px;
  margin: 0 0 4px 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-xs);
}

.data-section.mini {
  width: 100%;
  margin-bottom: 12px;
}

.data-section.mini:last-child {
  margin-bottom: 0;
}

.data-section.mini h4 {
  margin: 0 0 8px 0;
  color: #1e293b;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.5px;
}

.environment-grid.mini {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}

.environment-grid-row {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(4px, 0.6vw, 8px);
  margin-bottom: 8px;
}

.env-item.row-item {
  flex: 1;
  padding: 10px 8px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 6px;
  text-align: center;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.env-item.row-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.env-label {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 6px;
  font-weight: 500;
}

.env-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.environment-grid.mini:last-child {
  margin-bottom: 0;
}

.env-item.mini {
  width: 100%;
  padding: 10px 8px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 6px;
  text-align: center;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.env-item.mini:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.env-label.mini {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 6px;
  font-weight: 500;
}

.env-value.mini {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.stats-grid.mini {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(4px, 0.7vw, 8px);
}

.stat-card.mini {
  width: 100%;
  display: flex;
  padding: 10px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.stat-card.mini:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12);
}

.stat-icon.mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 8px;
  font-size: 1rem;
  flex-shrink: 0;
}

.stat-info.mini h3 {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 4px;
  line-height: 1.3;
}

.stat-number.mini {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
}

.stat-change.mini {
  font-size: 0.65rem;
  font-weight: 500;
}

.map-section, .video-section, .activity-section {
  width: 100%;
  padding: clamp(5px, 0.8vw, 10px);
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 5px rgba(0,0,0,0.08);
  box-sizing: border-box;
  min-width: 0;
}

.map-section h3, .video-section h3, .activity-section h3 {
  margin-bottom: 5px;
  color: #1e293b;
  font-size: clamp(0.9rem, 1.1vw, 1.05rem);
}

.chart-container {
  width: 100%;
  height: 200px;
  margin-bottom: 16px;
}

.chart-canvas {
  width: 100% !important;
  height: 100% !important;
}

/* 图表标题和预警徽章 */
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.chart-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
}

.alert-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
  border: 1px solid #ffc107;
  border-radius: 20px;
  animation: alertPulse 2s ease-in-out infinite;
}

.alert-icon {
  font-size: 1rem;
}

.alert-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: #856404;
}

@keyframes alertPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 8px rgba(255, 193, 7, 0);
  }
}

/* 连接状态样式 */
.connection-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 0.8rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-label {
  font-weight: 500;
  color: #334155;
}

.status-indicator {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
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
  font-size: 0.75rem;
}

/* 地图头部布局 */
.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.map-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.map-title-group h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1rem;
}

/* 视图切换按钮面板 */
.view-toggle-panel {
  display: flex;
  gap: 4px;
}

.view-toggle-btn {
  padding: 3px 8px;
  font-size: 0.7rem;
  background: #f0f5ff;
  border: 1px solid #d1e0f0;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
  color: #4a6d8d;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.view-toggle-btn:hover {
  background: #e0eaf5;
  border-color: #a4c4e0;
}

.view-toggle-btn.active {
  background: #2563eb;
  color: white;
  border-color: #1a68f5;
}

/* 机器人筛选下拉菜单容器 */
.robot-filter {
  display: flex;
  gap: 4px;
}

.dropdown-container {
  position: relative;
}

.dropdown-btn {
  padding: 6px 12px;
  font-size: 0.75rem;
  background: #f0f5ff;
  border: 1px solid #d1e0f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #4a6d8d;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.dropdown-btn:hover {
  background: #e0eaf5;
  border-color: #a4c4e0;
}

.dropdown-arrow {
  font-size: 0.6rem;
  transition: transform 0.3s;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  background: white;
  border: 1px solid #d1e0f0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 8px;
  min-width: 140px;
  z-index: 1000;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 4px;
  gap: 8px;
}

.dropdown-item:hover {
  background-color: #f0f5ff;
}

.dropdown-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #2563eb;
}

.dropdown-item span {
  font-size: 0.8rem;
  color: #1e293b;
  font-weight: 500;
}

.map-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.map-container {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0; /* 允许缩小 */
  overflow: hidden;
  background: #f0f5ff;
  border-radius: 8px;
}

.map-background {
  position: relative;
  width: 100%;
  height: 100%;
  background: #e6f0ff;
}

.robot-position {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.5s ease;
}

.robot-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.3s;
}

.robot-icon.moving {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.robot-info {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 2px;
  padding: 2px 4px;
  margin-top: 3px;
  font-size: 0.55rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.robot-id {
  font-weight: bold;
  color: #1e293b;
}

.robot-battery {
  color: #64748b;
}

.heat-point {
  position: absolute;
  border-radius: 50%;
  opacity: 0.7;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.heatmap-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.heatmap-canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.heatmap-overlay-old {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.thermal-cell {
  border: 1px dotted transparent;
  transition: opacity 0.3s ease;
}

.no-data-message {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  color: #666;
  font-size: 14px;
  text-align: center;
  border-radius: 4px;
}

/* 视图切换按钮面板 */
.view-toggle-panel {
  margin-top: 5px;
  display: flex;
  gap: 5px;
  justify-content: center;
}

.view-toggle-btn {
  flex: 1;
  padding: 6px 12px;
  font-size: 0.75rem;
  background: #f0f5ff;
  border: 1px solid #d1e0f0;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
  color: #4a6d8d;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.view-toggle-btn:hover {
  background: #e0eaf5;
  border-color: #a4c4e0;
}

.view-toggle-btn.active {
  background: #2563eb;
  color: white;
  border-color: #1a68f5;
}

/* 视频流容器 */
.video-stream-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f0f5ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-stream-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.video-title {
  text-align: center;
  padding: 4px;
  background: rgba(44, 62, 80, 0.9);
  color: white;
  font-size: 0.65rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* 视频源标识徽章 */
.video-source-badge {
  background: var(--brand-600);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.video-stream {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
}

.video-stream img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 本地摄像头视频样式 */
.local-camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* 镜像翻转，符合镜子习惯 */
}

.no-video {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  background: #1e293b;
}

.control-panel {
  margin-top: 6px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px;
  background: #f8fafc;
  border-radius: 8px;
}

.btn {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 2px;
  background: #fff;
  cursor: pointer;
  font-size: 0.7rem;
}

.btn-secondary {
  background: #64748b;
  color: white;
  border: 1px solid #64748b;
}

.video-container {
  width: 100%;
  height: 120px;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
}

.video-stream {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-stream img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-video {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  background: #1e293b;
}

/* 右侧面板布局 */
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.data-overview.mini {
  flex-shrink: 0;
}

.activity-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.activity-section h3 {
  flex-shrink: 0;
  margin-bottom: 6px;
  font-size: 1.1rem;
}

/* 图表容器样式 */
.chart-container {
  flex: 1;
  min-height: 250px;
  position: relative;
}

/* 图表画布样式 */
.chart-canvas {
  width: 100% !important;
  height: 100% !important;
}

/* 加载状态样式 */
.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 250px;
  background-color: #f8fafc;
  border-radius: 8px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(75, 192, 192, 0.3);
  border-radius: 50%;
  border-top: 4px solid rgba(75, 192, 192, 1);
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 错误信息样式 */
.chart-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 250px;
  background-color: #f8fafc;
  border-radius: 8px;
  color: #dc3545;
  text-align: center;
  padding: 20px;
}

.activity-list {
  flex: 1;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-item:hover {
  background-color: #f8fafc;
}

.activity-icon {
  font-size: 1.1rem;
  margin-right: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 6px;
}

.activity-content {
  flex: 1;
}

.activity-content h4 {
  margin: 0 0 3px 0;
  color: #1e293b;
  font-size: 0.75rem;
}

.activity-content p {
  margin: 0 0 3px 0;
  color: #64748b;
  font-size: 0.65rem;
  line-height: 1.2;
}

.activity-time {
  font-size: 0.55rem;
  color: #94a3b8;
}

/* ========================================
   响应式设计（断点：1280 / 1024 / 768 / 480）
   ======================================== */

/* 中屏笔记本：右侧面板变窄，环境指标改为 2×2，避免文字挤压 */
@media (max-width: 1280px) {
  .environment-grid-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 平板及以下：上下单栏布局，页面恢复自然滚动，地图与图表给固定流式高度 */
@media (max-width: 1024px) {
  .dashboard-container {
    height: auto;
    margin: 0;
    overflow: visible;
  }

  .content-grid {
    height: auto;
    min-height: 0;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
    overflow: visible;
    gap: 10px;
    padding: 10px;
  }

  .map-section {
    height: auto;
  }

  .map-container {
    height: clamp(280px, 55vw, 480px);
    max-height: none;
  }

  .right-panel {
    height: auto;
    overflow: visible;
  }

  .activity-section {
    flex: none;
  }

  .chart-container {
    height: clamp(260px, 45vw, 380px);
    min-height: 0;
  }

  .chart-loading,
  .chart-error {
    min-height: 0;
    height: 100%;
  }
}

/* 手机横屏 / 小平板：统计卡片 2×2，地图头部允许换行 */
@media (max-width: 768px) {
  .content-grid {
    gap: 8px;
    padding: 8px;
  }

  .map-header {
    flex-wrap: wrap;
    gap: 6px;
  }

  .stats-grid.mini {
    grid-template-columns: repeat(2, 1fr);
  }

  .data-overview.mini {
    padding: 10px;
  }

  .map-section,
  .video-section,
  .activity-section {
    padding: 8px;
  }

  .video-container {
    height: 100px;
  }
}

/* 手机竖屏：统计卡片单列纵向排列，地图按视口宽度缩放 */
@media (max-width: 480px) {
  .stats-grid.mini {
    grid-template-columns: 1fr;
  }

  .stat-card.mini {
    flex-direction: column;
    text-align: center;
  }

  .stat-icon.mini {
    margin-right: 0;
    margin-bottom: 6px;
  }

  .map-container {
    height: 60vw;
    min-height: 220px;
  }

  .map-section,
  .video-section,
  .activity-section {
    padding: 6px;
  }

  .map-title-group h3,
  .chart-header h3 {
    font-size: 0.95rem;
  }

  .robot-icon {
    width: 24px;
    height: 24px;
  }
}
</style>
