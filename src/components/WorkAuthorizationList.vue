<script setup>
import { computed, ref } from 'vue'
import { getAllWorkCertificates, getCertificateStatusText, getCertificateStatusType, revokeWorkCertificate } from '../workCertificates'
import { USERS } from '../user'

const props = defineProps({
  currentUser: { type: Object, required: true }
})
const emit = defineEmits(['reapply'])

const keyword = ref('')

const isDeptViewer = computed(() => ['dept_manager','section_chief','training_admin'].includes(props.currentUser.role))

const all = computed(() => getAllWorkCertificates())

const filtered = computed(() => {
  const base = isDeptViewer.value
    ? all.value.filter(i => i.department === props.currentUser.department)
    : all.value.filter(i => i.applicantId === props.currentUser.id)
  if (!keyword.value.trim()) return base
  const k = keyword.value.trim()
  return base.filter(i =>
    i.workName.includes(k) ||
    i.applicantName.includes(k) ||
    i.certificateNumber.includes(k)
  )
})

function formatDateTime(v) {
  return v || ''
}

function canTerminate(row) {
  if (row.status !== 'valid') return false
  return props.currentUser.role === 'dept_manager' && row.department === props.currentUser.department
}

async function handleTerminate(row) {
  try {
    await ElMessageBox.confirm(`确定要终止 ${row.applicantName} 的“${row.workName}”授权吗？`, '终止授权', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  const ok = revokeWorkCertificate(row.id, '部门经理终止')
  if (ok) ElMessage.success('已终止该工作授权')
}

function isExpired(row) {
  if (!row.expireAt) return false
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  return row.expireAt < now && row.status !== 'revoked'
}

function getDerivedStatus(row) {
  if (row.status === 'revoked') return { text: '已撤销', type: 'danger' }
  if (isExpired(row)) return { text: '已过期', type: 'warning' }
  return { text: getCertificateStatusText(row.status), type: getCertificateStatusType(row.status) }
}

function canReapply(row) {
  return isExpired(row) && row.applicantId === props.currentUser.id
}

function handleReapply(row) {
  emit('reapply', row.workId)
}
</script>

<template>
  <div>
    <div style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">
      <el-input v-model="keyword" placeholder="搜索：授权名称/人员/证书编号" style="max-width: 300px;" clearable />
      <el-tag type="info">当前视图：{{ isDeptViewer ? '本部门所有授权' : '我的授权' }}</el-tag>
    </div>

    <el-table :data="filtered" border stripe>
      <el-table-column prop="applicantName" label="人员" width="120" />
      <el-table-column prop="department" label="部门" width="120" />
      <el-table-column prop="workName" label="授权名称" min-width="220" show-overflow-tooltip />
      <el-table-column prop="certificateNumber" label="证书编号" width="160" />
      <el-table-column prop="issuedAt" label="生效时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.issuedAt) }}</template>
      </el-table-column>
      <el-table-column prop="expireAt" label="失效时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.expireAt) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getDerivedStatus(row).type">{{ getDerivedStatus(row).text }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canReapply(row)" type="primary" size="small" @click="handleReapply(row)">复审</el-button>
          <el-button v-if="canTerminate(row)" type="danger" size="small" @click="handleTerminate(row)">授权终止</el-button>
          <span v-if="!canReapply(row) && !canTerminate(row)" style="color:#999;">—</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
  
</template>

<style scoped>
</style>


