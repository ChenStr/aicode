<script setup>
import { ref, computed } from 'vue'
import { getVisibleAssessments, mtaAssessmentsStore } from '../mtaAssessments'
import { USERS } from '../user'
import { View, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({ currentUser: { type: Object, required: true } })
const emit = defineEmits(['open-assessment-detail'])

// 列表与筛选
const keyword = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(10)

// 获取可见的考核记录
const visibleAssessments = computed(() => getVisibleAssessments(props.currentUser))

// 辅助函数
function getUserName(userId) {
  const user = USERS.find(u => u.id === userId)
  return user ? user.name : userId
}

function getAssessorNames(assessorIds) {
  return assessorIds.map(id => getUserName(id)).join('、')
}

function getStatusType(status) {
  const statusMap = {
    '待考核': 'warning',
    '待考核组成员签名': 'info',
    '待申请人签名确认': 'primary',
    '考核完成': 'success'
  }
  return statusMap[status] || 'info'
}

function formatYmdDash(dateStr) {
  if (!dateStr) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

// 筛选和分页
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return visibleAssessments.value.filter(a => {
    const hitKw = !kw || 
      getUserName(a.applicantId).toLowerCase().includes(kw) ||
      a.targetMtaName.toLowerCase().includes(kw) ||
      a.assessmentForm.toLowerCase().includes(kw)
    const hitStatus = !statusFilter.value || a.status === statusFilter.value
    return hitKw && hitStatus
  })
})

const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

// 查看详情
function viewDetail(assessment) {
  emit('open-assessment-detail', assessment.id)
}

// 刷新
function refresh() {
  ElMessage.success('已刷新')
}
</script>

<template>
  <section class="mta-assessment-page">
    <div class="page-header">
      <div class="title">
        <el-icon><View /></el-icon>
        <span>MTA 考核</span>
      </div>
      <el-button type="default" :icon="Refresh" @click="refresh">刷新</el-button>
    </div>

    <div class="filters">
      <el-form inline>
        <el-form-item label="关键字">
          <el-input 
            v-model="keyword" 
            placeholder="申请人/授权名称/考核形式" 
            clearable 
            style="width: 240px" 
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusFilter" clearable placeholder="全部" style="width: 160px">
            <el-option label="待考核" value="待考核" />
            <el-option label="待考核组成员签名" value="待考核组成员签名" />
            <el-option label="待申请人签名确认" value="待申请人签名确认" />
            <el-option label="考核完成" value="考核完成" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="paged" stripe>
      <el-table-column label="申请人" width="100">
        <template #default="{ row }">{{ getUserName(row.applicantId) }}</template>
      </el-table-column>
      <el-table-column prop="assessmentDate" label="考核日期" width="110">
        <template #default="{ row }">{{ row.assessmentDate ? formatYmdDash(row.assessmentDate) : '-' }}</template>
      </el-table-column>
      <el-table-column prop="assessmentForm" label="考核形式" width="100" />
      <el-table-column label="申请单项技术授权名称" min-width="180">
        <template #default="{ row }">{{ row.targetMtaName }}</template>
      </el-table-column>
      <el-table-column label="考核小组成员" min-width="150">
        <template #default="{ row }">{{ getAssessorNames(row.assessorIds) }}</template>
      </el-table-column>
      <el-table-column prop="writtenScore" label="笔试成绩" width="90">
        <template #default="{ row }">
          <span v-if="row.assessmentForm === '面试+笔试'">{{ row.writtenScore || '-' }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="assessmentConclusion" label="考核结论" width="120" />
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" type="primary" :icon="View" @click="viewDetail(row)">查看详情</el-button>
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
.mta-assessment-page { 
  display: flex; 
  flex-direction: column; 
  gap: 12px; 
  max-width: 100%;
  overflow-x: auto;
}
.page-header { display: flex; align-items: center; justify-content: space-between; }
.title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 18px; }
.filters { background: #fff; padding: 10px; border-radius: 8px; }
.pagination { display: flex; justify-content: flex-end; padding: 10px 0; }
</style>
