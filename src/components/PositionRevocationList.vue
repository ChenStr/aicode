<script setup>
import { ref, computed } from 'vue'
import { listByRoleScope } from '../positionRevocations'
import { positionsStore } from '../positions'

const props = defineProps({ currentUser: { type: Object, required: true } })
const emit = defineEmits(['open-detail'])

const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)

function getPositionName(positionId) {
  const p = positionsStore.items.find(p => p.id === positionId)
  return p ? p.name : positionId
}

const rows = computed(() => listByRoleScope(props.currentUser))
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return rows.value.filter(r => {
    return !kw
      || r.userName.toLowerCase().includes(kw)
      || (r.department||'').toLowerCase().includes(kw)
      || getPositionName(r.revokedPositionId).toLowerCase().includes(kw)
      || (r.status||'').toLowerCase().includes(kw)
  })
})
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function openDetail(row) { emit('open-detail', row.id) }
function statusLabel(status) {
  if (status === 'submitted') return '已提交'
  if (status === 'completed') return '已完成'
  return '待提交'
}
function statusType(status) {
  if (status === 'submitted') return 'warning'
  if (status === 'completed') return 'success'
  return 'info'
}
</script>

<template>
  <section class="revocation-page">
    <div class="page-header">
      <div class="title">岗位撤销</div>
    </div>

    <div class="filters">
      <el-form inline>
        <el-form-item label="关键字">
          <el-input v-model="keyword" placeholder="姓名/部门/岗位/状态" clearable style="width: 260px" />
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="paged" stripe>
      <el-table-column prop="userName" label="姓名" width="120" />
      <el-table-column prop="department" label="部门" width="140" />
      <el-table-column label="撤销岗位技术授权名称" min-width="200">
        <template #default="{ row }">{{ getPositionName(row.revokedPositionId) }}</template>
      </el-table-column>
      <el-table-column prop="authorizedAt" label="获得授权日期" width="140" />
      <el-table-column prop="revokedAt" label="撤销授权日期" width="140" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openDetail(row)">详情</el-button>
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
  </section>
</template>

<style scoped>
.revocation-page { display: flex; flex-direction: column; gap: 12px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.title { font-weight: 600; font-size: 18px; }
.filters { background: #fff; padding: 10px; border-radius: 8px; }
.pagination { display: flex; justify-content: flex-end; padding: 10px 0; }
</style>


