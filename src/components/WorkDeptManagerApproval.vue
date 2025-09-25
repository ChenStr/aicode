<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getWorkProcessById, deptManagerApprove, deptManagerReject, getStatusText, getStatusType } from '../workProcesses'
import { workCertTemplatesStore } from '../workCertTemplates'
import { getWorkAuthorizationName } from '../workAssessments'

const props = defineProps({
  currentUser: { type: Object, required: true },
  processId: { type: String, required: true }
})

const emit = defineEmits(['back', 'approved', 'rejected'])

const loading = ref(false)
const process = ref(null)
const comment = ref('')
const selectedTemplateId = ref('')

const canApprove = computed(() => {
  return process.value && process.value.status === 'dept_manager_pending' && props.currentUser.id === process.value.deptManagerId
})

const myTemplates = computed(() => workCertTemplatesStore.items.filter(t => t.department === props.currentUser.department))

function load() {
  loading.value = true
  try {
    process.value = getWorkProcessById(props.processId)
  } finally { loading.value = false }
}

function doApprove() {
  if (!canApprove.value) return
  if (!selectedTemplateId.value) { ElMessage.warning('请选择证书模版'); return }
  ElMessageBox.confirm('确认通过并颁发证书？', '部门经理审核确认', { type: 'warning' }).then(() => {
    if (deptManagerApprove(props.processId, selectedTemplateId.value, comment.value)) {
      ElMessage.success('已通过并颁发证书')
      emit('approved')
    } else { ElMessage.error('操作失败') }
  }).catch(()=>{})
}

function doReject() {
  if (!canApprove.value) return
  ElMessageBox.confirm('确认驳回该工作授权申请？', '部门经理审核确认', { type: 'warning' }).then(() => {
    if (deptManagerReject(props.processId, comment.value)) {
      ElMessage.success('已驳回')
      emit('rejected')
    } else { ElMessage.error('操作失败') }
  }).catch(()=>{})
}

onMounted(load)
</script>

<template>
  <section class="work-approval">
    <div class="page-header">
      <div class="left">
        <el-button @click="emit('back')">返回</el-button>
        <h2>部门经理审核</h2>
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
      <template #header>审批与证书</template>
      <el-form label-width="120px">
        <el-form-item label="证书模版" required>
          <el-select v-model="selectedTemplateId" style="width: 100%" placeholder="请选择证书模版">
            <el-option v-for="t in myTemplates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="审批意见">
          <el-input v-model="comment" type="textarea" :rows="4" placeholder="请输入审批意见（可选）" />
        </el-form-item>
      </el-form>
      <div class="actions">
        <el-button type="success" :disabled="!canApprove" @click="doApprove">通过并颁发证书</el-button>
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


