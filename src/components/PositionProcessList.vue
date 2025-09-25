<script setup>
import { ref, computed, watch } from 'vue'
import { listMyPositionProcesses, addPositionProcess, positionProcessesStore, getPositionProcessTypeText, getPositionProcessStatusType } from '../positionProcesses'
import { positionsStore } from '../positions'
import { positionPlansStore } from '../positionPlans'
import { USERS } from '../user'
import { Plus, Select, Tickets, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['open-apply-detail', 'open-equivalent-detail', 'open-extend-detail', 'open-assessment-detail'])

const props = defineProps({ currentUser: { type: Object, required: true } })

// 列表与筛选
const keyword = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const page = ref(1)
const pageSize = ref(10)

const isAdminRole = computed(() => ['training_admin','section_chief','dept_manager'].includes(props.currentUser.role))
const isTrainingDeptManager = computed(() => props.currentUser.role === 'dept_manager' && props.currentUser.department === '培训部')
const deptUserIds = computed(() => new Set(USERS.filter(u => u.department === props.currentUser.department).map(u => u.id)))
const allUserIds = computed(() => new Set(USERS.map(u => u.id)))

const baseList = computed(() => {
  if (isTrainingDeptManager.value) {
    // 培训部部门经理：可看本部门所有流程 + 所有部门的岗位等效流程
    return positionProcessesStore.processes.filter(p => p.type === 'equivalent' || deptUserIds.value.has(p.userId))
  } else if (isAdminRole.value) {
    // 其他管理员（培训工程师/科长/部门经理）：仅看本部门所有人的流程
    return positionProcessesStore.processes.filter(p => deptUserIds.value.has(p.userId))
  }
  // 普通用户：只看自己的流程
  return listMyPositionProcesses(props.currentUser.id)
})

function getPositionName(positionId) {
  const position = positionsStore.items.find(p => p.id === positionId)
  return position ? `${position.name}（${position.level}）` : positionId
}

function getUserName(userId) {
  const user = USERS.find(u => u.id === userId)
  return user ? user.name : userId
}

function getStatusType(s) { 
  return getPositionProcessStatusType(s)
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return baseList.value.filter(p => {
    const hitKw = !kw || getPositionName(p.targetPositionId).toLowerCase().includes(kw) || getPositionProcessTypeText(p.type).toLowerCase().includes(kw)
    const hitStatus = !statusFilter.value || p.status === statusFilter.value
    const hitType = !typeFilter.value || p.type === typeFilter.value
    return hitKw && hitStatus && hitType
  })
})

const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

// 发起流程对话框
const startDialog = ref(false)
const startType = ref('apply')
const selectedPositionId = ref('') // 用于 apply/assessment
const availablePlans = ref([])
const assessmentPositions = computed(() => positionsStore.items.filter(p => p.department === props.currentUser.department))

// 等效流程：来源岗位（只读）与目标岗位
const myLatestApprovedPosition = computed(() => {
  const rows = listMyPositionProcesses(props.currentUser.id).filter(p => p.status === 'approved')
  if (!rows.length) return null
  return [...rows].sort((a,b)=> (a.createdAt < b.createdAt ? 1 : -1))[0]
})
const myDeptPositions = computed(() => positionsStore.items.filter(p => p.department === props.currentUser.department))
const sourcePositionId = computed(() => myLatestApprovedPosition.value?.targetPositionId || myDeptPositions.value[0]?.id || '')
const selectedTargetPositionId = ref('')
const equivalentTargetOptions = computed(() => myDeptPositions.value)

// 延期流程：当前岗位和延期年限
const currentPosition = computed(() => {
  if (!props.currentUser) return null
  const deptPositions = positionsStore.items.filter(p => p.department === props.currentUser.department)
  return deptPositions.length > 0 ? deptPositions[0] : null
})
const extendYears = ref(1)

// 获取当前登录用户作为规划人员的正在进行中的岗位规划
function getAvailablePositionPlans() {
  return positionPlansStore.items
    .filter(plan => 
      plan.status === 'in_progress' && 
      plan.userId === props.currentUser.id // 只显示当前登录用户作为规划人员的岗位规划
    )
    .map(plan => {
      // 根据岗位名称找到对应的岗位ID
      const position = positionsStore.items.find(p => p.name === plan.targetPosition)
      return {
        id: plan.id,
        positionId: position ? position.id : null,
        targetPosition: plan.targetPosition,
        department: plan.department,
        status: plan.status
      }
    })
    .filter(plan => plan.positionId) // 只保留能找到对应岗位定义的规划
}

// 打开发起流程对话框
function openStart() {
  startDialog.value = true
  startType.value = 'apply'
  selectedPositionId.value = ''
  availablePlans.value = getAvailablePositionPlans()
}

// 处理流程类型变化
function handleTypeChange() {
  selectedPositionId.value = ''
  selectedTargetPositionId.value = ''
  extendYears.value = 1
  if (startType.value === 'apply') {
    availablePlans.value = getAvailablePositionPlans()
  }
}

// 确认并进入详情页面
function confirmAndEnterDetail() {
  if (!startType.value) {
    ElMessage.warning('请选择流程类型')
    return
  }
  
  if ((startType.value === 'apply' || startType.value === 'assessment') && !selectedPositionId.value) {
    ElMessage.warning('请选择目标岗位')
    return
  }
  
  startDialog.value = false
  
  // 根据流程类型跳转到对应的详情页面
  if (startType.value === 'apply') {
    emit('open-apply-detail', selectedPositionId.value, { type: 'apply' })
  } else if (startType.value === 'equivalent') {
    // 仅将选择结果传入详情页，待申请人在详情页提交时再创建数据
    if (!sourcePositionId.value) { ElMessage.warning('无法识别来源岗位'); return }
    if (!selectedTargetPositionId.value) { ElMessage.warning('请选择目标岗位'); return }
    if (selectedTargetPositionId.value === sourcePositionId.value) { ElMessage.warning('目标岗位不能与来源岗位相同'); return }
    const draft = {
      userId: props.currentUser.id,
      type: 'equivalent',
      sourcePositionId: sourcePositionId.value,
      targetPositionId: selectedTargetPositionId.value,
      reason: '岗位等效申请'
    }
    emit('open-equivalent-detail', draft)
  } else if (startType.value === 'extend') {
    // 延期流程：传入当前岗位和延期年限
    const draft = {
      userId: props.currentUser.id,
      type: 'extend',
      targetPositionId: currentPosition.value?.id,
      extendYears: extendYears.value,
      reason: '岗位延期申请'
    }
    emit('open-extend-detail', draft)
  } else if (startType.value === 'assessment') {
    emit('open-apply-detail', selectedPositionId.value, { type: 'assessment' })
  }
}

function viewDetail(row) {
  if (row.type === 'apply') {
    emit('open-apply-detail', row.targetPositionId, row)
  } else if (row.type === 'equivalent') {
    emit('open-equivalent-detail', row)
  } else if (row.type === 'extend') {
    emit('open-extend-detail', row)
  } else if (row.type === 'assessment') {
    emit('open-apply-detail', row.targetPositionId, row)
  }
}

</script>

<template>
  <section class="position-process-page">
    <div class="page-header">
      <div class="title">
        <el-icon><Tickets /></el-icon>
        <span>岗位发起流程</span>
      </div>
      <el-button type="primary" :icon="Plus" @click="openStart">发起流程</el-button>
    </div>

    <div class="filters">
      <el-form inline>
        <el-form-item label="关键字">
          <el-input v-model="keyword" placeholder="流程类型/目标岗位" clearable style="width: 220px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusFilter" clearable placeholder="全部" style="width: 160px">
            <el-option label="流程中" value="in_progress" />
            <el-option label="驳回" value="rejected" />
            <el-option label="通过" value="approved" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="typeFilter" clearable placeholder="全部" style="width: 180px">
            <el-option label="岗位申请" value="apply" />
            <el-option label="岗位等效" value="equivalent" />
            <el-option label="岗位延期" value="extend" />
            <el-option label="社聘/转岗人员考核" value="assessment" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="paged" stripe>
      <el-table-column label="流程类型" width="140">
        <template #default="{ row }">{{ getPositionProcessTypeText(row.type) }}</template>
      </el-table-column>
      <el-table-column label="目标岗位" min-width="220">
        <template #default="{ row }">{{ getPositionName(row.targetPositionId) }}</template>
      </el-table-column>
      <el-table-column label="发起人" width="100">
        <template #default="{ row }">{{ getUserName(row.userId) }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="发起时间" width="140" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ row.status === 'in_progress' ? '流程中' : row.status === 'approved' ? '通过' : '驳回' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="currentNode" label="当前处理节点" width="160" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" type="primary" :icon="View" @click="viewDetail(row)">查看详情</el-button>
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

    <!-- 发起流程对话框 -->
    <el-dialog v-model="startDialog" title="发起流程" width="620px">
      <el-form label-width="120px">
        <el-form-item label="流程类型" required>
          <el-select v-model="startType" placeholder="请选择流程类型" style="width: 100%" @change="handleTypeChange">
            <el-option label="岗位申请" value="apply" />
            <el-option label="岗位等效" value="equivalent" />
            <el-option label="岗位延期" value="extend" />
            <el-option label="社聘/转岗人员考核" value="assessment" />
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="startType === 'apply'" label="目标岗位" required>
          <el-select v-model="selectedPositionId" placeholder="请选择目标岗位" style="width: 100%">
            <el-option 
              v-for="plan in availablePlans" 
              :key="plan.positionId" 
              :label="`${plan.targetPosition}（${plan.department}）`" 
              :value="plan.positionId" 
            />
          </el-select>
          <div class="form-tip">
            只能选择您作为规划人员且状态为"进行中"的岗位规划
          </div>
          <div v-if="availablePlans.length === 0" class="form-warning">
            暂无可申请的岗位，请先创建岗位规划或联系管理员
          </div>
        </el-form-item>

        <el-form-item v-if="startType === 'assessment'" label="目标岗位" required>
          <el-select v-model="selectedPositionId" placeholder="请选择目标岗位" filterable style="width: 100%">
            <el-option 
              v-for="pos in assessmentPositions" 
              :key="pos.id" 
              :label="`${pos.name}（${pos.level}）`" 
              :value="pos.id" 
            />
          </el-select>
          <div class="form-tip">
            社聘/转岗考核需直接选择本部门的目标岗位
          </div>
        </el-form-item>
        
        <template v-if="startType === 'equivalent'">
          <el-form-item label="来源岗位">
            <el-input :model-value="equivalentTargetOptions.find(p=>p.id===sourcePositionId)?.name || '未识别'" disabled />
            <div class="form-tip">来源岗位为当前已授权岗位；不可修改</div>
          </el-form-item>
          <el-form-item label="目标岗位" required>
            <el-select v-model="selectedTargetPositionId" placeholder="请选择目标岗位" filterable style="width: 100%">
              <el-option 
                v-for="pos in equivalentTargetOptions" 
                :key="pos.id" 
                :label="`${pos.name}（${pos.level}）`" 
                :value="pos.id" 
              />
            </el-select>
          </el-form-item>
        </template>

        <template v-if="startType === 'extend'">
          <el-form-item label="当前岗位">
            <el-input :model-value="currentPosition?.name || '未识别'" disabled />
            <div class="form-tip">当前岗位不可修改</div>
          </el-form-item>
          <el-form-item label="延期年限" required>
            <el-input-number 
              v-model="extendYears" 
              :min="1" 
              :max="10" 
              style="width: 200px"
            />
            <span style="margin-left: 8px; color: #666;">年</span>
          </el-form-item>
        </template>
        
        <el-form-item v-if="startType !== 'apply'" label="说明">
          <div class="form-tip">
            {{ startType === 'equivalent' ? '岗位等效：申请将现有岗位等效为其他岗位' : 
               startType === 'extend' ? '岗位延期：申请延长当前岗位的有效期' : 
               '社聘/转岗人员考核：对社聘或转岗人员进行考核' }}
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="startDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAndEnterDetail">确认</el-button>
      </template>
    </el-dialog>

  </section>
</template>

<style scoped>
.position-process-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: #213547;
}

.filters {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.ml-2 {
  margin-left: 8px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.form-warning {
  font-size: 12px;
  color: #e6a23c;
  margin-top: 4px;
  font-weight: 500;
}
</style>
