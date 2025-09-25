<template>
  <div class="training-process-list">
    <div class="page-header">
      <h2>发起流程</h2>
      <button class="add-btn" @click="showTypeSelection = true">
        <span class="add-icon">+</span>
        新增培训流程
      </button>
    </div>

    <div class="process-list">
      <div class="list-header">
        <h3>培训流程列表</h3>
        <div class="filter-controls">
          <select v-model="statusFilter" @change="filterProcesses">
            <option value="">全部状态</option>
            <option value="待审查">待审查</option>
            <option value="审查中">审查中</option>
            <option value="待部门经理批准">待部门经理批准</option>
            <option value="待培训部批准">待培训部批准</option>
            <option value="已完成">已完成</option>
            <option value="已拒绝">已拒绝</option>
          </select>
        </div>
      </div>

      <div class="process-table">
        <table>
          <thead>
            <tr>
              <th>发起人</th>
              <th>类型</th>
              <th>发起时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="process in filteredProcesses" :key="process.id">
              <td>{{ process.initiatorName }}</td>
              <td>{{ process.type }}</td>
              <td>{{ process.createdAt }}</td>
              <td>
                <span class="status-badge" :class="getStatusClass(process.status)">
                  {{ process.status }}
                </span>
              </td>
              <td>
                <button class="view-btn" @click="openProcessDetail(process)">
                  查看详情
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredProcesses.length === 0" class="empty-state">
        <p>暂无培训流程数据</p>
      </div>
    </div>

    <!-- 类型选择弹窗 -->
    <div v-if="showTypeSelection" class="modal-overlay" @click="showTypeSelection = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>选择培训流程类型</h3>
          <button class="close-btn" @click="showTypeSelection = false">×</button>
        </div>
        
        <div class="modal-body">
          <div class="type-options">
            <div class="type-option" @click="selectType('培训项目等效')">
              <div class="type-icon">📚</div>
              <div class="type-info">
                <h4>培训项目等效</h4>
                <p>申请将已有培训经历等效为特定培训项目</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getProcessesByUser } from '../trainingProcesses.js'

const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-process-detail'])

const processes = ref([])
const statusFilter = ref('')
const showTypeSelection = ref(false)

// 计算属性：筛选后的流程列表
const filteredProcesses = computed(() => {
  if (!statusFilter.value) {
    return processes.value
  }
  return processes.value.filter(process => process.status === statusFilter.value)
})

// 获取状态样式类
function getStatusClass(status) {
  const statusMap = {
    '待审查': 'pending',
    '审查中': 'reviewing',
    '待部门经理批准': 'dept-pending',
    '待培训部批准': 'training-pending',
    '已完成': 'completed',
    '已拒绝': 'rejected'
  }
  return statusMap[status] || 'default'
}

// 加载流程列表
function loadProcesses() {
  processes.value = getProcessesByUser(props.currentUser.id)
}

// 筛选流程
function filterProcesses() {
  // 筛选逻辑已在计算属性中处理
}

// 选择流程类型
function selectType(type) {
  showTypeSelection.value = false
  emit('open-process-detail', { type, isNew: true })
}

// 打开流程详情
function openProcessDetail(process) {
  emit('open-process-detail', { process, isNew: false })
}

onMounted(() => {
  loadProcesses()
})
</script>

<style scoped>
.training-process-list {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.page-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 28px;
  font-weight: 600;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.add-icon {
  font-size: 20px;
  font-weight: bold;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h3 {
  margin: 0;
  color: #374151;
  font-size: 20px;
  font-weight: 600;
}

.filter-controls select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.process-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.process-table table {
  width: 100%;
  border-collapse: collapse;
}

.process-table th {
  background: #f9fafb;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.process-table td {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  color: #6b7280;
}

.process-table tr:hover {
  background: #f9fafb;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  display: inline-block;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.reviewing {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.dept-pending {
  background: #ede9fe;
  color: #6b21a8;
}

.status-badge.training-pending {
  background: #cffafe;
  color: #0e7490;
}

.status-badge.completed {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #991b1b;
}

.view-btn {
  padding: 6px 12px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-btn:hover {
  background: #e5e7eb;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  font-size: 16px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #6b7280;
}

.modal-body {
  padding: 20px;
}

.type-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-option:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.type-icon {
  font-size: 32px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 8px;
}

.type-info h4 {
  margin: 0 0 4px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.type-info p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}
</style>
