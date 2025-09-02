<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { USERS, currentUser } from '../user'
import { listPositionsByDept } from '../positions'
import { positionPlansStore, listPlansByDept, listPlansByUser, addPlan, updatePlan, removePlan, approvePlan, rejectPlan, getUserLabel } from '../positionPlans'

const props = defineProps({ currentUser: { type: Object, required: true } })

// 角色能力
const canAssign = computed(() => ['section_chief','dept_manager'].includes(props.currentUser.role))
const isTrainingAdmin = computed(() => props.currentUser.role === 'training_admin')
const isManager = computed(() => props.currentUser.role === 'dept_manager')
const isSectionChief = computed(() => props.currentUser.role === 'section_chief')
const isEmployeeLike = computed(() => ['employee','assessor'].includes(props.currentUser.role))

// 列表筛选与分页
const keyword = ref('')
const statusFilter = ref('全部')
const page = ref(1)
const pageSize = ref(10)

const baseList = computed(() => {
  if (isEmployeeLike.value) {
    return listPlansByUser(props.currentUser.id)
  }
  return listPlansByDept(props.currentUser.department)
})

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return baseList.value.filter(p => {
    if (statusFilter.value !== '全部' && p.status !== statusFilter.value) return false
    if (kw && !(`${p.targetPosition}${getUserLabel(p.userId)}${p.description}`.toLowerCase().includes(kw))) return false
    return true
  })
})

const total = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

watch([keyword, statusFilter, pageSize], () => { page.value = 1 })

// 选项
const positionOptions = computed(() => listPositionsByDept(props.currentUser.department).map(p => ({ label: p.name, value: p.name })))
const userOptions = computed(() => USERS.filter(u => u.department === props.currentUser.department).map(u => ({ label: `${u.name}（${u.department}｜${u.roleLabel}）`, value: u.id })))

// 弹窗 & 表单
const showEdit = ref(false)
const editingId = ref('')
const form = ref({ targetPosition: '', userId: '', description: '', improvementSuggestion: '', status: 'pending_training', source: 'employee', department: '' })

function openAdd(source = 'employee') {
  editingId.value = ''
  form.value = {
    targetPosition: '',
    userId: source === 'employee' ? props.currentUser.id : '',
    description: '',
    improvementSuggestion: '',
    status: (source === 'leader_assign' || source === 'hr_auto') ? 'in_progress' : 'pending_training',
    source,
    department: props.currentUser.department,
    createdBy: props.currentUser.id
  }
  showEdit.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = { ...row }
  showEdit.value = true
}

function submitEdit() {
  if (!form.value.targetPosition) return
  if (!form.value.userId) return
  // 校验：同一员工只能有一个活跃中的岗位规划
  if (!editingId.value) {
    const activeSet = new Set(['pending_training','pending_section','pending_manager','in_progress'])
    const hasActive = positionPlansStore.items.some(p => p.userId === form.value.userId && activeSet.has(p.status) && p.id !== editingId.value)
    if (hasActive) {
      ElMessage.error('该人员已有一个正在活跃中的岗位规划，不能重复创建')
      return
    }
  }
  if (editingId.value) {
    updatePlan(editingId.value, { ...form.value })
  } else {
    addPlan({ ...form.value })
  }
  showEdit.value = false
}

// 详情
const showDetail = ref(false)
const detail = ref(null)
function openDetail(row) { detail.value = row; showDetail.value = true }

// 审批操作（弹窗）
const showApprove = ref(false)
const approveTarget = ref(null)
const approveComment = ref('')
function openApprove(row) {
  approveTarget.value = row
  approveComment.value = ''
  showApprove.value = true
}
function doApprove() {
  if (!approveTarget.value) return
  approvePlan(approveTarget.value.id, props.currentUser)
  ElMessage.success('已通过审批')
  showApprove.value = false
}
function doReject() {
  if (!approveTarget.value) return
  rejectPlan(approveTarget.value.id, props.currentUser, approveComment.value || '')
  ElMessage.success('已驳回')
  showApprove.value = false
}

// 状态文本
function statusLabel(s) {
  return {
    draft: '草稿',
    pending_training: '待培训工程师审批',
    pending_section: '待科长审批',
    pending_manager: '待部门经理审批',
    in_progress: '进行中',
    rejected: '已驳回',
    completed: '已完成',
  }[s] || s
}
</script>

<template>
  <section class="position-plan-panel">
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <el-icon class="title-icon"><Memo /></el-icon>
          <div>
            <h2 class="page-title">岗位规划</h2>
            <p class="page-subtitle">{{ props.currentUser.department }} · 共 {{ total }} 条</p>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Plus" @click="openAdd('employee')">发起岗位规划</el-button>
        <el-button v-if="canAssign" :icon="User" @click="openAdd('leader_assign')">岗位指派</el-button>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-group">
        <div class="search-box">
          <el-input v-model="keyword" placeholder="搜索岗位/人员/说明..." :prefix-icon="Search" clearable />
        </div>
        <div class="filter-controls">
          <el-select v-model="statusFilter" placeholder="全部状态" clearable>
            <el-option label="全部" value="全部" />
            <el-option label="待培训工程师审批" value="pending_training" />
            <el-option label="待科长审批" value="pending_section" />
            <el-option label="待部门经理审批" value="pending_manager" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已驳回" value="rejected" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </div>
      </div>
    </div>

    <div class="table-container">
      <el-table :data="paged" stripe style="width: 100%">
        <el-table-column prop="targetPosition" label="计划岗位" min-width="180" />
        <el-table-column prop="userId" label="人员" min-width="200">
          <template #default="{ row }">{{ getUserLabel(row.userId) }}</template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="120">
          <template #default="{ row }">
            <el-tag :type="row.source==='employee'?'info':row.source==='leader_assign'?'warning':'success'">
              {{ row.source==='employee'?'员工发起': row.source==='leader_assign'?'岗位指派':'HR自动' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="160">
          <template #default="{ row }">
            <el-tag :type="row.status==='rejected'?'danger': row.status==='in_progress'?'success': 'info'">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="120" />
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button size="small" :icon="View" @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="row.source==='employee' && row.createdBy===props.currentUser.id"
              size="small" type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="row.source==='employee' && row.createdBy===props.currentUser.id"
              size="small" type="danger" :icon="Delete" @click="removePlan(row.id)">删除</el-button>
            <el-divider v-if="(isTrainingAdmin && row.status==='pending_training') || (isSectionChief && row.status==='pending_section') || (isManager && row.status==='pending_manager')" direction="vertical" />
            <el-button
              v-if="(isTrainingAdmin && row.status==='pending_training') || (isSectionChief && row.status==='pending_section') || (isManager && row.status==='pending_manager')"
              size="small" type="success" :icon="Check" @click="openApprove(row)">审批</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

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

    <!-- 新增/编辑 -->
    <el-dialog v-model="showEdit" :title="editingId ? '修改岗位规划' : '新增岗位规划'" width="700px" :close-on-click-modal="false">
      <el-form :model="form" label-width="100px">
        <el-form-item label="计划岗位" required>
          <el-select v-model="form.targetPosition" placeholder="请选择计划岗位">
            <el-option v-for="p in positionOptions" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="人员" required>
          <el-select v-model="form.userId" :disabled="form.source==='employee'" placeholder="请选择人员">
            <el-option v-for="u in userOptions" :key="u.value" :label="u.label" :value="u.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="说明规划原因、目标路线等" />
        </el-form-item>
        <el-form-item label="改进建议" v-if="editingId">
          <el-input v-model="form.improvementSuggestion" type="textarea" :rows="2" placeholder="用于审批驳回时给出建议" />
        </el-form-item>
        <el-form-item label="来源">
          <el-tag>{{ form.source==='employee'?'员工发起': form.source==='leader_assign'?'岗位指派':'HR自动' }}</el-tag>
        </el-form-item>
        <el-form-item label="状态">
          <el-tag :type="form.status==='rejected'?'danger': form.status==='in_progress'?'success':'info'">{{ statusLabel(form.status) }}</el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit=false">取消</el-button>
        <el-button type="primary" @click="submitEdit">{{ editingId ? '保存修改' : '确认新增' }}</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog v-model="showDetail" title="岗位规划详情" width="800px" :close-on-click-modal="false">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="计划岗位">{{ detail?.targetPosition }}</el-descriptions-item>
        <el-descriptions-item label="人员">{{ getUserLabel(detail?.userId) }}</el-descriptions-item>
        <el-descriptions-item label="来源">
          <el-tag :type="detail?.source==='employee'?'info':detail?.source==='leader_assign'?'warning':'success'">{{ detail?.source==='employee'?'员工发起': detail?.source==='leader_assign'?'岗位指派':'HR自动' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detail?.status==='rejected'?'danger': detail?.status==='in_progress'?'success':'info'">{{ statusLabel(detail?.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="说明" :span="2">{{ detail?.description }}</el-descriptions-item>
        <el-descriptions-item label="改进建议" :span="2">{{ detail?.improvementSuggestion }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button type="primary" @click="showDetail=false">知道了</el-button>
      </template>
    </el-dialog>

    <!-- 审批弹窗 -->
    <el-dialog v-model="showApprove" title="岗位规划审批" width="600px" :close-on-click-modal="false">
      <el-descriptions :column="2" border style="margin-bottom: 12px;">
        <el-descriptions-item label="计划岗位">{{ approveTarget ? approveTarget.targetPosition : '' }}</el-descriptions-item>
        <el-descriptions-item label="人员">{{ approveTarget ? getUserLabel(approveTarget.userId) : '' }}</el-descriptions-item>
        <el-descriptions-item label="当前状态" :span="2">
          <el-tag :type="approveTarget && approveTarget.status==='rejected'?'danger': approveTarget && approveTarget.status==='in_progress'?'success':'info'">{{ statusLabel(approveTarget ? approveTarget.status : '') }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <el-form label-width="100px">
        <el-form-item label="审批意见">
          <el-input v-model="approveComment" type="textarea" :rows="3" placeholder="请输入审批意见（驳回时必填建议更清晰）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showApprove=false">取消</el-button>
        <el-button type="warning" :icon="Close" @click="doReject()">驳回</el-button>
        <el-button type="primary" :icon="Check" @click="doApprove()">通过</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.position-plan-panel { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 20px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.title-section { display: flex; align-items: center; gap: 12px; }
.title-icon { font-size: 24px; }
.page-title { margin: 0; font-size: 20px; }
.page-subtitle { margin: 0; opacity: .7; font-size: 12px; }
.filter-section { margin-bottom: 16px; }
.filter-group { display: flex; gap: 12px; flex-wrap: wrap; }
.filter-controls { display:flex; gap:12px; flex-wrap:wrap; }
.table-container { margin-top: 8px; }
.pagination-section { display:flex; justify-content:flex-end; padding: 12px 0; }
</style>

