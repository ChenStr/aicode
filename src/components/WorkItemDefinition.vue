<script setup>
import { ref, computed, watch } from 'vue'
import { listWorkItemsByDept, addWorkItem, updateWorkItem } from '../workItems'
import { Tools, Plus, Search, Edit, View } from '@element-plus/icons-vue'
import NoPermission from './NoPermission.vue'

const props = defineProps({ currentUser: { type: Object, required: true } })
const allowedRoles = ['section_chief','training_admin','dept_manager']
const isAllowed = computed(() => allowedRoles.includes(props.currentUser.role))

// 筛选与分页
const keyword = ref('')
const typeFilter = ref('全部')
const page = ref(1)
const pageSize = ref(5)

const baseList = computed(() => listWorkItemsByDept(props.currentUser.department))

const filtered = computed(() => {
  const kw = keyword.value.trim()
  return baseList.value.filter(i => {
    if (typeFilter.value !== '全部' && i.type !== typeFilter.value) return false
    if (kw && !(`${i.name}${i.type}`.toLowerCase().includes(kw.toLowerCase()))) return false
    return true
  })
})

const total = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

watch([keyword, typeFilter, pageSize], () => { page.value = 1 })

// 弹窗：新增/编辑
const showEdit = ref(false)
const editingId = ref('')
const form = ref({ name: '', type: '技能' })

function openAdd() {
  editingId.value = ''
  form.value = { name: '', type: '技能' }
  showEdit.value = true
}
function openEdit(row) {
  editingId.value = row.id
  form.value = { name: row.name, type: row.type }
  showEdit.value = true
}
function submitEdit() {
  if (!form.value.name.trim()) return
  if (editingId.value) {
    updateWorkItem(editingId.value, { name: form.value.name.trim(), type: form.value.type })
  } else {
    addWorkItem({ name: form.value.name.trim(), type: form.value.type, department: props.currentUser.department })
  }
  showEdit.value = false
}

// 弹窗：详情
const showDetail = ref(false)
const detail = ref(null)
function openDetail(row) { detail.value = row; showDetail.value = true }
</script>

<template>
  <section class="course-panel">
    <template v-if="isAllowed">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <el-icon class="title-icon"><Tools /></el-icon>
          <div>
            <h2 class="page-title">工作项定义</h2>
            <p class="page-subtitle">{{ props.currentUser.department }} · 共 {{ total }} 个工作项</p>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="openAdd" :icon="Plus">新增工作项</el-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <div class="filter-group">
        <div class="search-box">
          <el-input
            v-model="keyword"
            placeholder="搜索名称或类型..."
            :prefix-icon="Search"
            clearable
          />
        </div>
        <div class="filter-controls">
          <el-select v-model="typeFilter" placeholder="类型">
            <el-option label="全部" value="全部" />
            <el-option label="技能" value="技能" />
            <el-option label="实践" value="实践" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table :data="paged" stripe style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="200">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">{{ row.name }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.type === '技能' ? 'success' : 'warning'">{{ row.type }}</el-tag>
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

    <!-- 分页 -->
    <div class="pagination-section">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[5, 10, 20]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="showEdit"
      :title="editingId ? '修改工作项' : '新增工作项'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" placeholder="请选择">
            <el-option label="技能" value="技能" />
            <el-option label="实践" value="实践" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-input :value="props.currentUser.department" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">{{ editingId ? '保存修改' : '确认新增' }}</el-button>
      </template>
    </el-dialog>
    </template>
    <NoPermission v-else />

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="showDetail"
      title="工作项详情"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="名称">{{ detail?.name }}</el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="detail?.type === '技能' ? 'success' : 'warning'">{{ detail?.type }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="部门">{{ detail?.department }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button type="primary" @click="showDetail = false">知道了</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
/* 复用课程定义的美化样式，保证统一视觉 */
.course-panel { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 20px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.title-section { display: flex; align-items: center; gap: 16px; }
.icon-wrapper { width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(59,130,246,0.3); }
.title-icon { font-size: 28px; }
.page-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
.add-btn { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: .3s; box-shadow: 0 4px 15px rgba(16,185,129,.3); }
.add-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(16,185,129,.4); }

.filter-section { margin-bottom: 24px; padding: 20px; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.06); }
.filter-group { display: flex; flex-direction: column; gap: 16px; }
.search-box { position: relative; max-width: 400px; }
.search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 18px; color: #94a3b8; }
.search-input { width: 100%; padding: 14px 16px 14px 48px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 14px; transition: .3s; background: #f8fafc; }
.search-input:focus { outline: none; border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
.filter-controls { display: flex; gap: 20px; flex-wrap: wrap; }
.filter-item { display: flex; flex-direction: column; gap: 6px; }
.filter-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px; }
.filter-select { padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 14px; min-width: 120px; transition: .3s; }
.filter-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }

.table-container { margin-bottom: 24px; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.06); }
.table-header { display: flex; align-items: center; justify-content: space-between; padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-bottom: 1px solid #e2e8f0; }
.table-title { font-size: 18px; font-weight: 600; color: #1e293b; }
.table-stats { font-size: 14px; color: #64748b; }
.data-table { overflow: hidden; }
.table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; transition: .2s; }
.table-row.header { background: #f8fafc; font-weight: 600; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: .5px; }
.table-row:not(.header):hover { background: #f8fafc; transform: translateX(4px); }
.row-even { background: #fafbfc; }
.col-name, .col-type, .col-dept, .col-actions { padding: 0 8px; }
.course-name { cursor: pointer; position: relative; }
.name-text { font-weight: 500; color: #1e293b; }
.click-hint { font-size: 12px; color: #94a3b8; margin-left: 8px; opacity: 0; transition: opacity .2s; }
.course-name:hover .click-hint { opacity: 1; }
.type-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-align: center; background: #e0e7ff; color: #3730a3; }
.action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border: none; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; transition: .2s; margin-right: 8px; }
.action-btn.edit { background: #dbeafe; color: #1e40af; }
.action-btn.edit:hover { background: #bfdbfe; transform: translateY(-1px); }
.action-btn.detail { background: #f3e8ff; color: #7c3aed; }
.action-btn.detail:hover { background: #e9d5ff; transform: translateY(-1px); }
.action-icon { font-size: 14px; }
.empty-state { padding: 60px 20px; text-align: center; color: #94a3b8; }
.empty-icon { font-size: 48px; margin-bottom: 16px; opacity: .5; }

.pagination-section { display: flex; align-items: center; justify-content: space-between; padding: 20px; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.06); }
.pagination-info { display: flex; align-items: center; gap: 12px; color: #64748b; font-size: 14px; }
.divider { color: #cbd5e1; }
.pagination-controls { display: flex; align-items: center; gap: 16px; }
.page-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: 2px solid #e2e8f0; background: #fff; color: #475569; border-radius: 10px; font-weight: 500; cursor: pointer; transition: .2s; }
.page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; transform: translateY(-1px); }
.page-btn:disabled { opacity: .5; cursor: not-allowed; }
.page-icon { font-size: 12px; }
.page-numbers { display: flex; align-items: center; gap: 4px; font-weight: 600; }
.current-page { color: #3b82f6; font-size: 18px; }
.page-separator { color: #cbd5e1; }
.total-pages { color: #64748b; }

/* 弹窗样式，与课程定义一致 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
.modal-dialog { width: 560px; max-width: 90vw; background: #fff; border-radius: 20px; box-shadow: 0 25px 50px rgba(0,0,0,.25); overflow: hidden; animation: modalSlideIn .3s ease; }
@keyframes modalSlideIn { from { opacity: 0; transform: translateY(-20px) scale(.95);} to { opacity: 1; transform: translateY(0) scale(1);} }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%); border-bottom: 1px solid #e2e8f0; }
.modal-title { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 600; color: #1e293b; }
.modal-icon { font-size: 20px; }
.close-btn { width: 32px; height: 32px; border: none; background: #f1f5f9; color: #64748b; border-radius: 8px; cursor: pointer; transition: .2s; display:flex; align-items:center; justify-content:center; }
.close-btn:hover { background: #e2e8f0; color: #475569; }
.modal-body { padding: 20px; }
.form-group { margin-bottom: 16px; }
.form-label { display:block; margin-bottom: 8px; font-weight: 600; color:#374151; }
.required { color:#ef4444; }
.form-input, .form-select { width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 14px; transition: .3s; background: #fff; }
.form-input:focus, .form-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
.form-input.disabled { background: #f9fafb; color: #6b7280; cursor: not-allowed; }
.modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 16px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb; }
.btn-primary, .btn-secondary { padding: 10px 18px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: .2s; }
.btn-primary { background: linear-gradient(135deg,#3b82f6 0%, #1d4ed8 100%); color: #fff; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(59,130,246,.3); }
.btn-secondary { background: #fff; color: #6b7280; border: 2px solid #e5e7eb; }
.btn-secondary:hover { background: #f9fafb; border-color: #d1d5db; }
.detail-content { padding: 0; }
.detail-item { display:flex; align-items:center; padding: 14px 20px; border-bottom: 1px solid #f3f4f6; }
.detail-item:last-child { border-bottom: none; }
.detail-label { width: 120px; font-weight: 600; color:#374151; }
.detail-value { flex:1; color:#1f2937; }
</style>
