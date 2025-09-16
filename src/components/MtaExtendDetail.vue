<script setup>
import { computed, ref } from 'vue'
import { USERS } from '../user'
import { mtaAuthsStore } from '../mtaAuths'
import { mtaProcessesStore, updateProcess, userMtaCertsStore } from '../mtaProcesses'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close } from '@element-plus/icons-vue'

const props = defineProps({ currentUser: { type: Object, required: true }, processInfo: { type: Object, required: true } })
const emit = defineEmits(['back', 'audit-complete'])

function getUserName(userId) {
  const u = USERS.find(u => u.id === userId)
  return u ? u.name : userId
}
function getUserDepartment(userId) {
  const u = USERS.find(u => u.id === userId)
  return u ? u.department : ''
}
function getMtaName(mtaId) {
  const m = mtaAuthsStore.items.find(m => m.id === mtaId)
  return m ? `${m.techName}（${m.code}）` : mtaId
}

const isSectionChief = computed(() => props.currentUser.role === 'section_chief')
const isDeptManager = computed(() => props.currentUser.role === 'dept_manager')

// 延期月份在科长与部门经理均可调整
const extendMonths = ref(Number(props.processInfo.months) || 1)

function sectionChiefApprove() {
  ElMessageBox.confirm('确认审查通过并提交至部门经理批准？', '科长审查通过', { type: 'warning' })
    .then(() => {
      updateProcess(props.processInfo.id, {
        status: 'in_progress',
        currentNode: '部门经理审核',
        sectionChiefId: props.currentUser.id,
        sectionChiefAuditAt: new Date().toISOString().slice(0,10),
        months: Number(extendMonths.value)
      })
      ElMessage.success('已提交至部门经理审核')
      emit('audit-complete')
    }).catch(()=>{})
}

function sectionChiefReject() {
  ElMessageBox.prompt('请输入驳回原因', '科长驳回', { confirmButtonText: '确认', cancelButtonText: '取消' })
    .then(({ value }) => {
      updateProcess(props.processInfo.id, {
        status: 'rejected',
        currentNode: '已驳回',
        sectionChiefId: props.currentUser.id,
        sectionChiefComment: (value||'')
      })
      ElMessage.success('已驳回')
      emit('audit-complete')
    }).catch(()=>{})
}

function deptManagerApprove() {
  ElMessageBox.confirm('确认批准并延长授权有效期？', '部门经理批准', { type: 'warning' })
    .then(() => {
      // 更新流程记录
      updateProcess(props.processInfo.id, {
        status: 'approved',
        currentNode: '已完成',
        deptManagerId: props.currentUser.id,
        deptManagerAuditAt: new Date().toISOString().slice(0,10),
        months: Number(extendMonths.value)
      })

      // 同步修改对应授权证书的截止时间（集中证书存储）
      const cert = userMtaCertsStore.items.find(c => c.userId === props.processInfo.userId && c.mtaId === props.processInfo.targetMtaId)
      if (cert) {
        // 基于当前显示的到期日（若无则跳过）顺延月份
        const base = cert.expireAt || ''
        const baseDate = base ? new Date(base) : null
        if (baseDate && !Number.isNaN(baseDate.getTime())) {
          baseDate.setMonth(baseDate.getMonth() + Number(extendMonths.value))
          cert.expireAt = baseDate.toISOString().slice(0,10)
        }
      }

      // 同步修改最初签发流程的 issuedCert.expireAt（供基于流程展示的页面生效）
      const targetUserId = props.processInfo.userId
      const targetMtaId = props.processInfo.targetMtaId
      const issuedProcess = mtaProcessesStore.processes.find(p => 
        p.userId === targetUserId && 
        p.status === 'approved' && 
        p.issuedCert && p.issuedCert.mtaId === targetMtaId
      )
      if (issuedProcess) {
        // 计算当前到期日：优先 issuedCert.expireAt，否则 issuedAt + expireYears
        let currentExpire = ''
        if (issuedProcess.issuedCert.expireAt) {
          currentExpire = issuedProcess.issuedCert.expireAt
        } else {
          const issued = issuedProcess.issuedCert.issuedAt
          const years = Number(issuedProcess.issuedCert.expireYears) || 1
          if (issued) {
            const d = new Date(issued)
            if (!Number.isNaN(d.getTime())) {
              d.setFullYear(d.getFullYear() + years)
              currentExpire = d.toISOString().slice(0,10)
            }
          }
        }

        if (currentExpire) {
          const d = new Date(currentExpire)
          if (!Number.isNaN(d.getTime())) {
            d.setMonth(d.getMonth() + Number(extendMonths.value))
            const newExpire = d.toISOString().slice(0,10)
            updateProcess(issuedProcess.id, {
              issuedCert: { ...issuedProcess.issuedCert, expireAt: newExpire }
            })
          }
        }
      }

      ElMessage.success('已批准并更新授权截止时间')
      emit('audit-complete')
    }).catch(()=>{})
}

function deptManagerReject() {
  ElMessageBox.prompt('请输入驳回原因', '部门经理驳回', { confirmButtonText: '确认', cancelButtonText: '取消' })
    .then(({ value }) => {
      updateProcess(props.processInfo.id, {
        status: 'rejected',
        currentNode: '已驳回',
        deptManagerId: props.currentUser.id,
        deptManagerComment: (value||'')
      })
      ElMessage.success('已驳回')
      emit('audit-complete')
    }).catch(()=>{})
}
</script>

<template>
  <section class="extend-detail">
    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header"><span>MTA授权延期流程信息</span></div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请人">{{ getUserName(processInfo.userId) }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ processInfo.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="processInfo.status === 'in_progress' ? 'warning' : processInfo.status === 'approved' ? 'success' : 'danger'">
            {{ processInfo.status === 'in_progress' ? '流程中' : processInfo.status === 'approved' ? '通过' : '驳回' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前节点">{{ processInfo.currentNode }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header"><span>延期申请信息</span></div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="发起人">{{ getUserName(processInfo.userId) }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ getUserDepartment(processInfo.userId) }}</el-descriptions-item>
        <el-descriptions-item label="目标MTA授权" :span="2">{{ getMtaName(processInfo.targetMtaId) }}</el-descriptions-item>
        <el-descriptions-item label="延期月份">{{ processInfo.months || 1 }} 个月</el-descriptions-item>
        <el-descriptions-item label="延期说明">{{ processInfo.reason || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 审批记录 -->
    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header"><span>审批记录</span></div>
      </template>
      <div class="approval-records">
        <div class="approval-item">
          <div class="approval-label">申请人签名：</div>
          <div class="approval-value">{{ getUserName(processInfo.userId) }}</div>
        </div>
        <div class="approval-item">
          <div class="approval-label">日期：</div>
          <div class="approval-value">{{ processInfo.createdAt }}</div>
        </div>

        <div class="approval-item">
          <div class="approval-label">审查（科长签名）：</div>
          <div class="approval-value">{{ processInfo.sectionChiefId ? getUserName(processInfo.sectionChiefId) : '-' }}</div>
        </div>
        <div class="approval-item">
          <div class="approval-label">日期：</div>
          <div class="approval-value">{{ processInfo.sectionChiefAuditAt || '-' }}</div>
        </div>

        <div class="approval-item">
          <div class="approval-label">批准（部门经理签名）：</div>
          <div class="approval-value">{{ processInfo.deptManagerId ? getUserName(processInfo.deptManagerId) : '-' }}</div>
        </div>
        <div class="approval-item">
          <div class="approval-label">日期：</div>
          <div class="approval-value">{{ processInfo.deptManagerAuditAt || '-' }}</div>
        </div>
      </div>
    </el-card>

    <!-- 科长审核 -->
    <el-card v-if="isSectionChief && processInfo.currentNode === '科长审核'" class="audit-section" shadow="never">
      <template #header>
        <div class="card-header"><span>科长审核</span></div>
      </template>
      <el-form label-width="120px">
        <el-form-item label="延期月份">
          <el-input-number v-model="extendMonths" :min="1" :max="12" />
        </el-form-item>
      </el-form>
      <div class="audit-buttons">
        <el-button type="success" :icon="Check" @click="sectionChiefApprove">通过</el-button>
        <el-button type="danger" :icon="Close" @click="sectionChiefReject">驳回</el-button>
      </div>
    </el-card>

    <!-- 部门经理审核 -->
    <el-card v-if="isDeptManager && processInfo.currentNode === '部门经理审核'" class="audit-section" shadow="never">
      <template #header>
        <div class="card-header"><span>部门经理审核</span></div>
      </template>
      <el-form label-width="120px">
        <el-form-item label="延期月份">
          <el-input-number v-model="extendMonths" :min="1" :max="12" />
        </el-form-item>
      </el-form>
      <div class="audit-buttons">
        <el-button type="success" :icon="Check" @click="deptManagerApprove">通过并更新授权截止时间</el-button>
        <el-button type="danger" :icon="Close" @click="deptManagerReject">驳回</el-button>
      </div>
    </el-card>

    <div class="btns">
      <el-button @click="emit('back')">返回</el-button>
    </div>
  </section>
</template>

<style scoped>
.block { margin-bottom: 12px; }
.card-header { font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
.audit-section { margin-top: 16px; }
.audit-buttons { margin-top: 16px; display: flex; gap: 12px; justify-content: center; }
.btns { margin-top: 8px; display: flex; gap: 8px; }
.approval-records { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px; background: #f8fafc; border-radius: 8px; }
.approval-item { display: flex; align-items: center; gap: 8px; }
.approval-label { font-weight: 600; color: #374151; min-width: 200px; }
.approval-value { color: #1f2937; flex: 1; }
</style>


