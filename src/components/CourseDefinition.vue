<script setup>
import { ref, computed, watch } from 'vue'
import { listCoursesByDept, addCourse, updateCourse } from '../courses'
import { listWorkItemsByDept } from '../workItems'

const props = defineProps({ currentUser: { type: Object, required: true } })

const keyword = ref('')
const typeFilter = ref('全部')
const statusFilter = ref('全部')
const page = ref(1)
const pageSize = ref(5)

const baseList = computed(() => listCoursesByDept(props.currentUser.department))
const availableWorkItems = computed(() => listWorkItemsByDept(props.currentUser.department))

const filtered = computed(() => {
  const kw = keyword.value.trim()
  return baseList.value.filter(c => {
    if (typeFilter.value !== '全部' && c.type !== typeFilter.value) return false
    if (statusFilter.value !== '全部' && c.status !== statusFilter.value) return false
    if (kw && !(`${c.name}${c.type}${c.status}`.toLowerCase().includes(kw.toLowerCase()))) return false
    return true
  })
})

const total = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value /pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

watch([keyword, typeFilter, statusFilter, pageSize], () => { page.value = 1 })

const showEdit = ref(false)
const editingId = ref('')
const form = ref({ 
  name: '', 
  type: '通用', 
  status: '启用',
  skillPracticeItems: [],
  operationPracticeItems: []
})

// 实践项类型选项
const practiceTypes = [
  { value: 'skill', label: '技能实践项目' },
  { value: 'operation', label: '实操实践项目' }
]

function openAdd() {
  editingId.value = ''
  form.value = { 
    name: '', 
    type: '通用', 
    status: '启用',
    skillPracticeItems: [],
    operationPracticeItems: []
  }
  showEdit.value = true
}

function openEdit(c) {
  editingId.value = c.id
  form.value = { 
    name: c.name, 
    type: c.type, 
    status: c.status,
    skillPracticeItems: c.skillPracticeItems || [],
    operationPracticeItems: c.operationPracticeItems || []
  }
  showEdit.value = true
}

function addPracticeItem(type) {
  const newItem = {
    id: `p_${Math.random().toString(36).slice(2, 8)}`,
    workItemId: '',
    isRequired: false
  }
  
  if (type === 'skill') {
    form.value.skillPracticeItems.push(newItem)
  } else {
    form.value.operationPracticeItems.push(newItem)
  }
}

function removePracticeItem(type, index) {
  if (type === 'skill') {
    form.value.skillPracticeItems.splice(index, 1)
  } else {
    form.value.operationPracticeItems.splice(index, 1)
  }
}

function submitEdit() {
  if (!form.value.name.trim()) return
  if (editingId.value) {
    updateCourse(editingId.value, { 
      name: form.value.name.trim(), 
      type: form.value.type, 
      status: form.value.status,
      skillPracticeItems: form.value.skillPracticeItems,
      operationPracticeItems: form.value.operationPracticeItems
    })
  } else {
    addCourse({ 
      name: form.value.name.trim(), 
      type: form.value.type, 
      status: form.value.status, 
      department: props.currentUser.department,
      skillPracticeItems: form.value.skillPracticeItems,
      operationPracticeItems: form.value.operationPracticeItems
    })
  }
  showEdit.value = false
}

const showDetail = ref(false)
const detail = ref(null)
function openDetail(c) { detail.value = c; showDetail.value = true }
</script>

<template>
  <div class="course-page">
    <div class="page-header">
      <div class="header-content">
        <div class="title-area">
          <el-icon class="title-icon"><Reading /></el-icon>
          <div>
            <h1>课程定义</h1>
            <p>{{ props.currentUser.department }} · 共 {{ total }} 门课程</p>
          </div>
        </div>
        <el-button type="primary" @click="openAdd" :icon="Plus">新增课程</el-button>
      </div>
    </div>

    <div class="filter-area">
      <div class="search-box">
        <el-input
          v-model="keyword"
          placeholder="搜索课程..."
          :prefix-icon="Search"
          clearable
        />
      </div>
      <div class="filter-row">
        <el-select v-model="typeFilter" placeholder="全部类型" clearable>
          <el-option label="全部类型" value="全部" />
          <el-option label="通用" value="通用" />
          <el-option label="专业" value="专业" />
          <el-option label="安全" value="安全" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="全部状态" clearable>
          <el-option label="全部状态" value="全部" />
          <el-option label="启用" value="启用" />
          <el-option label="停用" value="停用" />
        </el-select>

      </div>
    </div>

    <div class="table-area">
      <div class="table-header">
        <span>课程列表</span>
        <span class="table-count">显示 {{ paged.length }} / {{ total }} 条</span>
      </div>
      
      <el-table :data="paged" stripe style="width: 100%">
        <el-table-column prop="name" label="课程名称" min-width="200">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">{{ row.name }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.type === '通用' ? 'info' : row.type === '专业' ? 'success' : 'warning'">
              {{ row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '启用' ? 'success' : 'danger'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openEdit(row)" :icon="Edit">编辑</el-button>
            <el-button type="info" size="small" @click="openDetail(row)" :icon="View">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination-area">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[5, 10, 20]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <el-dialog
      v-model="showEdit"
      :title="editingId ? '修改课程' : '新增课程'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="课程名称" required>
          <el-input v-model="form.name" placeholder="请输入课程名称" />
        </el-form-item>
        <el-form-item label="课程类型">
          <el-select v-model="form.type" placeholder="请选择课程类型">
            <el-option label="通用" value="通用" />
            <el-option label="专业" value="专业" />
            <el-option label="安全" value="安全" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程状态">
          <el-select v-model="form.status" placeholder="请选择课程状态">
            <el-option label="启用" value="启用" />
            <el-option label="停用" value="停用" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属部门">
          <el-input :value="props.currentUser.department" disabled />
        </el-form-item>
          
        
      </el-form>
      
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">{{ editingId ? '保存' : '新增' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showDetail"
      title="课程详情"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="课程名称">{{ detail?.name }}</el-descriptions-item>
        <el-descriptions-item label="课程类型">
          <el-tag :type="detail?.type === '通用' ? 'info' : detail?.type === '专业' ? 'success' : 'warning'">
            {{ detail?.type }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="课程状态">
          <el-tag :type="detail?.status === '启用' ? 'success' : 'danger'">
            {{ detail?.status }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="所属部门">{{ detail?.department }}</el-descriptions-item>
        
        
      </el-descriptions>
      
      <template #footer>
        <el-button type="primary" @click="showDetail = false">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.course-page {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.page-header {
  background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

.title-area h1 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.title-area p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.add-button {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.add-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}

.filter-area {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.search-box {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  max-width: 400px;
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: #f8fafc;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  min-width: 120px;
  transition: all 0.3s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.table-area {
  background: white;
  border-radius: 16px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  color: #1e293b;
}

.table-count {
  color: #64748b;
  font-size: 14px;
}

.data-table {
  overflow: hidden;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.table-row.header {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-row:not(.header):hover {
  background: #f8fafc;
  transform: translateX(4px);
}

.row-alt {
  background: #fafbfc;
}

.course-name {
  cursor: pointer;
  color: #3b82f6;
  font-weight: 500;
}

.course-name:hover {
  text-decoration: underline;
}

.type-tag {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.type-通用 {
  background: #dbeafe;
  color: #1e40af;
}

.type-专业 {
  background: #dcfce7;
  color: #166534;
}

.type-安全 {
  background: #fef3c7;
  color: #92400e;
}

.status-tag {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-on {
  background: #dcfce7;
  color: #166534;
}

.status-off {
  background: #fee2e2;
  color: #991b1b;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.edit {
  background: #dbeafe;
  color: #1e40af;
}

.action-btn.edit:hover {
  background: #bfdbfe;
  transform: translateY(-1px);
}

.action-btn.view {
  background: #f3e8ff;
  color: #7c3aed;
}

.action-btn.view:hover {
  background: #e9d5ff;
  transform: translateY(-1px);
}

.empty-msg {
  padding: 60px 20px;
  text-align: center;
  color: #94a3b8;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.pagination-area {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.page-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
}

.divider {
  color: #cbd5e1;
}

.page-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-btn {
  padding: 10px 16px;
  border: 2px solid #e2e8f0;
  background: white;
  color: #475569;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-1px);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-current {
  font-weight: 600;
  color: #3b82f6;
  font-size: 18px;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 600px;
  max-width: 90vw;
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #475569;
}

.modal-body {
  padding: 24px;
}

.form-row {
  margin-bottom: 20px;
}

.form-row label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
}

.form-input, .form-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: white;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.disabled {
  background: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.btn-cancel, .btn-submit {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-submit {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.btn-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.btn-cancel {
  background: white;
  color: #6b7280;
  border: 2px solid #e5e7eb;
}

.btn-cancel:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.detail-body {
  padding: 0;
}

.detail-row {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  width: 120px;
  font-weight: 600;
  color: #374151;
}

.detail-value {
  flex: 1;
  color: #1f2937;
}

/* 实践项配置样式 */
.practice-items-container {
  width: 100%;
}

.practice-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.practice-select {
  flex: 1;
  min-width: 200px;
}

.required-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #374151;
  white-space: nowrap;
}

.required-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
}

.remove-btn {
  padding: 6px 12px;
  border: 1px solid #ef4444;
  background: white;
  color: #ef4444;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: #ef4444;
  color: white;
}

.add-practice-btn {
  width: 100%;
  padding: 12px;
  border: 2px dashed #d1d5db;
  background: white;
  color: #6b7280;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-practice-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #f0f9ff;
}

/* 实践项显示样式 */
.practice-items-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.practice-item-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.work-item-name {
  font-weight: 500;
  color: #374151;
}

.required-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #dcfce7;
  color: #166534;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
</style>
