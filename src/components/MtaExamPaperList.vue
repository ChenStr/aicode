<template>
  <div class="mta-exam-paper-list">
    <div class="page-header">
      <h2>MTA考核笔试试卷</h2>
      <button class="add-btn" @click="openPaperDetail({ isNew: true })">
        <span class="add-icon">+</span>
        新增试卷
      </button>
    </div>

    <div class="paper-list">
      <div class="list-header">
        <h3>试卷列表</h3>
        <div class="filter-controls">
          <select v-model="statusFilter" @change="filterPapers">
            <option value="">全部状态</option>
            <option value="启用">启用</option>
            <option value="停用">停用</option>
          </select>
          <select v-model="mtaAuthFilter" @change="filterPapers">
            <option value="">全部MTA授权</option>
            <option 
              v-for="auth in mtaAuthOptions" 
              :key="auth.id" 
              :value="auth.id"
            >
              {{ auth.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="paper-table">
        <table>
          <thead>
            <tr>
              <th>试卷名称</th>
              <th>试卷描述</th>
              <th>适用MTA</th>
              <th>状态</th>
              <th>总分</th>
              <th>考试时长</th>
              <th>及格分数</th>
              <th>创建人</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="paper in filteredPapers" :key="paper.id">
              <td class="name-cell">
                <div class="paper-name">{{ paper.name }}</div>
                <div class="paper-meta">
                  <span class="paper-id">ID: {{ paper.id }}</span>
                </div>
              </td>
              <td class="description-cell">
                <div class="paper-description">{{ paper.description }}</div>
              </td>
              <td>{{ paper.mtaAuthName }}</td>
              <td>
                <span class="status-badge" :class="getStatusClass(paper.status)">
                  {{ paper.status }}
                </span>
              </td>
              <td>{{ paper.totalPoints }}分</td>
              <td>{{ paper.timeLimit }}分钟</td>
              <td>{{ paper.passingScore }}分</td>
              <td>{{ paper.createdByName }}</td>
              <td>{{ paper.createdAt }}</td>
              <td>
                <div class="action-buttons">
                  <button class="preview-btn" @click="previewPaper(paper.id)">
                    预览
                  </button>
                  <button class="edit-btn" @click="openPaperDetail({ paper, isNew: false })">
                    编辑
                  </button>
                  <button class="delete-btn" @click="deletePaper(paper.id)">
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredPapers.length === 0" class="empty-state">
        <p>暂无试卷数据</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getExamPapersByUser, deleteExamPaper as deleteExamPaperAction, getMtaAuthOptions } from '../mtaExamPapers.js'

const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-paper-detail', 'preview-paper'])

const papers = ref([])
const statusFilter = ref('')
const mtaAuthFilter = ref('')
const mtaAuthOptions = ref([])

// 计算属性：筛选后的试卷列表
const filteredPapers = computed(() => {
  let filtered = papers.value

  if (statusFilter.value) {
    filtered = filtered.filter(p => p.status === statusFilter.value)
  }

  if (mtaAuthFilter.value) {
    filtered = filtered.filter(p => p.mtaAuthId === mtaAuthFilter.value)
  }

  return filtered
})

// 获取状态样式类
function getStatusClass(status) {
  return status === '启用' ? 'active' : 'inactive'
}

// 加载试卷列表
function loadPapers() {
  papers.value = getExamPapersByUser(props.currentUser.id)
}

// 加载MTA授权选项
function loadMtaAuthOptions() {
  mtaAuthOptions.value = getMtaAuthOptions()
}

// 筛选试卷
function filterPapers() {
  // 筛选逻辑已在计算属性中处理
}

// 打开试卷详情
function openPaperDetail(data) {
  emit('open-paper-detail', data)
}

// 预览试卷
function previewPaper(paperId) {
  emit('preview-paper', paperId)
}

// 删除试卷
function deletePaper(id) {
  if (confirm('确定要删除这份试卷吗？删除后无法恢复。')) {
    if (deleteExamPaperAction(id)) {
      loadPapers()
      alert('试卷删除成功！')
    } else {
      alert('删除失败，请重试！')
    }
  }
}

onMounted(() => {
  loadPapers()
  loadMtaAuthOptions()
})
</script>

<style scoped>
.mta-exam-paper-list {
  padding: 20px;
  max-width: 1600px;
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

.filter-controls {
  display: flex;
  gap: 12px;
}

.filter-controls select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.paper-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.paper-table table {
  width: 100%;
  border-collapse: collapse;
}

.paper-table th {
  background: #f9fafb;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.paper-table td {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  color: #6b7280;
}

.paper-table tr:hover {
  background: #f9fafb;
}

.name-cell {
  max-width: 200px;
}

.paper-name {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
}

.paper-meta {
  font-size: 12px;
  color: #9ca3af;
}

.paper-id {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.description-cell {
  max-width: 300px;
}

.paper-description {
  color: #6b7280;
  font-size: 14px;
  line-height: 1.4;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.preview-btn {
  padding: 6px 12px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.preview-btn:hover {
  background: #059669;
}

.edit-btn {
  padding: 6px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.edit-btn:hover {
  background: #2563eb;
}

.delete-btn {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.delete-btn:hover {
  background: #dc2626;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  font-size: 16px;
}
</style>

