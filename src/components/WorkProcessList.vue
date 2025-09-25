<script setup>
import { ref, computed } from 'vue'
import { USERS } from '../user'
import { worksStore } from '../works'
import { listMyWorkProcesses, workProcessesStore, getWorkProcessTypeText, getWorkProcessStatusType } from '../workProcesses'
import { Plus, Tickets, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['open-apply-detail'])
const props = defineProps({ currentUser: { type: Object, required: true } })

// 列表筛选
const keyword = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(10)

const deptUserIds = computed(() => new Set(USERS.filter(u => u.department === props.currentUser.department).map(u => u.id)))
const isAdmin = computed(() => ['training_admin','section_chief','dept_manager'].includes(props.currentUser.role))
const baseList = computed(() => {
  if (isAdmin.value) {
    return workProcessesStore.processes.filter(p => deptUserIds.value.has(p.userId))
  }
  return listMyWorkProcesses(props.currentUser.id)
})

function getWorkName(workId) {
  const w = worksStore.items.find(i => i.id === workId)
  return w ? `${w.name}（${w.code}）` : workId
}
function getUserName(uid) { const u = USERS.find(u => u.id === uid); return u ? u.name : uid }

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return baseList.value.filter(p => {
    const hitKw = !kw || getWorkProcessTypeText(p.type).toLowerCase().includes(kw) || getWorkName(p.targetWorkId).toLowerCase().includes(kw)
    const hitStatus = !statusFilter.value || p.status === statusFilter.value
    return hitKw && hitStatus
  })
})
const paged = computed(()=>{ const start = (page.value-1)*pageSize.value; return filtered.value.slice(start, start+pageSize.value) })

// 发起流程对话框
const startDialog = ref(false)
const startType = ref('apply')
const selectedWorkId = ref('')

function openStart() {
  startDialog.value = true
  startType.value = 'apply'
  selectedWorkId.value = ''
}

function confirmAndEnterDetail() {
  if (!startType.value) { ElMessage.warning('请选择流程类型'); return }
  if (startType.value === 'apply' && !selectedWorkId.value) { ElMessage.warning('请选择目标工作授权'); return }
  startDialog.value = false
  emit('open-apply-detail', selectedWorkId.value)
}

function viewDetail(row) { emit('open-apply-detail', row.targetWorkId) }
</script>

<template>
  <section class="work-process-page">
    <div class="page-header">
      <div class="title"><el-icon><Tickets /></el-icon><span>工作发起流程</span></div>
      <el-button type="primary" :icon="Plus" @click="openStart">发起流程</el-button>
    </div>

    <div class="filters">
      <el-form inline>
        <el-form-item label="关键字">
          <el-input v-model="keyword" placeholder="流程类型/目标工作授权" clearable style="width: 240px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusFilter" clearable placeholder="全部" style="width: 160px">
            <el-option label="流程中" value="in_progress" />
            <el-option label="驳回" value="rejected" />
            <el-option label="通过" value="approved" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="paged" stripe>
      <el-table-column label="流程类型" width="140"><template #default="{ row }">{{ getWorkProcessTypeText(row.type) }}</template></el-table-column>
      <el-table-column label="目标工作授权" min-width="240"><template #default="{ row }">{{ getWorkName(row.targetWorkId) }}</template></el-table-column>
      <el-table-column label="发起人" width="100"><template #default="{ row }">{{ getUserName(row.userId) }}</template></el-table-column>
      <el-table-column prop="createdAt" label="发起时间" width="140" />
      <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag :type="getWorkProcessStatusType(row.status)">{{ row.status==='in_progress'?'流程中':row.status==='approved'?'通过':'驳回' }}</el-tag></template></el-table-column>
      <el-table-column prop="currentNode" label="当前处理节点" width="160" />
      <el-table-column label="操作" width="160"><template #default="{ row }"><el-button size="small" type="primary" :icon="View" @click="viewDetail(row)">查看详情</el-button></template></el-table-column>
    </el-table>

    <div class="pagination"><el-pagination layout="prev, pager, next, jumper, total" :total="filtered.length" :current-page="page" :page-size="pageSize" @current-change="(p)=>page=p" /></div>

    <el-dialog v-model="startDialog" title="发起流程" width="620px">
      <el-form label-width="120px">
        <el-form-item label="流程类型" required>
          <el-select v-model="startType" style="width:100%" disabled>
            <el-option label="工作授权申请" value="apply" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标工作授权" required>
          <el-select v-model="selectedWorkId" placeholder="请选择" filterable style="width:100%">
            <el-option v-for="w in worksStore.items.filter(w=>w.department===props.currentUser.department)" :key="w.id" :label="`${w.name}（${w.code}）`" :value="w.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="startDialog=false">取消</el-button>
        <el-button type="primary" @click="confirmAndEnterDetail">确定</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.work-process-page { padding: 0; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px; }
.title { display:flex; align-items:center; gap:8px; font-size: 18px; font-weight: 600; }
.filters { background:#f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
.pagination { display:flex; justify-content:center; margin-top: 16px; }
</style>

