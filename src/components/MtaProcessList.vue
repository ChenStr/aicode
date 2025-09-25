<script setup>
import { ref, computed, watch } from 'vue'
import { listMyProcesses, addProcess, listMyMtaCerts, mtaProcessesStore } from '../mtaProcesses'
import { mtaAuthsStore } from '../mtaAuths'
import { USERS } from '../user'
import { Plus, Select, Tickets, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import MtaApplyDetail from './MtaApplyDetail.vue'
const emit = defineEmits(['open-apply-detail', 'open-equivalent-detail', 'open-extend-detail'])

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
    // 培训部部门经理：可看本部门所有流程 + 所有部门的MTA等效流程
    return mtaProcessesStore.processes.filter(p => p.type === 'equivalent' || deptUserIds.value.has(p.userId))
  } else if (isAdminRole.value) {
    // 其他管理员（培训工程师/科长/部门经理）：仅看本部门所有人的流程
    return mtaProcessesStore.processes.filter(p => deptUserIds.value.has(p.userId))
  }
  // 普通用户：只看自己的流程
  return listMyProcesses(props.currentUser.id)
})

function getMtaName(mtaId) {
  const m = mtaAuthsStore.items.find(m => m.id === mtaId)
  return m ? `${m.techName}（${m.code}）` : mtaId
}

function getUserName(userId) {
  const user = USERS.find(u => u.id === userId)
  return user ? user.name : userId
}

function getTypeText(t) { return t === 'apply' ? 'MTA授权申请' : t === 'equivalent' ? 'MTA授权等效' : 'MTA授权延期' }
function getStatusType(s) { return s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning' }

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return baseList.value.filter(p => {
    const hitKw = !kw || getMtaName(p.targetMtaId).toLowerCase().includes(kw) || getTypeText(p.type).toLowerCase().includes(kw)
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
const startTargetMtaId = ref('')
const startSourceMtaId = ref('')
const startYears = ref(1)
const startReason = ref('')

// 从已完成的流程中获取用户已获得的MTA授权
const myCerts = computed(() => {
  const completedProcesses = mtaProcessesStore.processes.filter(p => 
    p.userId === props.currentUser.id && 
    p.status === 'approved' && 
    p.issuedCert && 
    p.issuedCert.mtaId
  )
  
  // 去重并返回格式化的授权列表
  const uniqueCerts = new Map()
  completedProcesses.forEach(p => {
    const mtaId = p.issuedCert.mtaId
    if (!uniqueCerts.has(mtaId)) {
      uniqueCerts.set(mtaId, {
        id: `cert_${mtaId}`,
        mtaId: mtaId,
        obtainedAt: p.issuedCert.issuedAt,
        expireAt: (() => {
          const issued = p.issuedCert.issuedAt
          const years = Number(p.issuedCert.expireYears) || 1
          if (!issued) return ''
          const d = new Date(issued)
          if (Number.isNaN(d.getTime())) return ''
          d.setFullYear(d.getFullYear() + years)
          return d.toISOString().slice(0,10)
        })()
      })
    }
  })
  
  return Array.from(uniqueCerts.values())
})

// 校验必填是否满足：控制“确定”按钮可点击
const canConfirm = computed(() => {
  if (startType.value === 'apply') {
    return !!startTargetMtaId.value
  }
  if (startType.value === 'equivalent') {
    return !!startTargetMtaId.value && !!startSourceMtaId.value && !!startReason.value.trim()
  }
  // extend
  return !!startTargetMtaId.value && (Number(startYears.value) > 0) && !!startReason.value.trim()
})

function openStart() {
  startDialog.value = true
  startType.value = 'apply'
  startTargetMtaId.value = ''
  startSourceMtaId.value = ''
  startMonths.value = 3
  startReason.value = ''
}

// 切换流程类型时清空选择，避免误带入
watch(startType, () => {
  startTargetMtaId.value = ''
  startSourceMtaId.value = ''
  startReason.value = ''
  startYears.value = 1
  startYears.value = 1
})

function doStart() {
  if (startType.value === 'apply') {
    if (!startTargetMtaId.value) return ElMessage.error('请选择目标MTA授权')
    // 不创建流程，跳转到新的页面展示校验详情，由详情页“提交申请”创建流程
    emit('open-apply-detail', startTargetMtaId.value)
  } else if (startType.value === 'equivalent') {
    if (!startSourceMtaId.value || !startTargetMtaId.value) return ElMessage.error('请选择来源与目标MTA授权')
    if (!startReason.value.trim()) return ElMessage.error('请输入说明')
    addProcess({ userId: props.currentUser.id, type: 'equivalent', sourceMtaId: startSourceMtaId.value, targetMtaId: startTargetMtaId.value, reason: startReason.value.trim() })
  } else if (startType.value === 'extend') {
    if (!startTargetMtaId.value) return ElMessage.error('请选择目标MTA授权')
    addProcess({ userId: props.currentUser.id, type: 'extend', targetMtaId: startTargetMtaId.value, years: startYears.value, reason: startReason.value.trim() })
  }
  startDialog.value = false
  ElMessage.success('操作成功')
}

// 审核相关状态和函数
// const auditDialog = ref(false)
// const auditType = ref('') // 'approve' | 'reject'
// const auditTarget = ref(null)
// const auditForm = ref({
//   assessorIds: [],
//   trainingEngineerComment: ''
// })

// 获取考核组成员选项
// const assessorOptions = computed(() => {
//   return USERS.filter(u => u.role === 'assessor').map(u => ({
//     label: `${u.name}（${u.department}）`,
//     value: u.id
//   }))
// })

// 判断是否为培训工程师
const isTrainingEngineer = computed(() => props.currentUser.role === 'training_admin')

// function openAuditDialog(row, type) {
//   auditTarget.value = row
//   auditType.value = type
//   auditForm.value = {
//     assessorIds: [],
//     trainingEngineerComment: ''
//   }
//   auditDialog.value = true
// }

// function doAudit() {
//   if (!auditTarget.value) return
//   
//   if (auditType.value === 'approve') {
//     if (auditForm.value.assessorIds.length === 0) {
//       ElMessage.error('请选择至少一名考核组成员')
//       return
//     }
//     
//     // 通过审核，分配考核组成员
//     updateProcess(auditTarget.value.id, {
//       status: 'in_progress',
//       currentNode: '考核组成员考核',
//       trainingEngineerId: props.currentUser.id,
//       trainingEngineerComment: auditForm.value.trainingEngineerComment || '',
//       assessorIds: auditForm.value.assessorIds,
//       trainingEngineerAuditAt: new Date().toISOString().slice(0,10)
//     })
//     ElMessage.success('已通过审核并分配考核组成员')
//   } else if (auditType.value === 'reject') {
//     if (!auditForm.value.trainingEngineerComment.trim()) {
//       ElMessage.error('请输入驳回意见')
//       return
//     }
//     
//     // 驳回审核
//     updateProcess(auditTarget.value.id, {
//       status: 'rejected',
//       currentNode: '已驳回',
//       trainingEngineerId: props.currentUser.id,
//       trainingEngineerComment: auditForm.value.trainingEngineerComment.trim(),
//       trainingEngineerAuditAt: new Date().toISOString().slice(0,10)
//     })
//     ElMessage.success('已驳回申请')
//   }
//   
//   auditDialog.value = false
// }

// 查看详情
function viewDetail(row) {
  if (row.type === 'apply') {
    emit('open-apply-detail', row.targetMtaId, row)
  } else if (row.type === 'equivalent') {
    emit('open-equivalent-detail', row)
  } else {
    emit('open-extend-detail', row)
  }
}
</script>

<template>
  <section class="mta-process-page">
    <div class="page-header">
      <div class="title">
        <el-icon><Tickets /></el-icon>
        <span>MTA 发起流程</span>
      </div>
      <el-button type="primary" :icon="Plus" @click="openStart">发起流程</el-button>
    </div>

    <div class="filters">
      <el-form inline>
        <el-form-item label="关键字">
          <el-input v-model="keyword" placeholder="流程类型/目标MTA" clearable style="width: 220px" />
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
            <el-option label="MTA授权申请" value="apply" />
            <el-option label="MTA授权等效" value="equivalent" />
            <el-option label="MTA授权延期" value="extend" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="paged" stripe>
      <el-table-column label="流程名称" min-width="180">
        <template #default="{ row }">{{ getTypeText(row.type) }}</template>
      </el-table-column>
      <el-table-column label="目标MTA授权" min-width="220">
        <template #default="{ row }">{{ getMtaName(row.targetMtaId) }}</template>
      </el-table-column>
      <el-table-column label="发起人" width="100">
        <template #default="{ row }">{{ getUserName(row.userId) }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="发起时间" width="140" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ row.status === 'in_progress' ? '流程中' : row.status === 'approved' ? '通过' : '驳回' }}</el-tag>
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

    <!-- 发起流程 -->
    <el-dialog v-model="startDialog" title="发起流程" width="620px">
      <el-form label-width="120px">
        <el-form-item label="流程类型">
          <el-radio-group v-model="startType">
            <el-radio label="apply">MTA授权申请</el-radio>
            <el-radio label="equivalent">MTA授权等效</el-radio>
            <el-radio label="extend">MTA授权延期</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="startType==='apply'">
          <el-form-item label="目标MTA授权">
            <el-select v-model="startTargetMtaId" filterable clearable placeholder="选择MTA授权" style="width:100%">
              <el-option v-for="m in mtaAuthsStore.items.filter(m=>m.department===props.currentUser.department)" :key="m.id" :label="getMtaName(m.id)" :value="m.id" />
            </el-select>
          </el-form-item>
        </template>

        <template v-else-if="startType==='equivalent'">
          <el-form-item label="来源MTA授权">
            <el-select v-model="startSourceMtaId" filterable clearable placeholder="选择已获得MTA授权" style="width:100%">
              <el-option v-for="c in myCerts" :key="c.id" :label="getMtaName(c.mtaId)" :value="c.mtaId" />
            </el-select>
          </el-form-item>
          <el-form-item label="目标MTA授权">
            <el-select v-model="startTargetMtaId" filterable clearable placeholder="选择目标MTA授权" style="width:100%">
              <el-option v-for="m in mtaAuthsStore.items.filter(m=>m.department===props.currentUser.department)" :key="m.id" :label="getMtaName(m.id)" :value="m.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="说明">
            <el-input v-model="startReason" type="textarea" :rows="3" placeholder="请输入等效说明" />
          </el-form-item>
        </template>

        <template v-else>
          <el-form-item label="目标MTA授权">
            <el-select v-model="startTargetMtaId" filterable clearable placeholder="选择已获得MTA授权" style="width:100%">
              <el-option v-for="c in myCerts" :key="c.id" :label="getMtaName(c.mtaId)" :value="c.mtaId" />
            </el-select>
          </el-form-item>
          <el-form-item label="延期年限">
            <el-input-number v-model="startYears" :min="1" :max="5" />
          </el-form-item>
          <el-form-item label="说明">
            <el-input v-model="startReason" type="textarea" :rows="3" placeholder="请输入延期说明" />
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="startDialog=false">取消</el-button>
        <el-button type="primary" :disabled="!canConfirm" @click="doStart">确定</el-button>
      </template>
    </el-dialog>

    <!-- 审核对话框 -->
    <el-dialog v-model="auditDialog" :title="auditType === 'approve' ? '通过审核' : '驳回申请'" width="600px">
      <el-form label-width="120px">
        <el-form-item label="申请信息">
          <div v-if="auditTarget">
            <p><strong>申请人：</strong>{{ getUserName(auditTarget.userId) }}</p>
            <p><strong>目标MTA：</strong>{{ getMtaName(auditTarget.targetMtaId) }}</p>
            <p><strong>申请时间：</strong>{{ auditTarget.createdAt }}</p>
            <p><strong>当前状态：</strong>{{ auditTarget.currentNode }}</p>
          </div>
        </el-form-item>

        <el-form-item v-if="auditType === 'approve'" label="选择考核组成员" required>
          <el-select 
            v-model="auditForm.assessorIds" 
            multiple 
            placeholder="请选择考核组成员" 
            style="width: 100%"
            :multiple-limit="5"
          >
            <el-option 
              v-for="option in assessorOptions" 
              :key="option.value" 
              :label="option.label" 
              :value="option.value" 
            />
          </el-select>
          <div class="hint">可选择多名考核组成员，最多5名</div>
        </el-form-item>

        <el-form-item :label="auditType === 'approve' ? '审核意见' : '驳回原因'" :required="auditType === 'reject'">
          <el-input 
            v-model="auditForm.trainingEngineerComment" 
            type="textarea" 
            :rows="4" 
            :placeholder="auditType === 'approve' ? '请输入审核意见（可选）' : '请输入驳回原因'"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="auditDialog = false">取消</el-button>
        <el-button 
          :type="auditType === 'approve' ? 'success' : 'danger'" 
          @click="doAudit"
        >
          {{ auditType === 'approve' ? '通过审核' : '确认驳回' }}
        </el-button>
      </template>
    </el-dialog>
  </section>
  
</template>

<style scoped>
.mta-process-page { display: flex; flex-direction: column; gap: 12px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 18px; }
.filters { background: #fff; padding: 10px; border-radius: 8px; }
.pagination { display: flex; justify-content: flex-end; padding: 10px 0; }
.hint { color: #64748b; font-size: 12px; margin-top: 4px; }

</style>


