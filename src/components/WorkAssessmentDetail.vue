<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, User, Calendar, Briefcase, UserFilled, Edit, Check, Close, Document } from '@element-plus/icons-vue'
import { updateWorkAssessment, addAssessmentSignature, getAllWorkAssessments, getWorkAuthorizationName } from '../workAssessments'
import { USERS } from '../user'

const props = defineProps({
  currentUser: { type: Object, required: true },
  assessment: { type: Object, required: true }
})

const emit = defineEmits(['back', 'assessment-complete'])

const loading = ref(false)

// 创建assessment的computed属性，方便模板使用
const assessment = computed(() => props.assessment)

// 表单数据
const form = ref({
  assessmentContent: '',
  assessmentEvaluation: '',
  improvementSuggestions: '',
  conclusion: ''
})

// 考核结论选项
const conclusionOptions = [
  { label: '建议给予授权', value: 'suggest_authorize' },
  { label: '不合格不予授权', value: 'failed' }
]

// 权限检查
const isAssessor = computed(() => {
  return props.assessment && props.assessment.assessorIds.includes(props.currentUser.id)
})

const canEdit = computed(() => {
  return isAssessor.value && props.assessment.status !== 'completed'
})

const hasSigned = computed(() => {
  if (!props.assessment) return false
  return props.assessment.signatures.some(sig => sig.assessorId === props.currentUser.id)
})

// 获取考核人姓名
function getAssessorName(assessorId) {
  const user = USERS.find(u => u.id === assessorId)
  return user ? user.name : assessorId
}

// 获取考核人信息
const assessorInfo = computed(() => {
  if (!props.assessment) return []
  return props.assessment.assessorIds.map(id => {
    const user = USERS.find(u => u.id === id)
    const signature = props.assessment.signatures.find(sig => sig.assessorId === id)
    return {
      id,
      name: user ? user.name : id,
      department: user ? user.department : '-',
      signed: !!signature,
      signedAt: signature ? signature.signedAt : null
    }
  })
})

// 初始化表单数据
function initForm() {
  if (props.assessment) {
    form.value = {
      assessmentContent: props.assessment.assessmentContent || '',
      assessmentEvaluation: props.assessment.assessmentEvaluation || '',
      improvementSuggestions: props.assessment.improvementSuggestions || '',
      conclusion: props.assessment.conclusion || ''
    }
  }
}

// 保存考核信息
function saveAssessment() {
  if (!canEdit.value) return
  
  try {
    const updates = {
      assessmentContent: form.value.assessmentContent,
      assessmentEvaluation: form.value.assessmentEvaluation,
      improvementSuggestions: form.value.improvementSuggestions,
      conclusion: form.value.conclusion,
      status: 'in_progress'
    }
    
    updateWorkAssessment(props.assessment.id, updates)
    ElMessage.success('保存成功')
    // 通知父组件更新数据
    emit('assessment-complete')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 电子签名
function performSignature() {
  if (!isAssessor.value) return
  
  // 检查是否已填写必要信息
  if (!form.value.assessmentContent || !form.value.assessmentEvaluation || !form.value.conclusion) {
    ElMessage.warning('请先完成考核内容、考核评价和考核结论的填写')
    return
  }
  
  ElMessageBox.confirm(
    '确认进行电子签名？签名后将无法撤销。',
    '电子签名确认',
    {
      confirmButtonText: '确认签名',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const user = USERS.find(u => u.id === props.currentUser.id)
    addAssessmentSignature(props.assessment.id, props.currentUser.id, user ? user.name : props.currentUser.id)
    ElMessage.success('电子签名成功')
    
    // 检查是否所有考核人都已签名
    const updatedAssessment = getAllWorkAssessments().find(a => a.id === props.assessment.id)
    if (updatedAssessment && updatedAssessment.status === 'completed') {
      ElMessage.success('所有考核人已完成签名，考核流程结束')
      emit('assessment-complete')
    }
  }).catch(() => {
    // 用户取消签名
  })
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

onMounted(() => {
  initForm()
})
</script>

<template>
  <section class="work-assessment-detail">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="emit('back')">返回</el-button>
        <h2>工作考核详情</h2>
      </div>
      <div class="header-right">
        <el-tag v-if="assessment" :type="getStatusType(assessment.status)">
          {{ getStatusText(assessment.status) }}
        </el-tag>
      </div>
    </div>

    <!-- 申请人信息 -->
    <el-card v-if="assessment" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><User /></el-icon>
          <span>申请人信息</span>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="姓名">{{ assessment.applicantName }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ assessment.department }}</el-descriptions-item>
        <el-descriptions-item label="学历">{{ assessment.education }}</el-descriptions-item>
        <el-descriptions-item label="工龄">{{ assessment.workYears }} 年</el-descriptions-item>
        <el-descriptions-item label="工作授权" :span="2">{{ getWorkAuthorizationName(assessment.workId) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 考核信息 -->
    <el-card v-if="assessment" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Calendar /></el-icon>
          <span>考核信息</span>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="考核日期">{{ assessment.assessmentDate }}</el-descriptions-item>
        <el-descriptions-item label="考核状态">
          <el-tag :type="getStatusType(assessment.status)">{{ getStatusText(assessment.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="考核结论" :span="2">
          <el-tag v-if="assessment.conclusion" :type="assessment.conclusion === 'suggest_authorize' ? 'success' : 'danger'">
            {{ getConclusionText(assessment.conclusion) }}
          </el-tag>
          <span v-else class="text-muted">-</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 考核小组成员 -->
    <el-card v-if="assessment" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><UserFilled /></el-icon>
          <span>考核小组成员</span>
        </div>
      </template>
      <el-table :data="assessorInfo" stripe>
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column label="签名状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.signed ? 'success' : 'warning'" size="small">
              {{ row.signed ? '已签名' : '未签名' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="signedAt" label="签名时间" width="180" />
      </el-table>
    </el-card>

    <!-- 考核内容填写 -->
    <el-card v-if="assessment && canEdit" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Document /></el-icon>
          <span>考核内容填写</span>
          <el-tag type="info" size="small" style="margin-left: 8px">
            考核小组成员可共同填写
          </el-tag>
        </div>
      </template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="考核内容" required>
          <el-input 
            v-model="form.assessmentContent" 
            type="textarea" 
            :rows="4" 
            placeholder="请填写考核内容，包括理论知识和实际操作能力考核情况"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="考核评价" required>
          <el-input 
            v-model="form.assessmentEvaluation" 
            type="textarea" 
            :rows="4" 
            placeholder="请填写考核评价，包括申请人的表现和技能水平"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="改进建议">
          <el-input 
            v-model="form.improvementSuggestions" 
            type="textarea" 
            :rows="4" 
            placeholder="请填写改进建议，帮助申请人提升技能"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="考核结论" required>
          <el-select v-model="form.conclusion" placeholder="请选择考核结论" style="width: 200px">
            <el-option 
              v-for="option in conclusionOptions" 
              :key="option.value" 
              :label="option.label" 
              :value="option.value" 
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveAssessment">保存考核内容</el-button>
          <el-button type="success" @click="performSignature" :disabled="!form.assessmentContent || !form.assessmentEvaluation || !form.conclusion">
            保存并签名
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 考核内容展示（已完成或只读） -->
    <el-card v-if="assessment && !canEdit" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Document /></el-icon>
          <span>考核内容</span>
        </div>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="考核内容">
          <div class="content-text">{{ assessment.assessmentContent || '-' }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="考核评价">
          <div class="content-text">{{ assessment.assessmentEvaluation || '-' }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="改进建议">
          <div class="content-text">{{ assessment.improvementSuggestions || '-' }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="考核结论">
          <el-tag v-if="assessment.conclusion" :type="assessment.conclusion === 'suggest_authorize' ? 'success' : 'danger'">
            {{ getConclusionText(assessment.conclusion) }}
          </el-tag>
          <span v-else class="text-muted">-</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 电子签名 -->
    <el-card v-if="assessment && isAssessor" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Check /></el-icon>
          <span>电子签名</span>
        </div>
      </template>
      <div class="signature-section">
        <div v-if="!hasSigned" class="signature-prompt">
          <el-icon><Edit /></el-icon>
          <span>请进行电子签名确认</span>
          <el-button 
            type="primary" 
            @click="performSignature" 
            class="signature-button"
            :disabled="!form.assessmentContent || !form.assessmentEvaluation || !form.conclusion"
          >
            电子签名
          </el-button>
        </div>
        <div v-else class="signature-completed">
          <el-icon><Check /></el-icon>
          <span>已签名：{{ getAssessorName(props.currentUser.id) }}</span>
          <el-tag type="success" size="small">已确认</el-tag>
        </div>
      </div>
    </el-card>

  </section>
</template>

<style scoped>
.work-assessment-detail { 
  padding: 0; 
}

.page-header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  margin-bottom: 24px; 
}

.header-left { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
}

.header-left h2 { 
  margin: 0; 
  color: #213547; 
}

.info-card { 
  margin-bottom: 20px; 
}

.card-header { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  font-weight: 600; 
  color: #213547; 
}

.signature-section { 
  padding: 16px 0; 
}

.signature-prompt { 
  display: flex; 
  align-items: center; 
  gap: 16px; 
  color: #606266; 
  font-size: 14px; 
}

.signature-completed { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  color: #67c23a; 
  font-size: 14px; 
}

.signature-button { 
  min-width: 120px; 
}

.content-text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #333;
}

.text-muted {
  color: #999;
}

.workflow-status {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.status-item.completed {
  background-color: #f0f9ff;
  color: #67c23a;
  border: 1px solid #67c23a;
}

.status-item.pending {
  background-color: #fef3c7;
  color: #f59e0b;
  border: 1px solid #f59e0b;
}

.status-item.rejected {
  background-color: #fee2e2;
  color: #ef4444;
  border: 1px solid #ef4444;
}

.status-arrow {
  font-size: 18px;
  color: #666;
  font-weight: bold;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}
</style>

