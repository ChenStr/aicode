<script setup>
import { computed } from 'vue'
import { USERS, currentUser } from '../user'
import { positionsStore } from '../positions'
import { listMyMtaCerts } from '../mtaProcesses'

const me = computed(() => USERS.find(u => u.id === currentUser.id) || currentUser)

const myPosition = computed(() => {
  if (!me.value) return null
  const deptPositions = positionsStore.items.filter(p => p.department === me.value.department)
  if (!deptPositions.length) return null
  // 简化匹配策略：取部门下第一个岗位；如需更精确，可结合岗位规划数据
  return deptPositions[0]
})

const mySpecialCerts = computed(() => {
  if (!me.value) return []
  return listMyMtaCerts(me.value.id)
})

function getMtaName(mtaId) {
  return mtaId
}
</script>

<template>
  <section class="my-position">
    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header"><span>我的岗位</span></div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="姓名">{{ me?.name }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ me?.department }}</el-descriptions-item>
        <el-descriptions-item label="岗位名称">{{ myPosition?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="岗位等级">{{ myPosition?.level || '-' }}</el-descriptions-item>
        <el-descriptions-item label="上级岗位">{{ myPosition?.parentPosition || '-' }}</el-descriptions-item>
        <el-descriptions-item label="岗位说明" :span="2">{{ myPosition?.description || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header"><span>特种作业证书</span></div>
      </template>
      <el-table :data="mySpecialCerts" size="small" stripe>
        <el-table-column label="授权/证书" min-width="220">
          <template #default="{ row }">{{ getMtaName(row.mtaId) }}</template>
        </el-table-column>
        <el-table-column prop="obtainedAt" label="取得日期" width="140" />
        <el-table-column prop="expireAt" label="有效期至" width="140" />
      </el-table>
    </el-card>
  </section>
  
</template>

<style scoped>
.block { margin-bottom: 12px; }
.card-header { font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
</style>
