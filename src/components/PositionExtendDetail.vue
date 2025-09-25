<script setup>
import { ref, computed } from 'vue'
import { USERS } from '../user'
import { positionsStore } from '../positions'
import { addPositionProcess, updatePositionProcess } from '../positionProcesses'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({ 
  currentUser: { type: Object, required: true }, 
  info: { type: Object, required: true } 
})
const emit = defineEmits(['back', 'audit-complete'])

const applicant = computed(() => USERS.find(u => u.id === props.currentUser.id) || props.currentUser)
const currentPosition = computed(() => {
  if (!applicant.value) return null
  const deptPositions = positionsStore.items.filter(p => p.department === applicant.value.department)
  return deptPositions.length > 0 ? deptPositions[0] : null
})

// 草稿模式判断
const isDraft = computed(() => !props.info?.id)
const processId = computed(() => (props.info && props.info.id) ? props.info.id : createdProcessId.value)
const createdProcessId = ref('')

// 岗位授权续资质证明列表
const qualificationProofs = ref([
  { id: `proof_${Math.random().toString(36).slice(2,8)}`, work: '', participation: '' }
])

function addQualificationProof() {
  qualificationProofs.value.push({ id: `proof_${Math.random().toString(36).slice(2,8)}`, work: '', participation: '' })
}

// 申请说明
const applicationReason = ref('')

// 延期年限（可被科长和经理修改）
const extendYears = ref(props.info?.extendYears || 1)

// 签名状态
const applicantSigned = ref(!!props.info?.applicantSigned)
const sectionChiefSigned = ref(!!props.info?.sectionChiefSigned)
const deptManagerSigned = ref(!!props.info?.deptManagerSigned)

// 当前节点
const currentNode = ref(props.info?.currentNode || '申请人提交')

// 签名操作
function doApplicantSign() {
  ElMessageBox.confirm('确认进行电子签名？', '申请人签名', { type: 'warning' }).then(() => {
    applicantSigned.value = true
    if (processId.value) {
      updatePositionProcess(processId.value, { 
        applicantSigned: true, 
        applicantSignedAt: new Date().toISOString().slice(0,10) 
      })
    }
    ElMessage.success('申请人已签名')
  }).catch(() => {})
}

function doSectionChiefSign() {
  ElMessageBox.confirm('确认进行电子签名？', '科长签名', { type: 'warning' }).then(() => {
    sectionChiefSigned.value = true
    if (processId.value) {
      updatePositionProcess(processId.value, { 
        sectionChiefSigned: true, 
        sectionChiefSignedAt: new Date().toISOString().slice(0,10),
        extendYears: extendYears.value
      })
    }
    ElMessage.success('科长已签名')
  }).catch(() => {})
}

function doDeptManagerSign() {
  ElMessageBox.confirm('确认进行电子签名？', '部门经理签名', { type: 'warning' }).then(() => {
    deptManagerSigned.value = true
    if (processId.value) {
      updatePositionProcess(processId.value, { 
        deptManagerSigned: true, 
        deptManagerSignedAt: new Date().toISOString().slice(0,10),
        extendYears: extendYears.value
      })
    }
    ElMessage.success('部门经理已签名')
  }).catch(() => {})
}

// 流程操作
function submitToSectionChief() {
  if (!applicantSigned.value) { 
    ElMessage.warning('请先完成申请人签名')
    return 
  }
  
  // 首次提交：创建流程
  if (isDraft.value && !createdProcessId.value) {
    const payload = {
      userId: applicant.value.id,
      type: 'extend',
      targetPositionId: currentPosition.value?.id,
      extendYears: extendYears.value,
      reason: applicationReason.value || '岗位延期申请',
      applicantSigned: true,
    }
    const id = addPositionProcess(payload)
    createdProcessId.value = id
  } else if (processId.value) {
    updatePositionProcess(processId.value, { 
      applicantSigned: true,
      extendYears: extendYears.value,
      reason: applicationReason.value || '岗位延期申请'
    })
  }
  
  currentNode.value = '科长审核'
  if (processId.value) {
    updatePositionProcess(processId.value, { currentNode: currentNode.value })
  }
  ElMessage.success('已提交至科长审核')
}

function submitToDeptManager() {
  if (!sectionChiefSigned.value) { 
    ElMessage.warning('请先完成科长签名')
    return 
  }
  
  currentNode.value = '部门经理审核'
  if (processId.value) {
    updatePositionProcess(processId.value, { 
      currentNode: currentNode.value,
      extendYears: extendYears.value
    })
  }
  ElMessage.success('已提交至部门经理审核')
}

function completeProcess() {
  if (!deptManagerSigned.value) { 
    ElMessage.warning('请先完成部门经理签名')
    return 
  }
  
  const issuedAt = new Date().toISOString().slice(0,10)
  if (processId.value) {
    updatePositionProcess(processId.value, { 
      status: 'approved', 
      currentNode: '已完成', 
      issuedAt,
      extendYears: extendYears.value
    })
  }
  
  ElMessage.success('岗位延期已批准，岗位失效时间已延长')
  emit('audit-complete')
}

function rejectProcess() {
  ElMessageBox.confirm('确定要驳回该延期申请吗？', '驳回确认', {
    confirmButtonText: '驳回',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    if (processId.value) {
      updatePositionProcess(processId.value, { 
        status: 'rejected', 
        currentNode: '已驳回' 
      })
    }
    ElMessage.success('已驳回延期申请')
    emit('audit-complete')
  }).catch(() => {})
}

// 权限判断
const canSectionChiefSign = computed(() => 
  props.currentUser.role === 'section_chief' && currentNode.value === '科长审核'
)
const canDeptManagerSign = computed(() => 
  props.currentUser.role === 'dept_manager' && currentNode.value === '部门经理审核'
)
const canReject = computed(() => 
  (props.currentUser.role === 'section_chief' && currentNode.value === '科长审核') ||
  (props.currentUser.role === 'dept_manager' && currentNode.value === '部门经理审核')
)
</script>

<template>
  <section class="position-extend-detail">
    <el-card class="block" shadow="never">
      <template #header><div class="card-header"><span>岗位延期 - 基本信息</span></div></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请人">{{ applicant.name }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ applicant.department }}</el-descriptions-item>
        <el-descriptions-item label="岗位">{{ currentPosition?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="当前节点">{{ currentNode }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header">
          <span>岗位授权续资质证明</span>
          <el-button type="primary" size="small" @click="addQualificationProof">新增</el-button>
        </div>
      </template>
      <el-table :data="qualificationProofs" size="small" stripe>
        <el-table-column label="岗位说明书中明确的工作" min-width="300">
          <template #default="{ row }">
            <el-input v-model="row.work" placeholder="请填写工作内容" />
          </template>
        </el-table-column>
        <el-table-column label="相关工作参与情况" min-width="300">
          <template #default="{ row }">
            <el-input v-model="row.participation" placeholder="请填写参与情况" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="block" shadow="never">
      <template #header><div class="card-header"><span>申请信息</span></div></template>
      <el-form label-width="100px">
        <el-form-item label="申请说明" required>
          <el-input v-model="applicationReason" type="textarea" :rows="3" placeholder="请填写延期申请说明" />
        </el-form-item>
        <el-form-item label="延期年限">
          <el-input-number 
            v-model="extendYears" 
            :min="1" 
            :max="10" 
            :disabled="currentNode === '申请人提交'"
            style="width: 200px"
          />
          <span style="margin-left: 8px; color: #666;">年</span>
          <div v-if="currentNode !== '申请人提交'" class="form-tip">
            科长和部门经理可以修改延期年限
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="block" shadow="never">
      <template #header><div class="card-header"><span>审核与签名</span></div></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请人签名">
          <div>
            <el-button type="primary" @click="doApplicantSign" :disabled="applicantSigned">申请人签名</el-button>
            <span v-if="applicantSigned" style="margin-left:8px;">已签名（{{ new Date().toLocaleDateString() }}）</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="审查（科长）">
          <div>
            <el-button 
              type="primary" 
              @click="doSectionChiefSign" 
              :disabled="!canSectionChiefSign || sectionChiefSigned"
            >
              科长签名
            </el-button>
            <span v-if="sectionChiefSigned" style="margin-left:8px;">已签名（{{ new Date().toLocaleDateString() }}）</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="批准（部门经理）">
          <div>
            <el-button 
              type="primary" 
              @click="doDeptManagerSign" 
              :disabled="!canDeptManagerSign || deptManagerSigned"
            >
              部门经理签名
            </el-button>
            <span v-if="deptManagerSigned" style="margin-left:8px;">已签名（{{ new Date().toLocaleDateString() }}）</span>
          </div>
        </el-descriptions-item>
      </el-descriptions>
      
      <div style="margin-top:12px; display:flex; gap:8px;">
        <el-button @click="emit('back')">返回</el-button>
        <el-button type="primary" @click="submitToSectionChief" v-if="currentNode==='申请人提交'">提交至科长</el-button>
        <el-button type="primary" @click="submitToDeptManager" v-if="currentNode==='科长审核'">提交至部门经理</el-button>
        <el-button type="success" @click="completeProcess" v-if="currentNode==='部门经理审核'">完成流程</el-button>
        <el-button type="danger" @click="rejectProcess" v-if="canReject">驳回</el-button>
      </div>
    </el-card>
  </section>
</template>

<style scoped>
.block { margin-bottom: 12px; }
.card-header { font-weight: 600; display:flex; justify-content: space-between; align-items: center; }
.form-tip { font-size: 12px; color: #909399; margin-top: 4px; }
</style>
