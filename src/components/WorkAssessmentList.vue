<template>
  <div class="work-assessment-list">
    <div class="page-header">
      <h2>工作考核列表</h2>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索申请人或工作授权名称"
          style="width: 300px"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="筛选状态" style="width: 150px" clearable>
          <el-option label="待考核" value="pending" />
          <el-option label="考核中" value="in_progress" />
          <el-option label="已完成" value="completed" />
        </el-select>
      </div>
    </div>

    <el-table 
      :data="filteredAssessments" 
      stripe 
      v-loading="loading"
      @row-click="handleRowClick"
      style="cursor: pointer"
    >
      <el-table-column prop="applicantName" label="申请人" width="120" />
      <el-table-column prop="department" label="部门" width="120" />
      <el-table-column prop="assessmentDate" label="考核日期" width="120" />
      <el-table-column label="工作授权名称" min-width="200">
        <template #default="{ row }">
          {{ getWorkAuthorizationName(row.workId) }}
        </template>
      </el-table-column>
      <el-table-column label="考核小组成员" width="200">
        <template #default="{ row }">
          <div class="assessor-list">
            <el-tag 
              v-for="assessorId in row.assessorIds" 
              :key="assessorId" 
              size="small" 
              class="assessor-tag"
            >
              {{ getAssessorName(assessorId) }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="考核结论" width="150">
        <template #default="{ row }">
          <el-tag 
            v-if="row.conclusion" 
            :type="row.conclusion === 'suggest_authorize' ? 'success' : 'danger'"
          >
            {{ getConclusionText(row.conclusion) }}
          </el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="签名进度" width="150">
        <template #default="{ row }">
          <div class="signature-progress">
            <span>{{ row.signatures.length }}/{{ row.assessorIds.length }}</span>
            <el-progress 
              :percentage="(row.signatures.length / row.assessorIds.length) * 100" 
              :show-text="false"
              :stroke-width="6"
              :color="row.signatures.length === row.assessorIds.length ? '#67c23a' : '#409eff'"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button 
            type="primary" 
            size="small" 
            @click.stop="viewDetail(row)"
          >
            查看详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="filteredAssessments.length === 0 && !loading" class="no-data">
      <el-empty description="暂无工作考核数据" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { getWorkAssessmentsByPermission, getWorkAuthorizationName } from '../workAssessments'
import { USERS } from '../user'

const props = defineProps({
  currentUser: { type: Object, required: true }
})

const emit = defineEmits(['view-detail'])

const assessments = ref([])
const loading = ref(false)
const searchKeyword = ref('')
const statusFilter = ref('')

// 获取考核人姓名
function getAssessorName(assessorId) {
  const user = USERS.find(u => u.id === assessorId)
  return user ? user.name : assessorId
}

// 获取状态文本
function getStatusText(status) {
  const map = {
    pending: '待考核',
    in_progress: '考核中',
    completed: '已完成'
  }
  return map[status] || status
}

// 获取状态类型
function getStatusType(status) {
  const map = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success'
  }
  return map[status] || 'info'
}

// 获取结论文本
function getConclusionText(conclusion) {
  const map = {
    suggest_authorize: '建议给予授权',
    failed: '不合格不予授权'
  }
  return map[conclusion] || conclusion
}

// 过滤后的考核列表
const filteredAssessments = computed(() => {
  let result = assessments.value

  // 状态筛选
  if (statusFilter.value) {
    result = result.filter(item => item.status === statusFilter.value)
  }

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(item => 
      item.applicantName.toLowerCase().includes(keyword) ||
      getWorkAuthorizationName(item.workId).toLowerCase().includes(keyword) ||
      item.department.toLowerCase().includes(keyword)
    )
  }

  return result
})

// 加载考核数据
function loadAssessments() {
  loading.value = true
  try {
    // 根据当前用户权限获取相关考核
    assessments.value = getWorkAssessmentsByPermission(props.currentUser)
  } catch (error) {
    ElMessage.error('加载考核数据失败')
  } finally {
    loading.value = false
  }
}

// 查看详情
function viewDetail(assessment) {
  emit('view-detail', assessment)
}

// 行点击事件
function handleRowClick(row) {
  viewDetail(row)
}

onMounted(() => {
  loadAssessments()
})
</script>

<style scoped>
.work-assessment-list {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #213547;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.assessor-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.assessor-tag {
  margin: 0;
}

.signature-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.signature-progress span {
  font-size: 12px;
  color: #666;
  min-width: 30px;
}

.text-muted {
  color: #999;
}

.no-data {
  text-align: center;
  padding: 40px;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>