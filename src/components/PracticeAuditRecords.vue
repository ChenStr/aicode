<template>
  <section class="practice-audit-records-page">
    <div class="page-header">
      <div class="title">
        <el-icon><Tools /></el-icon>
        实践考核记录
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="statistics-cards">
      <div class="stat-card submitted">
        <div class="stat-icon">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ getStatusCount('submitted') }}</div>
          <div class="stat-label">已提交</div>
        </div>
      </div>
      <div class="stat-card training-approved">
        <div class="stat-icon">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ getStatusCount('training_approved') }}</div>
          <div class="stat-label">培训工程师已审核</div>
        </div>
      </div>
      <div class="stat-card assessor-assigned">
        <div class="stat-icon">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ getStatusCount('assessor_assigned') }}</div>
          <div class="stat-label">待考核</div>
        </div>
      </div>
      <div class="stat-card assessed">
        <div class="stat-icon">
          <el-icon><Check /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ getStatusCount('assessed') }}</div>
          <div class="stat-label">考核完成</div>
        </div>
      </div>
      <div class="stat-card rejected">
        <div class="stat-icon">
          <el-icon><Close /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ getStatusCount('rejected') }}</div>
          <div class="stat-label">已驳回</div>
        </div>
      </div>
    </div>

    <div class="filters">
      <el-form inline>
        <el-form-item label="实践项目">
          <el-input v-model="keyword" placeholder="搜索实践项目名称" clearable style="width: 240px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusFilter" clearable placeholder="全部" style="width: 160px">
            <el-option label="已提交" value="submitted" />
            <el-option label="培训工程师已审核" value="training_approved" />
            <el-option label="待考核" value="assessor_assigned" />
            <el-option label="考核完成" value="assessed" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="filteredAudits" stripe>
      <el-table-column label="实践项目名称" min-width="200">
        <template #default="{ row }">{{ getWorkItemName(row.workItemId) }}</template>
      </el-table-column>
      <el-table-column prop="submittedAt" label="提交时间" width="140" />
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="考核人" width="120">
        <template #default="{ row }">
          {{ getAssessorName(row.assessorId) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" type="info" :icon="View" @click="viewDetails(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        layout="prev, pager, next, jumper, total"
        :total="filteredAudits.length"
        :current-page="currentPage"
        :page-size="pageSize"
        @current-change="(p) => currentPage = p"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="实践考核详情" width="600px">
      <div v-if="selectedAudit">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="实践项目">{{ getWorkItemName(selectedAudit.workItemId) }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ selectedAudit.submittedAt }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedAudit.status)">{{ getStatusText(selectedAudit.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="考核人">{{ getAssessorName(selectedAudit.assessorId) }}</el-descriptions-item>
        </el-descriptions>
        
        <div v-if="selectedAudit.attachments && selectedAudit.attachments.length > 0" style="margin-top: 16px;">
          <h4>附件列表</h4>
          <div class="attachment-list">
            <div v-for="(attachment, index) in selectedAudit.attachments" :key="index" class="attachment-item">
              <el-icon class="attachment-icon"><Document /></el-icon>
              <span class="attachment-name">{{ attachment.name || attachment }}</span>
              <div class="attachment-actions">
                <el-button size="small" type="primary" @click="viewAttachment(attachment)">查看</el-button>
                <el-button size="small" @click="downloadAttachment(attachment)">下载</el-button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedAudit.trainingEngineerComment" style="margin-top: 16px;">
          <h4>培训工程师意见</h4>
          <p>{{ selectedAudit.trainingEngineerComment }}</p>
        </div>

        <div v-if="selectedAudit.assessorComment" style="margin-top: 16px;">
          <h4>考核意见</h4>
          <p>{{ selectedAudit.assessorComment }}</p>
        </div>
      </div>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { listMyPracticeAudits } from '../trainingRecords'
import { USERS } from '../user'
import { workItemsStore } from '../workItems'
import { Tools, Document, View, Clock, Check, Close, User, Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({ 
  currentUser: { type: Object, required: true },
  initialFilter: { type: Object, default: null }
})

// 筛选条件
const keyword = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 详情弹窗
const detailVisible = ref(false)
const selectedAudit = ref(null)

// 获取我的审核记录
const myAudits = computed(() => listMyPracticeAudits(props.currentUser.id))

// 筛选后的数据
const filteredAudits = computed(() => {
  let result = myAudits.value
  
  if (keyword.value.trim()) {
    result = result.filter(audit => 
      getWorkItemName(audit.workItemId).includes(keyword.value.trim())
    )
  }
  
  if (statusFilter.value) {
    result = result.filter(audit => audit.status === statusFilter.value)
  }
  
  return result
})

// 获取工作项名称
function getWorkItemName(id) {
  const item = workItemsStore.items.find(w => w.id === id)
  return item ? item.name : id
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    'submitted': '已提交',
    'training_approved': '培训工程师已审核',
    'assessor_assigned': '已安排考核',
    'assessed': '考核完成',
    'rejected': '已驳回'
  }
  return statusMap[status] || status
}

// 获取状态类型
function getStatusType(status) {
  if (status === 'assessed') return 'success'
  if (status === 'rejected') return 'danger'
  return 'info'
}

// 获取考核人姓名
function getAssessorName(assessorId) {
  if (!assessorId) return '-'
  const u = USERS.find(u => u.id === assessorId)
  return u ? u.name : assessorId
}

// 查看详情
function viewDetails(audit) {
  selectedAudit.value = audit
  detailVisible.value = true
}

// 监听初始筛选条件
watch(() => props.initialFilter, (newFilter) => {
  if (newFilter) {
    keyword.value = newFilter.workItemName || ''
    // 重置其他筛选条件
    statusFilter.value = ''
    currentPage.value = 1
  }
}, { immediate: true })

// 查看附件
function viewAttachment(attachment) {
  const fileName = attachment.name || attachment
  const fileUrl = attachment.url || attachment
  
  // 如果是图片文件，在新窗口中打开
  if (isImageFile(fileName)) {
    window.open(fileUrl, '_blank')
  } else {
    // 其他文件类型，尝试在新窗口中打开
    window.open(fileUrl, '_blank')
  }
}

// 下载附件
function downloadAttachment(attachment) {
  const fileName = attachment.name || attachment
  const fileUrl = attachment.url || attachment
  
  try {
    // 创建一个临时的 a 标签来触发下载
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    ElMessage.success('下载已开始')
  } catch (error) {
    ElMessage.error('下载失败，请稍后重试')
    console.error('下载附件失败:', error)
  }
}

// 判断是否为图片文件
function isImageFile(fileName) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  return imageExtensions.includes(extension)
}

// 获取指定状态的记录数量
function getStatusCount(status) {
  return myAudits.value.filter(audit => audit.status === status).length
}
</script>

<style scoped>
.practice-audit-records-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 18px;
}

.statistics-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-card.submitted .stat-icon {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.stat-card.training-approved .stat-icon {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.stat-card.assessor-assigned .stat-icon {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.stat-card.assessed .stat-icon {
  background: linear-gradient(135deg, #10b981, #059669);
}

.stat-card.rejected .stat-icon {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.filters {
  background: white;
  padding: 16px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.attachment-list {
  margin-top: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 8px;
  background: #f9fafb;
}

.attachment-icon {
  margin-right: 8px;
  color: #6b7280;
}

.attachment-name {
  flex: 1;
  margin-right: 12px;
  color: #374151;
  font-size: 14px;
}

.attachment-actions {
  display: flex;
  gap: 8px;
}
</style>
