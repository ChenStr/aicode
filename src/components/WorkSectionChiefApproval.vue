<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getWorkProcessById, sectionChiefApprove, sectionChiefReject, getStatusText, getStatusType } from '../workProcesses'
import { getWorkAuthorizationName } from '../workAssessments'

const props = defineProps({
  currentUser: { type: Object, required: true },
  processId: { type: String, required: true }
})

const emit = defineEmits(['back', 'approved', 'rejected'])

const loading = ref(false)
const process = ref(null)
const comment = ref('')

const canApprove = computed(() => {
  return process.value && process.value.status === 'section_chief_pending' && props.currentUser.id === process.value.sectionChiefId
})

function load() {
  loading.value = true
  try {
    process.value = getWorkProcessById(props.processId)
  } finally { loading.value = false }
}

function doApprove() {
  if (!canApprove.value) return
  ElMessageBox.confirm('确认通过该工作授权申请？', '科长审核确认', { type: 'warning' }).then(() => {
    if (sectionChiefApprove(props.processId, comment.value)) {
      ElMessage.success('已通过，已流转至部门经理审核')
      emit('approved')
    } else {
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

function doReject() {
  if (!canApprove.value) return
  ElMessageBox.confirm('确认驳回该工作授权申请？', '科长审核确认', { type: 'warning' }).then(() => {
    if (sectionChiefReject(props.processId, comment.value)) {
      ElMessage.success('已驳回')
      emit('rejected')
    } else {
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

onMounted(load)
</script>

<template>
  <section class="work-approval">
    <div class="page-header">
      <div class="left">
        <el-button @click="emit('back')">返回</el-button>
        <h2>科长审核</h2>
      </div>
      <div class="right">
        <el-tag v-if="process" :type="getStatusType(process.status)">{{ getStatusText(process.status) }}</el-tag>
      </div>
    </div>

    <el-card v-loading="loading" shadow="never" class="info-card" v-if="process">
      <template #header>申请信息</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请人">{{ process.applicantName }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ process.department }}</el-descriptions-item>
        <el-descriptions-item label="工作授权" :span="2">{{ getWorkAuthorizationName(process.workId) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="process" shadow="never" class="info-card">
      <template #header>审批意见</template>
      <el-input v-model="comment" type="textarea" :rows="4" placeholder="请输入审批意见（可选）" />
      <div class="actions">
        <el-button type="success" :disabled="!canApprove" @click="doApprove">通过</el-button>
        <el-button type="danger" :disabled="!canApprove" @click="doReject">驳回</el-button>
      </div>
    </el-card>
  </section>
  
</template>

<style scoped>
.work-approval { padding: 0; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px; }
.left { display:flex; align-items:center; gap: 12px; }
.info-card { margin-bottom: 16px; }
.actions { margin-top: 12px; display:flex; gap: 8px; }
</style>


