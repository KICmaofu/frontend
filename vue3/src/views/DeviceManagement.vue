<!-- @vue-ignore -->
<template>
  <div class="equipment-management">
    <!-- 主内容区（无左侧导航） -->
    <main class="main-content">
      <!-- 页面标题和操作栏 -->
      <div class="page-header">
        <!-- 左侧选项卡切换机器人/设备管理 -->
        <div class="page-tabs">
          <button
            class="main-tab-btn"
            :class="{ active: activeNav === 'robot' }"
            @click="activeNav = 'robot'"
          >
            <i class="icon"></i> 机器人管理
          </button>
          <button
            class="main-tab-btn"
            :class="{ active: activeNav === 'equipment' }"
            @click="activeNav = 'equipment'"
          >
            <i class="icon"></i> 设备档案管理
          </button>
        </div>
      </div>

      <!-- 内容模块 -->
      <div class="content-module card">
        <!-- 机器人管理模块 -->
        <div v-if="activeNav === 'robot'">
       

          <!-- 机器人列表 -->
          <div class="data-section">
            <div class="data-table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th width="10%">机器人ID</th>
                    <th width="15%">名称</th>
                    <th width="10%">状态</th>
                    <th width="12%">电量</th>
                    <th width="20%">位置</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="robot in filteredRobots" :key="robot.id">
                    <td>{{ robot.id }}</td>
                    <td>{{ robot.name }}</td>
                    <td>
                      <span class="status-badge" :class="robot.statusClass">{{
                        robot.status
                      }}</span>
                    </td>
                    <td class="battery-cell">
                      <div
                        class="battery-bar"
                        :style="{
                          width: `${robot.battery}%`,
                          backgroundColor: getBatteryColor(robot.battery),
                        }"
                      ></div>
                      <span class="battery-text">{{ robot.battery }}%</span>
                    </td>
                    <td>{{ robot.location }}</td>
                    <td class="operation-col">

                    </td>
                  </tr>
                  <tr v-if="filteredRobots.length === 0">
                    <td colspan="6" class="empty-state">
                      暂无机器人数据
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 设备管理模块 -->
        <div v-else>
          <!-- 设备列表 -->
          <div class="data-section">
            <div class="data-table-container">
              <!-- 加载状态 -->
              <div v-if="isLoadingDevices" class="loading-state">
                <div class="loading-spinner"></div>
                <p>加载设备数据中...</p>
              </div>
              
              <!-- 错误提示 -->
              <div v-else-if="devicesError" class="error-state">
                <p>{{ devicesError }}</p>
                <button class="btn btn-primary" @click="fetchAllDevices">重试</button>
              </div>
              
              <!-- 设备表格 -->
              <template v-else>
                <table class="table">
                  <thead>
                    <tr>
                      <th width="5%">
                        <input
                          type="checkbox"
                          v-model="selectAllDevices"
                          @change="handleSelectAll"
                        />
                      </th>
                      <th width="7%">设备ID</th>
                      <th width="12%">名称</th>
                      <th width="10%">类型</th>
                      <th width="15%">位置</th>
                      <th width="10%">责任人</th>
                      <th width="8%">状态</th>
                      <th width="10%">更新时间</th>
                      <th width="15%">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="device in filteredDevices" :key="device.id">
                      <td>
                        <input
                          type="checkbox"
                          v-model="selectedDeviceIds"
                          :value="device.id"
                          @change="handleDeviceSelect"
                        />
                      </td>
                      <td>{{ device.id }}</td>
                      <td>{{ device.name }}</td>
                      <td>{{ device.type }}</td>
                      <td>{{ device.location }}</td>
                      <td>{{ device.responsiblePerson }}</td>
                      <td>
                        <span :class="['status-badge', device.statusClass]">{{
                          device.statusText
                        }}</span>
                      </td>
                      <td>{{ device.lastUpdate }}</td>
                      <td class="operation-col">
                      </td>
                    </tr>
                    <tr v-if="filteredDevices.length === 0">
                      <td colspan="9" class="empty-state">
                        暂无设备数据
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <!-- 分页组件 -->
                <div class="pagination-container" v-if="totalDevices > 0">
                  <div class="pagination-info">
                    共 {{ totalDevices }} 条记录，第 {{ currentPage }} / {{ Math.ceil(totalDevices / pageSize) }} 页
                  </div>
                  <div class="pagination-controls">
                    <button 
                      class="btn btn-sm btn-secondary" 
                      :disabled="currentPage <= 1"
                      @click="handlePageChange(currentPage - 1)"
                    >
                      上一页
                    </button>
                    <span class="page-numbers">
                      <button 
                        v-for="page in displayedPages" 
                        :key="page"
                        :class="['btn btn-sm', page === currentPage ? 'btn-primary' : 'btn-secondary']"
                        @click="handlePageChange(page)"
                      >
                        {{ page }}
                      </button>
                    </span>
                    <button 
                      class="btn btn-sm btn-secondary" 
                      :disabled="currentPage >= Math.ceil(totalDevices / pageSize)"
                      @click="handlePageChange(currentPage + 1)"
                    >
                      下一页
                    </button>
                  </div>
                  <div class="page-size-selector">
                    <label>每页显示：</label>
                    <select v-model="pageSize" @change="handlePageSizeChange">
                      <option :value="10">10条</option>
                      <option :value="20">20条</option>
                      <option :value="50">50条</option>
                      <option :value="100">100条</option>
                    </select>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from 'vue-router';

const router = useRouter();

// 导航选中状态（默认显示机器人管理）
const activeNav = ref("robot");

// 通知函数
const showNotification = (message, type = 'info') => {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 显示动画
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // 自动移除
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
};

// 获取电池颜色
const getBatteryColor = (battery) => {
  if (battery > 70) return "#2ecc71"; // 绿色
  if (battery > 30) return "#f39c12"; // 橙色
  return "#e74c3c"; // 红色
};

// 初始机器人数据（模拟数据已移除，默认为空）
const initialRobots = [];

// 从localStorage加载机器人数据
const loadRobotsFromStorage = () => {
  try {
    const storedRobots = localStorage.getItem('robots');
    return storedRobots ? JSON.parse(storedRobots) : [...initialRobots];
  } catch (error) {
    console.error('从localStorage加载机器人数据失败:', error);
    return [...initialRobots];
  }
};

// 保存机器人数据到localStorage
const saveRobotsToStorage = (data) => {
  try {
    localStorage.setItem('robots', JSON.stringify(data));
  } catch (error) {
    console.error('保存机器人数据到localStorage失败:', error);
  }
};

// 机器人数据
const robots = ref(loadRobotsFromStorage());

// 机器人搜索条件
const robotSearchQuery = ref("");
const showRobotSearch = ref(false);

// 过滤后的机器人数据
const filteredRobots = computed(() => {
  return robots.value.filter((robot) => {
    const matchesSearch =
      !robotSearchQuery.value ||
      robot.name.toLowerCase().includes(robotSearchQuery.value.toLowerCase()) ||
      robot.id.toLowerCase().includes(robotSearchQuery.value.toLowerCase());
    return matchesSearch;
  });
});

// 巡检计划数据（模拟数据已移除，默认为空）
const inspectionPlans = ref([]);

// 初始设备数据（模拟数据已移除，默认为空）
const initialDevices = [];

// 从localStorage加载设备数据
const loadDevicesFromStorage = () => {
  try {
    const storedDevices = localStorage.getItem('devices');
    return storedDevices ? JSON.parse(storedDevices) : [...initialDevices];
  } catch (error) {
    console.error('从localStorage加载设备数据失败:', error);
    return [...initialDevices];
  }
};

// 保存设备数据到localStorage
const saveDevicesToStorage = (data) => {
  try {
    localStorage.setItem('devices', JSON.stringify(data));
  } catch (error) {
    console.error('保存设备数据到localStorage失败:', error);
  }
};

// 设备数据
const devices = ref(loadDevicesFromStorage());

// 设备列表数据
const filteredDevices = computed(() => devices.value);

// 弹窗控制
const showBatchModal = ref(false);
const showExcelImportModal = ref(false);
const showAddRobotModal = ref(false);
const showBatchAddRobotModal = ref(false);
const showInspectionPlanModal = ref(false);
const showAddEquipmentModal = ref(false);
const showEditEquipmentModal = ref(false);
const showBatchAddEquipmentModal = ref(false);

// 设备操作状态
const isLoading = ref(false);
const operationMessage = ref('');
const operationSuccess = ref(false);

// 设备列表加载相关
const isLoadingDevices = ref(false);

// 单个设备查询相关
const isLoadingSingleDevice = ref(false);
const singleDeviceError = ref('');
const currentDeviceDetail = ref(null);
const showDeviceDetailModal = ref(false);

// 设备删除相关
const isDeletingDevice = ref(false);
const deviceToDelete = ref(null);
const showDeleteConfirmModal = ref(false);
const showBatchDeleteModal = ref(false);
const selectedDeviceIds = ref([]);
const selectAllDevices = ref(false);
const deleteVerificationId = ref('');
const deleteVerificationError = ref('');
// 设备编辑验证相关
const editVerificationId = ref('');
const editVerificationError = ref('');

// 表单数据
const currentRobot = ref(null);
const currentRobotPlan = ref({});
const addRobotForm = ref({
  id: "",
  name: "",
  status: "在线",
  battery: 100,
  location: "",
});
const inspectionPlanForm = ref({
  name: "",
  time: "",
  cycle: "",
  assignedRobot: "",
});
const currentEditDevice = ref(null);
const editEquipmentForm = ref({
  location: "",
  responsiblePerson: "",
  contactInfo: "",
});
const addEquipmentForm = ref({
  name: "",
  type: "",
  location: "",
  responsiblePerson: "",
  contactInfo: "",
});

// Excel导入相关
const fileInput = ref(null);
const selectedFile = ref(null);
const robotFileInput = ref(null);
const selectedRobotFile = ref(null);
const isDragOver = ref(false);

// 批量添加设备档案相关
const batchEquipmentFileInput = ref(null);
const selectedBatchEquipmentFile = ref(null);
const batchEquipmentData = ref([]);

// 表单提交状态
const robotFormSubmitted = ref(false);
const planFormSubmitted = ref(false);
const equipmentFormSubmitted = ref(false);
const editEquipmentSubmitted = ref(false);

// 检查ID是否存在
const robotIdExist = computed(() =>
  robots.value.some((robot) => robot.id === addRobotForm.value.id),
);

// 点击页面其他区域关闭搜索框
document.addEventListener('click', (event) => {
  const robotSearchArea = document.querySelector('.robot-search-area');

  if (robotSearchArea && !robotSearchArea.contains(event.target)) {
    showRobotSearch.value = false;
  }
});

const sendRobotCommand = async (robotId, command) => {
  // 不再弹出 alert，避免干扰用户操作

  const robotIndex = robots.value.findIndex((r) => r.id === robotId);
  if (robotIndex === -1) return;

  // 接口层已移除：直接更新本地状态
  let status = "";
  let statusClass = "";
  let battery = robots.value[robotIndex].battery;
  let location = robots.value[robotIndex].location;

  switch (command) {
    case "start":
      status = "巡检中";
      statusClass = "status-warning";
      battery = Math.max(0, battery - 5);
      break;
    case "stop":
      status = "在线";
      statusClass = "status-active";
      break;
    case "return":
      status = "离线";
      statusClass = "status-inactive";
      location = "充电站";
      battery = 100;
      break;
  }

  // 更新本地状态
  robots.value[robotIndex] = {
    ...robots.value[robotIndex],
    status,
    statusClass,
    battery,
    location,
  };
  // 保存机器人数据到localStorage
  saveRobotsToStorage(robots.value);

  // 同时更新设备档案中的状态
  const deviceIndex = devices.value.findIndex((d) => d.id === robotId);
  if (deviceIndex !== -1) {
    devices.value[deviceIndex] = {
      ...devices.value[deviceIndex],
      status: status === "在线" ? "正常" : (status === "离线" ? "离线" : "巡检中"),
      statusText: status,
      location: location
    };
    // 保存设备数据到localStorage
    saveDevicesToStorage(devices.value);
  }

};

const confirmInspectionPlan = () => {
  planFormSubmitted.value = true;
  if (
    !inspectionPlanForm.value.name ||
    !inspectionPlanForm.value.time ||
    !inspectionPlanForm.value.cycle
  )
    return;

  if (currentRobotPlan.value.id) {
    const index = inspectionPlans.value.findIndex(
      (plan) => plan.id === currentRobotPlan.value.id,
    );
    if (index !== -1) {
      inspectionPlans.value[index] = {
        ...inspectionPlans.value[index],
        ...inspectionPlanForm.value,
      };
      showNotification(`巡检计划 ${inspectionPlanForm.value.name} 修改成功！`, 'success');
    }
  } else {
    const newPlan = {
      id: inspectionPlans.value.length + 1,
      ...inspectionPlanForm.value,
      enabled: true,
    };
    inspectionPlans.value.push(newPlan);
    showNotification(`巡检计划 ${inspectionPlanForm.value.name} 添加成功！`, 'success');
  }

  showInspectionPlanModal.value = false;
  currentRobot.value = null;
  currentRobotPlan.value = {};
};

/**
 * 打开删除设备确认弹窗
 * @param {string} deviceId - 设备 ID
 */
const openDeleteConfirmModal = (deviceId) => {
  deviceToDelete.value = deviceId;
  showDeleteConfirmModal.value = true;
};

/**
 * 关闭删除设备确认弹窗
 */
const closeDeleteConfirmModal = () => {
  showDeleteConfirmModal.value = false;
};

/**
 * 确认删除设备档案（带验证）
 */
const confirmDeleteDeviceWithVerification = async () => {
  if (!deviceToDelete.value) return;
  
  // 验证设备ID
  if (!deleteVerificationId.value) {
    deleteVerificationError.value = '请输入设备ID';
    return;
  }
  
  // 验证设备ID格式
  if (typeof deleteVerificationId.value !== 'string' || deleteVerificationId.value.trim() === '') {
    deleteVerificationError.value = '设备ID格式不正确';
    return;
  }
  
  // 验证输入的设备ID是否与要删除的设备ID匹配
  if (deleteVerificationId.value.trim() !== deviceToDelete.value) {
    deleteVerificationError.value = '设备ID不匹配，请重新输入';
    return;
  }
  
  // 清除错误信息
  deleteVerificationError.value = '';
  
  // 直接从本地列表中删除设备
  devices.value = devices.value.filter((d) => d.id !== deviceToDelete.value);
  
  // 关闭弹窗
  closeDeleteConfirmModal();
  
};


// 删除设备档案（兼容旧版本，调用新的确认弹窗）
const deleteDevice = (deviceId) => {
  openDeleteConfirmModal(deviceId);
};

// 删除机器人
const deleteRobot = (robotId) => {
  robots.value = robots.value.filter((robot) => robot.id !== robotId);
  saveRobotsToStorage(robots.value);
  devices.value = devices.value.filter((device) => device.id !== robotId);
  saveDevicesToStorage(devices.value);
  showNotification(`机器人 ${robotId} 删除成功！`, 'success');
};

// 全选/取消全选设备档案
const handleSelectAll = () => {
  if (selectAllDevices.value) {
    selectedDeviceIds.value = filteredDevices.value.map(device => device.id);
  } else {
    selectedDeviceIds.value = [];
  }
};

// 单个设备档案选择处理
const handleDeviceSelect = () => {
  selectAllDevices.value = selectedDeviceIds.value.length === filteredDevices.value.length;
};

/**
 * 确认批量删除设备档案
 */
const confirmBatchDeleteDevice = async () => {
  if (selectedDeviceIds.value.length === 0) return;
  
  // 直接从本地列表中删除选中的设备
  devices.value = devices.value.filter((d) => !selectedDeviceIds.value.includes(d.id));
  
  // 清空选中状态
  selectedDeviceIds.value = [];
  selectAllDevices.value = false;
  
  // 关闭弹窗
  showBatchDeleteModal.value = false;
  
};

// 添加机器人
const confirmAddRobot = () => {
  robotFormSubmitted.value = true;
  if (
    !addRobotForm.value.id ||
    !addRobotForm.value.name ||
    !addRobotForm.value.location
  )
    return;
  if (
    robotIdExist.value ||
    addRobotForm.value.battery < 0 ||
    addRobotForm.value.battery > 100
  )
    return;

  const getStatusClass = (status) => {
    switch (status) {
      case "在线":
        return "status-active";
      case "离线":
        return "status-inactive";
      case "巡检中":
        return "status-warning";
      default:
        return "status-active";
    }
  };

  const newRobot = {
    id: addRobotForm.value.id,
    name: addRobotForm.value.name,
    status: addRobotForm.value.status,
    statusClass: getStatusClass(addRobotForm.value.status),
    battery: addRobotForm.value.battery,
    location: addRobotForm.value.location,
  };

  // 添加到本地列表
  robots.value.push(newRobot);
  // 保存机器人数据到localStorage
  saveRobotsToStorage(robots.value);

  // 同时更新档案管理列表
  const newDevice = {
    id: addRobotForm.value.id,
    name: addRobotForm.value.name,
    type: "机器人",
    model: "智能巡检机器人",
    serialNumber: addRobotForm.value.id,
    status: addRobotForm.value.status === "在线" ? "正常" : (addRobotForm.value.status === "离线" ? "离线" : "巡检中"),
    statusText: addRobotForm.value.status,
    installDate: new Date().toISOString().split('T')[0],
    lastMaintenance: new Date().toISOString().split('T')[0],
    location: addRobotForm.value.location,
    department: "安全管理部",
    responsiblePerson: "管理员",
    contactInfo: "13800138006",
    ipAddress: "192.168.1.100",
    macAddress: "00:11:22:33:44:55",
    firmwareVersion: "v1.0.0",
    softwareVersion: "v1.0.0",
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyPeriod: "1年",
    notes: "智能巡检机器人",
    maintenanceRecords: [],
    operationLogs: []
  };
  devices.value.push(newDevice);
  // 保存设备数据到localStorage
  saveDevicesToStorage(devices.value);

  showNotification(`机器人 ${addRobotForm.value.name} 添加成功！`, 'success');

  addRobotForm.value = {
    id: "",
    name: "",
    status: "在线",
    battery: 100,
    location: "",
  };
  robotFormSubmitted.value = false;
  showAddRobotModal.value = false;
};

// 批量添加机器人
const triggerRobotFileInput = () => robotFileInput.value.click();
const handleRobotFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) selectedRobotFile.value = file;
};
const handleRobotFileDrop = (e) => {
  e.preventDefault();
  isDragOver.value = false;
  const file = e.dataTransfer.files[0];
  if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
    selectedRobotFile.value = file;
  } else {
    alert("请上传Excel文件（.xlsx/.xls）！");
  }
};
const confirmBatchAddRobot = () => {
  if (confirm(`确认导入文件 ${selectedRobotFile.value.name} 吗？`)) {
    // 实际项目中需要解析Excel文件并调用后端API
    alert(
      `文件 ${selectedRobotFile.value.name} 导入成功！`,
    );
    selectedRobotFile.value = null;
    showBatchAddRobotModal.value = false;
  }
};

// Excel导入
const triggerFileInput = () => fileInput.value.click();
const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) selectedFile.value = file;
};
const handleDragOver = (e) => {
  e.preventDefault();
  isDragOver.value = true;
};
const handleDragLeave = () => {
  isDragOver.value = false;
};
const handleFileDrop = (e) => {
  e.preventDefault();
  isDragOver.value = false;
  const file = e.dataTransfer.files[0];
  if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
    selectedFile.value = file;
  } else {
    alert("请上传Excel文件（.xlsx/.xls）！");
  }
};
const confirmImportExcel = () => {
  if (confirm(`确认导入文件 ${selectedFile.value.name} 吗？`)) {
    // 实际项目中需要解析Excel文件并调用后端API
    alert(
      `文件 ${selectedFile.value.name} 导入成功！`,
    );
    selectedFile.value = null;
    showExcelImportModal.value = false;
    showBatchModal.value = false;
  }
};

/**
 * 关闭编辑设备档案弹窗
 */
const closeEditEquipmentModal = () => {
  currentEditDevice.value = null;
  editVerificationId.value = '';
  editVerificationError.value = '';
  showEditEquipmentModal.value = false;
};

// 分页相关状态
const currentPage = ref(1);
const pageSize = ref(10);
const totalDevices = ref(0);

// 加载状态和错误处理
const devicesError = ref('');

// 本地刷新设备档案数据
const fetchDeviceList = () => {
  try {
    isLoadingDevices.value = true;
    devicesError.value = '';

    // 计算设备总数
    totalDevices.value = devices.value.length;
  } catch (error) {
    console.error('❌ 刷新设备档案失败:', error.message);
    devicesError.value = `刷新设备档案失败：${error.message}`;
  } finally {
    isLoadingDevices.value = false;
  }
};

// 本地刷新所有设备
const fetchAllDevices = () => {
  // 刷新本地设备数据
  fetchDeviceList();
};

// 本地刷新单个设备详情
const fetchDeviceById = (deviceId) => {
  if (!deviceId) return;
  const device = devices.value.find(d => d.id === deviceId);
  if (device) {
    currentDeviceDetail.value = { ...device };
  }
};

/**
 * 处理页码变化
 * @param {number} page - 目标页码
 */
const handlePageChange = (page) => {
  const totalPages = Math.ceil(totalDevices.value / pageSize.value);
  if (page < 1 || page > totalPages) return;
  
  currentPage.value = page;
  // 调用 API 获取对应页的数据
  fetchDeviceList();
};

/**
 * 处理每页条数变化
 */
const handlePageSizeChange = () => {
  currentPage.value = 1; // 重置到第一页
  // 调用 API 获取对应页大小的数据
  fetchDeviceList();
};

/**
 * 计算显示的页码列表
 */
const displayedPages = computed(() => {
  const totalPages = Math.ceil(totalDevices.value / pageSize.value);
  const current = currentPage.value;
  const pages = [];
  
  if (totalPages <= 7) {
    // 如果总页数小于等于 7，显示所有页码
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // 如果总页数大于 7，显示当前页附近的页码
    if (current <= 3) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    } else if (current >= totalPages - 2) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = current - 2; i <= current + 2; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    }
  }
  
  return pages;
});

/**
 * 关闭设备档案详情弹窗
 */
const closeDeviceDetailModal = () => {

};

const confirmAddEquipment = async () => {
  equipmentFormSubmitted.value = true;
  if (
    !addEquipmentForm.value.name ||
    !addEquipmentForm.value.type ||
    !addEquipmentForm.value.location ||
    !addEquipmentForm.value.responsiblePerson ||
    !addEquipmentForm.value.contactInfo
  )
    return;

  const deviceData = {
    id: `D${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
    name: addEquipmentForm.value.name,
    type: addEquipmentForm.value.type,
    location: addEquipmentForm.value.location,
    responsiblePerson: addEquipmentForm.value.responsiblePerson,
    contactInfo: addEquipmentForm.value.contactInfo,
    statusText: "在线",
    statusClass: "status-active",
    lastUpdate: "刚刚"
  };

  // 直接添加到本地设备列表
  devices.value.push(deviceData);
  
  // 重置表单
  addEquipmentForm.value = {
    name: "",
    type: "",
    location: "",
    responsiblePerson: "",
    contactInfo: "",
  };
  equipmentFormSubmitted.value = false;
  showAddEquipmentModal.value = false;
  
};

const confirmEditEquipment = async () => {
  editEquipmentSubmitted.value = true;
  
  // 验证设备ID
  if (!editVerificationId.value) {
    editVerificationError.value = '请输入设备ID以确认编辑';
    return;
  }
  
  // 验证设备ID格式
  if (typeof editVerificationId.value !== 'string' || editVerificationId.value.trim() === '') {
    editVerificationError.value = '设备ID格式不正确';
    return;
  }
  
  // 验证输入的设备ID是否与当前编辑的设备ID匹配
  if (editVerificationId.value.trim() !== currentEditDevice.value.id) {
    editVerificationError.value = '设备ID不匹配，请重新输入';
    return;
  }
  
  // 清除错误信息
  editVerificationError.value = '';
  
  if (
    !editEquipmentForm.value.name ||
    !editEquipmentForm.value.type ||
    !editEquipmentForm.value.location ||
    !editEquipmentForm.value.responsiblePerson ||
    !editEquipmentForm.value.contactInfo
  )
    return;

  const deviceData = {
    name: editEquipmentForm.value.name,
    type: editEquipmentForm.value.type,
    location: editEquipmentForm.value.location,
    responsiblePerson: editEquipmentForm.value.responsiblePerson,
    contactInfo: editEquipmentForm.value.contactInfo,
    statusText: currentEditDevice.value.statusText,
    statusClass: currentEditDevice.value.statusClass
  };

  const index = devices.value.findIndex(d => d.id === currentEditDevice.value.id);
  if (index !== -1) {
    devices.value[index] = {
      ...devices.value[index],
      ...deviceData,
      lastUpdate: "刚刚"
    };
  }
  
  closeEditEquipmentModal();
  editEquipmentSubmitted.value = false;
};

// 已删除导出和刷新功能

// 批量添加设备档案相关函数
const triggerBatchEquipmentFileInput = () => batchEquipmentFileInput.value.click();

const handleBatchEquipmentFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedBatchEquipmentFile.value = file;
    // 实际项目中需要使用xlsx库解析Excel文件
    batchEquipmentData.value = [];
  }
};

const handleBatchEquipmentFileDrop = (e) => {
  e.preventDefault();
  isDragOver.value = false;
  const file = e.dataTransfer.files[0];
  if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
    selectedBatchEquipmentFile.value = file;
    // 实际项目中需要使用xlsx库解析Excel文件
    batchEquipmentData.value = [];
  } else {
    alert("请上传Excel文件（.xlsx/.xls）！");
  }
};

/**
 * 批量设备档案数据验证逻辑
 * @param {Array} devicesData - 批量设备档案数据
 * @returns {Object} - 验证结果 { valid: boolean, error: string }
 */
const validateBatchEquipmentData = (devicesData) => {
  if (!Array.isArray(devicesData) || devicesData.length === 0) {
    return { valid: false, error: '设备档案数据不能为空' };
  }

  const requiredFields = ['id', 'name', 'type', 'location', 'responsiblePerson', 'contactInfo'];
  
  for (let i = 0; i < devicesData.length; i++) {
    const device = devicesData[i];
    
    if (!device || typeof device !== 'object') {
      return { valid: false, error: `第${i + 1}条数据格式不正确` };
    }

    for (const field of requiredFields) {
      if (!device[field]) {
        return { valid: false, error: `第${i + 1}条数据的${field}字段不能为空` };
      }
    }

    // 检查设备ID是否已存在
    if (devices.value.some(d => d.id === device.id)) {
      return { valid: false, error: `设备ID ${device.id} 已存在` };
    }
  }

  return { valid: true, error: '' };
};

/**
 * 确认批量添加设备档案
 */
const confirmBatchAddEquipment = () => {
  if (!selectedBatchEquipmentFile.value) return;
  
  // 验证数据
  const validation = validateBatchEquipmentData(batchEquipmentData.value);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }
  
  // 直接添加到本地列表
  batchEquipmentData.value.forEach(device => {
    devices.value.push({
      ...device,
      statusText: "在线",
      statusClass: "status-active",
      lastUpdate: "刚刚"
    });
  });
  
  // 重置状态
  selectedBatchEquipmentFile.value = null;
  batchEquipmentData.value = [];
  showBatchAddEquipmentModal.value = false;

};

// 生命周期
onMounted(async () => {
  // 检查身份验证
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    router.push('/login');
    return;
  }

  // 初始化设备数据
  fetchAllDevices();
});
</script>

<style scoped>
/* ========================================
   全局样式 - 页面固定处理
   禁用所有滚动行为，确保页面完全固定
   ======================================== */
.equipment-management {
  padding: 0;
  max-width: 100%;
  margin: 0;
  height: calc(100vh - 104px);
  overflow: hidden !important; /* 强制禁用所有滚动 */
  display: flex;
  flex-direction: column;
  gap: 0;
  background-color: var(--bg-page);
  color: #1a202c;
  position: relative;
}

/* ========================================
   主内容区 - 固定尺寸，禁用滚动
   ======================================== */
.main-content {
  flex-grow: 1;
  overflow: hidden !important; /* 强制禁用所有滚动 */
  padding: var(--page-gutter);
  position: relative;
}

/* 页面标题和操作栏 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
  gap: 20px;
  flex-wrap: wrap;
}

/* 左侧选项卡 */
.page-tabs {
  display: flex;
  gap: 5px;
}

/* 右侧操作按钮组 */
.page-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 卡片式选项卡按钮组 - 美化效果 */
.main-card-tabs {
  display: flex;
  gap: 5px;
}

.main-tab-btn {
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
  margin-top: -10px;
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

/* 内容模块 */
.content-module {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  border: 1px solid #f0f2f5;
}

/* 控制区 */
.control-section {
  padding: 20px;
  border-bottom: 1px solid #f0f2f5;
}

.robot-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* ========================================
   数据区 - 禁用滚动
   ======================================== */
.data-section {
  padding: 0;
}

.data-table-container {
  overflow: hidden !important; /* 强制禁用滚动 */
}

/* 表格样式 */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table th {
  padding: 14px 16px;
  text-align: left;
  background-color: #f8fafc;
  color: #2d3748;
  font-weight: 600;
  white-space: nowrap;
  border-bottom: 2px solid #e2e8f0;
}

.table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f2f5;
  color: #4a5568;
  vertical-align: middle;
}

.table tr:hover {
  background-color: #fafbfc;
}

/* 电池显示样式 */
.battery-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.battery-bar {
  height: 8px;
  background-color: #48bb78;
  border-radius: 4px;
  min-width: 80px;
  transition: background-color 0.3s ease;
}

.battery-text {
  font-size: 12px;
  color: #2d3748;
  font-weight: 500;
  white-space: nowrap;
}

/* 状态徽章 */
.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-active {
  background-color: #e0f2fe;
  color: #0284c7;
}

.status-warning {
  background-color: #fef3c7;
  color: #d97706;
}

.status-inactive {
  background-color: #fee2e2;
  color: #dc2626;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #718096;
  font-size: 14px;
  background-color: #f8fafc;
}

/* 操作列 */
.operation-col {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 按钮样式 - 现代化设计 */
.btn {
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 500;
  white-space: nowrap;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn:active {
  transform: translateY(0);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

/* 按钮配色方案 */
.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #64748b;
  color: white;
}

.btn-secondary:hover {
  background-color: #475569;
}

.btn-success {
  background-color: #10b981;
  color: white;
}

.btn-success:hover {
  background-color: #059669;
}

.btn-warning {
  background-color: #f59e0b;
  color: white;
}

.btn-warning:hover {
  background-color: #d97706;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.btn-info {
  background-color: #3b82f6;
  color: white;
}

.btn-info:hover {
  background-color: #2563eb;
}

/* 输入框样式 */
.input-field {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  color: #2d3748;
  transition: all 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.input-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-readonly {
  background-color: #f8fafc;
  color: #718096;
  cursor: not-allowed;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-card {
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border: 1px solid #f0f2f5;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f2f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #1a202c;
  font-size: 16px;
  font-weight: 600;
}

.modal-close {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #718096;
  padding: 0 8px;
  line-height: 1;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #ef4444;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f0f2f5;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background-color: #fafbfc;
}

/* 表单样式 */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  color: #2d3748;
  font-weight: 500;
  font-size: 14px;
}

.error-text {
  color: #dc2626;
  font-size: 12px;
  margin-top: 4px;
}

/* Excel导入样式 */
.import-card {
  max-width: 600px;
}

.import-area {
  border: 2px dashed #e2e8f0;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  margin-bottom: 20px;
  transition: all 0.2s;
  background-color: #fafbfc;
}

/* 通知样式 */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  z-index: 10000;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.notification.show {
  transform: translateX(0);
}

.notification-success {
  background-color: #10b981;
}

.notification-warning {
  background-color: #f59e0b;
}

.notification-error {
  background-color: #ef4444;
}

.notification-info {
  background-color: #3b82f6;
}

.import-area.dragOver {
  border-color: #3b82f6;
  background-color: #f0f7ff;
}

.file-input {
  display: none;
}

.import-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #718096;
}

.import-hint .icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: #94a3b8;
}

.file-selected {
  padding: 12px 16px;
  background-color: #f8fafc;
  border-radius: 6px;
  color: #2d3748;
  font-size: 14px;
  border: 1px solid #e2e8f0;
}

/* 分页组件样式 */
.pagination-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  gap: 12px;
}

.pagination-info {
  color: #4a5568;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-numbers .btn {
  min-width: 32px;
  padding: 6px 10px;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4a5568;
  font-size: 14px;
}

.page-size-selector select {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: white;
  color: #2d3748;
  font-size: 14px;
  cursor: pointer;
}

.page-size-selector select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .page-tabs,
  .page-actions {
    justify-content: center;
  }
  .page-tabs .main-tab-btn {
    margin-top: 2px;
  }
}

@media (max-width: 768px) {
  .equipment-management {
    height: auto;
    min-height: calc(100vh - 104px);
    overflow: visible !important;
  }

  .main-content {
    overflow: visible !important;
  }

  .pagination-container {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .pagination-controls {
    order: -1;
  }
  
  .page-numbers {
    display: none;
  }

  .main-content {
    padding: 16px;
    overflow: hidden !important; /* 禁用滚动 */
  }

  .robot-controls {
    flex-direction: column;
  }

  .operation-col {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .table {
    display: block;
    overflow: hidden !important; /* 禁用滚动 */
  }

  .page-tabs,
  .page-actions {
    flex-direction: column;
    width: 100%;
  }

  .main-tab-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .page-actions {
    flex-direction: column;
  }
}

/* 辅助类 */
.flex-grow {
  flex-grow: 1;
}

/* 设备详情弹窗 */
.device-detail-modal {
  max-width: 500px;
  width: 90%;
}

.device-detail-content {
  padding: 20px 0;
}

.detail-item {
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid #f0f2f5;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item label {
  width: 100px;
  font-weight: 500;
  color: #64748b;
  flex-shrink: 0;
}

.detail-item span {
  flex: 1;
  color: #1a202c;
  word-break: break-all;
}

/* 查看按钮样式 */
.btn-info {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-info:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}

/* 删除确认弹窗 */
.delete-confirm-modal {
  max-width: 400px;
  width: 90%;
}

.delete-confirm-content {
  text-align: center;
  padding: 20px 0;
}

.warning-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.confirm-message {
  font-size: 16px;
  color: #1a202c;
  margin-bottom: 8px;
  line-height: 1.5;
}

.confirm-message strong {
  color: #dc2626;
  font-weight: 600;
}

.confirm-hint {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.loading-overlay .loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #ef4444;
}

.loading-overlay p {
  margin-top: 12px;
  color: #64748b;
  font-size: 14px;
}

/* 操作消息提示 */
.operation-message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slideIn 0.3s ease;
  min-width: 300px;
  max-width: 400px;
}

.operation-message.success {
  background-color: #10b981;
  border-left: 4px solid #059669;
}

.operation-message.error {
  background-color: #ef4444;
  border-left: 4px solid #dc2626;
}

.message-close {
  background: transparent;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  margin-left: 16px;
  padding: 0;
  line-height: 1;
}

.message-close:hover {
  opacity: 0.8;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background-color: #f8fafc;
  border-radius: 8px;
  min-height: 300px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  color: #64748b;
  font-size: 14px;
  margin: 0;
}

/* 错误状态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 8px;
  min-height: 200px;
  text-align: center;
}

.error-state p {
  color: #dc2626;
  font-size: 14px;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.error-state .btn {
  margin-top: 8px;
}

/* 卡片基础样式 */
.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  border: 1px solid #f0f2f5;
}

/* ========================================
   批量添加设备档案样式 - 禁用滚动
   ======================================== */
.batch-preview {
  margin-top: 20px;
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
}

.batch-preview h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
}

.preview-table-container {
  max-height: none; /* 移除高度限制 */
  overflow: hidden !important; /* 强制禁用滚动 */
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.preview-table th {
  background-color: #f8fafc;
  border-bottom: 2px solid #e5e7eb;
  padding: 10px;
  text-align: left;
  font-weight: 600;
  color: #4b5563;
  position: sticky;
  top: 0;
  z-index: 10;
}

.preview-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 8px 10px;
  color: #1a202c;
}

.preview-table tr:hover {
  background-color: #f8fafc;
}

/* 导入区域样式增强 */
.import-area {
  cursor: pointer;
  transition: all 0.3s ease;
}

.import-area:hover {
  border-color: #3b82f6;
  background-color: #f0f9ff;
}

.import-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.import-hint i {
  font-size: 48px;
}

.import-hint p {
  margin: 0;
  color: #6b7280;
}
</style>
