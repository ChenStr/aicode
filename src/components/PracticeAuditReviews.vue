<script setup>
import { ref, computed, watch } from 'vue'
import { USERS } from '../user'
import { workItemsStore } from '../workItems'
import { trainingRecordsStore, updatePracticeAudit } from '../trainingRecords'
import { Tools, View, Check, Close, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import NoPermission from './NoPermission.vue'

const props = defineProps({ currentUser: { type: Object, required: true } })

// 角色判断
const role = computed(() => props.currentUser.role)
const isTrainingEngineer = computed(() => role.value === 'training_admin')
const isSectionChief = computed(() => role.value === 'section_chief')
const isDeptManager = computed(() => role.value === 'dept_manager')
const isAssessor = computed(() => role.value === 'assessor')

// 可见数据（部门范围或个人范围）
const departmentUsers = computed(() => USERS.filter(u => u.department === props.currentUser.department))
const departmentUserIds = computed(() => new Set(departmentUsers.value.map(u => u.id)))

const all = computed(() => trainingRecordsStore.practiceAudits)
const visibleAudits = computed(() => {
  if (isTrainingEngineer.value || isSectionChief.value || isDeptManager.value) {
    // 培训工程师、科长、部门经理：看本部门所有人的记录
    return all.value.filter(a => departmentUserIds.value.has(a.userId))
  }
  if (isAssessor.value) {
    // 考核员：仅看分配给自己的记录（待考核或已完成）
    return all.value.filter(a => a.assessorId === props.currentUser.id)
  }
  return []
})

// 显示辅助
function getWorkItemName(id) {
  const w = workItemsStore.items.find(w => w.id === id)
  return w ? w.name : id
}
function getUserName(id) {
  const u = USERS.find(u => u.id === id)
  return u ? u.name : id
}

// 筛选与分页
const keyword = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(10)

const filtered = computed(() => {
  let arr = visibleAudits.value
  const kw = keyword.value.trim()
  if (kw) {
    arr = arr.filter(a => getWorkItemName(a.workItemId).includes(kw) || getUserName(a.userId).includes(kw))
  }
  if (statusFilter.value) {
    arr = arr.filter(a => a.status === statusFilter.value)
  }
  return arr
})
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
watch([keyword, statusFilter, pageSize], () => { page.value = 1 })

// 审核（培训工程师）
const approveDialogVisible = ref(false)
const approveTarget = ref(null)
const approveForm = ref({ assessorId: '', trainingEngineerComment: '' })
const assessorOptions = computed(() => 
  departmentUsers.value
    .filter(u => u.role === 'assessor')
    .map(u => ({ label: `${u.name}（${u.department}｜${u.roleLabel}）`, value: u.id }))
)

function openApprove(row) {
  approveTarget.value = row
  approveForm.value = { assessorId: row.assessorId || '', trainingEngineerComment: row.trainingEngineerComment || '' }
  approveDialogVisible.value = true
}
function doApprove() {
  if (!approveTarget.value) return
  if (!approveForm.value.assessorId) {
    ElMessage.error('请先选择考核组成员')
    return
  }
  updatePracticeAudit(approveTarget.value.id, {
    status: 'assessor_assigned',
    trainingEngineerId: props.currentUser.id,
    trainingEngineerComment: approveForm.value.trainingEngineerComment || '',
    assessorId: approveForm.value.assessorId
  })
  ElMessage.success('已通过并分配考核组成员')
  approveDialogVisible.value = false
}

// 驳回（培训工程师）
const rejectDialogVisible = ref(false)
const rejectTarget = ref(null)
const rejectComment = ref('')
function openReject(row) {
  rejectTarget.value = row
  rejectComment.value = ''
  rejectDialogVisible.value = true
}
function doReject() {
  if (!rejectTarget.value) return
  updatePracticeAudit(rejectTarget.value.id, {
    status: 'rejected',
    trainingEngineerId: props.currentUser.id,
    trainingEngineerComment: rejectComment.value || ''
  })
  ElMessage.success('已驳回该实践考核')
  rejectDialogVisible.value = false
}

// 考核员填写考核
const assessDialogVisible = ref(false)
const assessTarget = ref(null)
const assessComment = ref('')
function openAssess(row) {
  assessTarget.value = row
  assessComment.value = row.assessorComment || ''
  assessDialogVisible.value = true
}
function doAssess(pass = true) {
  if (!assessTarget.value) return
  updatePracticeAudit(assessTarget.value.id, {
    status: pass ? 'assessed' : 'rejected',
    assessorId: props.currentUser.id,
    assessorComment: assessComment.value || ''
  })
  ElMessage.success(pass ? '已完成考核' : '已驳回考核')
  assessDialogVisible.value = false
}

// 考核组成员分配情况统计（供培训工程师参考）
const assessorStats = computed(() => {
  const assessors = departmentUsers.value.filter(u => u.role === 'assessor')
  return assessors.map(assessor => {
    const assigned = all.value.filter(a => a.assessorId === assessor.id)
    const pending = assigned.filter(a => a.status === 'assessor_assigned').length
    const completed = assigned.filter(a => a.status === 'assessed').length
    const rejected = assigned.filter(a => a.status === 'rejected').length
    return {
      id: assessor.id,
      name: assessor.name,
      total: assigned.length,
      pending,
      completed,
      rejected
    }
  })
})

// 状态文字/颜色
function getStatusText(s) {
  return {
    submitted: '已提交',
    training_approved: '培训工程师已审核',
    assessor_assigned: '待考核',
    assessed: '考核完成',
    rejected: '已驳回'
  }[s] || s
}
function getStatusType(s) {
  if (s === 'assessed') return 'success'
  if (s === 'rejected') return 'danger'
  if (s === 'assessor_assigned') return 'warning'
  return 'info'
}
</script>

<template>
  <section class="practice-audit-reviews">
    <div v-if="isTrainingEngineer || isSectionChief || isDeptManager || isAssessor" class="page-header">
      <div class="title">
        <el-icon><Tools /></el-icon>
        <span>实践考核记录评价</span>
      </div>
    </div>
    <NoPermission v-else />

    <!-- 考核组成员分配情况统计（仅培训工程师可见） -->
    <el-card v-if="isTrainingEngineer" class="stats-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>考核组成员分配情况</span>
          <span class="hint">供分配任务时参考</span>
        </div>
      </template>
      <el-table :data="assessorStats" size="small" stripe>
        <el-table-column prop="name" label="考核组成员" width="120" />
        <el-table-column prop="total" label="总分配数" width="100" />
        <el-table-column prop="pending" label="待考核" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.pending > 0" type="warning" size="small">{{ row.pending }}</el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column prop="completed" label="已完成" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.completed > 0" type="success" size="small">{{ row.completed }}</el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column prop="rejected" label="已驳回" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.rejected > 0" type="danger" size="small">{{ row.rejected }}</el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column label="工作负荷" width="120">
          <template #default="{ row }">
            <el-tag :type="row.pending <= 2 ? 'success' : row.pending <= 5 ? 'warning' : 'danger'" size="small">
              {{ row.pending <= 2 ? '轻松' : row.pending <= 5 ? '适中' : '繁忙' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <div v-if="isTrainingEngineer || isSectionChief || isDeptManager || isAssessor" class="filters">
      <el-form inline>
        <el-form-item label="关键字">
          <el-input v-model="keyword" placeholder="人员/实践项目" clearable style="width: 240px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusFilter" clearable placeholder="全部" style="width: 160px">
            <el-option label="已提交" value="submitted" />
            <el-option label="培训工程师已审核" value="training_approved" />
            <el-option label="待考核" value="assessor_assigned" />
            <el-option label="考核完成" value="assessed" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <el-table v-if="isTrainingEngineer || isSectionChief || isDeptManager || isAssessor" :data="paged" stripe>
      <el-table-column label="实践项目" min-width="200">
        <template #default="{ row }">{{ getWorkItemName(row.workItemId) }}</template>
      </el-table-column>
      <el-table-column label="提交人" width="140">
        <template #default="{ row }">{{ getUserName(row.userId) }}</template>
      </el-table-column>
      <el-table-column prop="submittedAt" label="提交时间" width="120" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="考核人" width="140">
        <template #default="{ row }">{{ row.assessorId ? getUserName(row.assessorId) : '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="320">
        <template #default="{ row }">
          <!-- 培训工程师：通过并分配 / 驳回 -->
          <template v-if="isTrainingEngineer">
            <el-button size="small" type="success" :icon="Check" @click="openApprove(row)" v-if="row.status==='submitted'">通过并分配</el-button>
            <el-button size="small" type="danger" :icon="Close" @click="openReject(row)" v-if="row.status==='submitted'">驳回</el-button>
          </template>
          <!-- 考核员：填写考核（仅分配给自己且待考核） -->
          <template v-else-if="isAssessor">
            <el-button size="small" type="primary" :icon="User" @click="openAssess(row)" v-if="row.assessorId===props.currentUser.id && row.status==='assessor_assigned'">填写考核</el-button>
          </template>
          <!-- 科长、经理：查看，无操作 -->
          <template v-else>
            <el-tag size="small">仅查看</el-tag>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        layout="prev, pager, next, jumper, total"
        :total="filtered.length"
        :current-page="page"
        :page-size="pageSize"
        @current-change="(p)=> page = p"
      />
    </div>

    <!-- 通过并分配考核员 -->
    <el-dialog v-model="approveDialogVisible" title="通过并分配考核组成员" width="520px">
      <el-form label-width="120px">
        <el-form-item label="考核组成员">
          <el-select v-model="approveForm.assessorId" placeholder="请选择考核组成员" filterable style="width: 100%">
            <el-option v-for="op in assessorOptions" :key="op.value" :label="op.label" :value="op.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input v-model="approveForm.trainingEngineerComment" type="textarea" :rows="3" placeholder="可填写审核意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="doApprove">确定</el-button>
      </template>
    </el-dialog>

    <!-- 驳回 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回实践考核" width="480px">
      <el-form label-width="100px">
        <el-form-item label="驳回意见">
          <el-input v-model="rejectComment" type="textarea" :rows="3" placeholder="请输入驳回意见（建议必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible=false">取消</el-button>
        <el-button type="danger" @click="doReject">确认驳回</el-button>
      </template>
    </el-dialog>

    <!-- 考核员填写考核 -->
    <el-dialog v-model="assessDialogVisible" title="填写考核" width="520px">
      <el-form label-width="120px">
        <el-form-item label="考核意见">
          <el-input v-model="assessComment" type="textarea" :rows="4" placeholder="请填写考核意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assessDialogVisible=false">取消</el-button>
        <el-button type="danger" @click="()=>doAssess(false)">不通过</el-button>
        <el-button type="primary" @click="()=>doAssess(true)">通过并完成</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.practice-audit-reviews { display: flex; flex-direction: column; gap: 12px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 18px; }
.stats-card { margin-bottom: 12px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.hint { font-size: 12px; color: #64748b; }
.filters { background: #fff; padding: 10px; border-radius: 8px; }
.pagination { display: flex; justify-content: flex-end; padding: 10px 0; }
</style>


