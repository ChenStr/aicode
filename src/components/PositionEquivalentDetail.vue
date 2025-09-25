<script setup>
import { ref, computed } from 'vue'
import { USERS } from '../user'
import { positionsStore } from '../positions'
import { createRevocation } from '../positionRevocations'
import { addPositionProcess, updatePositionProcess } from '../positionProcesses'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({ currentUser: { type: Object, required: true }, info: { type: Object, required: true } })
const emit = defineEmits(['back', 'audit-complete'])

const applicant = computed(() => USERS.find(u => u.id === props.currentUser.id) || props.currentUser)
const sourcePosition = computed(() => positionsStore.items.find(p => p.id === props.info.sourcePositionId) || null)
const targetPosition = computed(() => positionsStore.items.find(p => p.id === props.info.targetPositionId) || null)

// 工作经历（可新增/编辑）
const experiences = ref([
  { id: `exp_${Math.random().toString(36).slice(2,8)}`, startDate: '2022-01 - 2023-12', deptAndPost: `${applicant.value.department} - ${sourcePosition.value?.name || '-'}`, work: '本岗位主要职责', title: '—' }
])
function addExperience() {
  experiences.value.push({ id: `exp_${Math.random().toString(36).slice(2,8)}`, startDate: '', deptAndPost: '', work: '', title: '' })
}

// 申请说明（单独卡片）
const applicationReason = ref('')

// 审核签名与流转（带持久化）
const isDraft = computed(() => !props.info?.id) // 未创建到store
const applicantSigned = ref(false)
const sectionChiefSigned = ref(!!props.info?.sectionChiefSigned)
const deptManagerSigned = ref(!!props.info?.deptManagerSigned)
const managerDecision = ref(props.info?.managerDecision || '') // approve | reject
const sectionChiefComment = ref(props.info?.sectionChiefComment || '')
const deptManagerComment = ref(props.info?.deptManagerComment || '')
const currentNode = ref('申请人提交')
const processId = computed(() => (props.info && props.info.id) ? props.info.id : createdProcessId.value)
const createdProcessId = ref('')

function doApplicantSign() {
  ElMessageBox.confirm('确认进行电子签名？', '申请人签名', { type: 'warning' }).then(()=>{
    applicantSigned.value = true
    if (processId.value) updatePositionProcess(processId.value, { applicantSigned: true, applicantSignedAt: new Date().toISOString().slice(0,10) })
    ElMessage.success('申请人已签名')
  }).catch(()=>{})
}
function doSectionChiefSign() {
  ElMessageBox.confirm('确认进行电子签名？', '科长签名', { type: 'warning' }).then(()=>{
    sectionChiefSigned.value = true
    if (processId.value) updatePositionProcess(processId.value, { sectionChiefSigned: true, sectionChiefSignedAt: new Date().toISOString().slice(0,10), sectionChiefComment: sectionChiefComment.value })
    ElMessage.success('科长已签名')
  }).catch(()=>{})
}
function doDeptManagerSign() {
  if (!managerDecision.value) { ElMessage.warning('请先选择审核结果'); return }
  ElMessageBox.confirm('确认进行电子签名？', '部门经理签名', { type: 'warning' }).then(()=>{
    deptManagerSigned.value = true
    if (processId.value) updatePositionProcess(processId.value, { deptManagerSigned: true, deptManagerSignedAt: new Date().toISOString().slice(0,10), managerDecision: managerDecision.value, deptManagerComment: deptManagerComment.value })
    ElMessage.success('部门经理已签名')
  }).catch(()=>{})
}

function submitToSectionChief() { 
  if (!applicantSigned.value) { ElMessage.warning('请先完成申请人签名'); return }
  // 首次提交：创建流程
  if (isDraft.value && !createdProcessId.value) {
    const payload = {
      userId: applicant.value.id,
      type: 'equivalent',
      sourcePositionId: sourcePosition.value?.id,
      targetPositionId: targetPosition.value?.id,
      reason: applicationReason.value || '岗位等效申请',
      applicantSigned: true,
    }
    const id = addPositionProcess(payload)
    createdProcessId.value = id
  } else if (processId.value) {
    updatePositionProcess(processId.value, { applicantSigned: true })
  }
  currentNode.value = '科长审核'
  if (processId.value) updatePositionProcess(processId.value, { currentNode: currentNode.value })
  ElMessage.success('已提交至科长审核') 
}
function submitToDeptManager() { 
  if (!sectionChiefSigned.value) { ElMessage.warning('请先完成科长签名'); return }
  currentNode.value = '部门经理审核'
  if (processId.value) updatePositionProcess(processId.value, { currentNode: currentNode.value, sectionChiefComment: sectionChiefComment.value })
  ElMessage.success('已提交至部门经理审核') 
}
function completeProcess() {
  if (!deptManagerSigned.value || !managerDecision.value) { ElMessage.warning('请先选择审核结果并完成部门经理签名'); return }
  if (managerDecision.value === 'approve') {
    try {
      createRevocation({
        userId: applicant.value.id,
        userName: applicant.value.name,
        department: applicant.value.department,
        revokedPositionId: sourcePosition.value?.id,
        authorizedAt: new Date().toISOString().slice(0,10),
        revokedAt: new Date().toISOString().slice(0,10),
        status: 'pending'
      })
    } catch {}
    const issuedAt = new Date().toISOString().slice(0,10)
    if (processId.value) updatePositionProcess(processId.value, { status: 'approved', currentNode: '已完成', issuedAt, targetPositionId: targetPosition.value?.id, sourcePositionId: sourcePosition.value?.id, managerDecision: managerDecision.value, deptManagerComment: deptManagerComment.value })
    ElMessage.success('已通过：岗位已等效并创建原岗位撤销记录')
  } else {
    if (processId.value) updatePositionProcess(processId.value, { status: 'rejected', currentNode: '已完成', managerDecision: 'reject', deptManagerComment: deptManagerComment.value })
    ElMessage.success('已提交：不予等效')
  }
  emit('audit-complete')
}
</script>

<template>
  <section class="position-equivalent-detail">
    <el-card class="block" shadow="never">
      <template #header><div class="card-header"><span>岗位等效 - 基本信息</span></div></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请人">{{ applicant.name }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ applicant.department }}</el-descriptions-item>
        <el-descriptions-item label="申请日期">{{ new Date().toLocaleDateString() }}</el-descriptions-item>
        <el-descriptions-item label="当前节点">{{ currentNode }}</el-descriptions-item>
        <el-descriptions-item label="已取得授权" :span="2">{{ sourcePosition?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="拟申请等效授权" :span="2">{{ targetPosition?.name || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="block" shadow="never">
      <template #header><div class="card-header"><span>工作主要经历</span><el-button type="primary" size="small" @click="addExperience">新增</el-button></div></template>
      <el-table :data="experiences" size="small" stripe>
        <el-table-column label="起止时间" min-width="160"><template #default="{ row }"><el-input v-model="row.startDate" placeholder="如：2022-01 - 2023-12" /></template></el-table-column>
        <el-table-column label="部门及岗位名称" min-width="220"><template #default="{ row }"><el-input v-model="row.deptAndPost" /></template></el-table-column>
        <el-table-column label="从事专业技术工作" min-width="220"><template #default="{ row }"><el-input v-model="row.work" /></template></el-table-column>
        <el-table-column label="职务" width="140"><template #default="{ row }"><el-input v-model="row.title" /></template></el-table-column>
      </el-table>
    </el-card>

    <el-card class="block" shadow="never">
      <template #header><div class="card-header"><span>申请说明</span></div></template>
      <el-form label-width="100px">
        <el-form-item label="申请说明">
          <el-input v-model="applicationReason" type="textarea" :rows="3" placeholder="请填写岗位等效申请说明" />
        </el-form-item>
        <el-form-item label="科长评价" v-if="currentNode!=='申请人提交'">
          <el-input v-model="sectionChiefComment" type="textarea" :rows="3" placeholder="请填写审查意见（科长）" />
        </el-form-item>
        <el-form-item label="经理评价" v-if="currentNode==='部门经理审核' || deptManagerSigned">
          <el-input v-model="deptManagerComment" type="textarea" :rows="3" placeholder="请填写批准意见（部门经理）" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="block" shadow="never">
      <template #header><div class="card-header"><span>审核与签名</span></div></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请人签名">
          <div>
            <el-button type="primary" @click="doApplicantSign">申请人签名</el-button>
            <span v-if="applicantSigned" style="margin-left:8px;">已签名（{{ new Date().toLocaleDateString() }}）</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="审查（科长）">
          <div>
            <el-button type="primary" @click="doSectionChiefSign" :disabled="currentNode!=='科长审核'">科长签名</el-button>
            <span v-if="sectionChiefSigned" style="margin-left:8px;">已签名（{{ new Date().toLocaleDateString() }}）</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="批准（部门经理)">
          <div>
            <el-select v-model="managerDecision" placeholder="选择审核结果" style="width:260px; margin-right:8px;">
              <el-option label="经审查，岗位技术授权满足要求" value="approve" />
              <el-option label="经审查，岗位技术授权不满足要求" value="reject" />
            </el-select>
            <el-button type="primary" @click="doDeptManagerSign" :disabled="currentNode!=='部门经理审核'">部门经理签名</el-button>
            <span v-if="deptManagerSigned" style="margin-left:8px;">已签名（{{ new Date().toLocaleDateString() }}）</span>
          </div>
        </el-descriptions-item>
      </el-descriptions>
      <div style="margin-top:12px; display:flex; gap:8px;">
        <el-button @click="emit('back')">返回</el-button>
        <el-button type="primary" @click="submitToSectionChief" v-if="currentNode==='申请人提交'">提交至科长</el-button>
        <el-button type="primary" @click="submitToDeptManager" v-if="currentNode==='科长审核'">提交至部门经理</el-button>
        <el-button type="success" @click="completeProcess" v-if="currentNode==='部门经理审核'">完成流程</el-button>
      </div>
    </el-card>
  </section>
</template>

<style scoped>
.block { margin-bottom: 12px; }
.card-header { font-weight: 600; display:flex; justify-content: space-between; align-items: center; }
</style>


