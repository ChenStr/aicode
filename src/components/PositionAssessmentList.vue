<script setup>
import { computed, ref } from 'vue'
import { findAssessmentsByUser } from '../positionAssessments'
import { USERS } from '../user'
import { positionsStore } from '../positions'

const props = defineProps({ currentUser: { type: Object, required: true } })
const emit = defineEmits(['open-detail'])

const keyword = ref('')
const list = computed(() => {
  const rows = findAssessmentsByUser(props.currentUser)
  const kw = keyword.value.trim().toLowerCase()
  return rows.filter(r => {
    if (!kw) return true
    const applicant = USERS.find(u => u.id === r.applicantId)
    const applicantName = applicant?.name || r.applicantId
    const pos = positionsStore.items.find(p => p.id === r.targetPositionId)
    const posName = pos?.name || r.targetPositionId
    return `${applicantName}${posName}`.toLowerCase().includes(kw)
  })
})

function getApplicantName(id) {
  return USERS.find(u => u.id === id)?.name || id
}
function getTargetPositionName(id) {
  return positionsStore.items.find(p => p.id === id)?.name || id
}
function getResultText(v) {
  if (v === 'suggest_authorize') return '建议给予岗位技术授权'
  if (v === 'failed') return '答辩不合格不予授权'
  return '待评定'
}
</script>

<template>
  <section>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <h3 style="margin:0;">岗位考核</h3>
      <el-input v-model="keyword" placeholder="搜索 申请人/目标岗位" style="max-width:260px;" clearable />
    </div>
    <el-table :data="list" stripe>
      <el-table-column label="申请人" min-width="140">
        <template #default="{ row }">{{ getApplicantName(row.applicantId) }}</template>
      </el-table-column>
      <el-table-column label="目标岗位" min-width="180">
        <template #default="{ row }">{{ getTargetPositionName(row.targetPositionId) }}</template>
      </el-table-column>
      <el-table-column label="考核结果" width="200">
        <template #default="{ row }">
          <el-tag :type="row.finalResult === 'suggest_authorize' ? 'success' : (row.finalResult === 'failed' ? 'danger' : 'info')">
            {{ getResultText(row.finalResult) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status === 'completed' ? 'success' : 'warning'">{{ row.status === 'completed' ? '已完成' : '进行中' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="emit('open-detail', row.id)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<style scoped>
</style>


