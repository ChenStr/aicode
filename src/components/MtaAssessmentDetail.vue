<script setup>
import { ref, computed } from 'vue'
import { getAssessmentById, updateAssessment, reassessAssessment, signAsAssessor, signAsApplicant, mtaAssessmentsStore } from '../mtaAssessments'
import { updateProcess } from '../mtaProcesses'
import { USERS } from '../user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close, Edit, User } from '@element-plus/icons-vue'

const props = defineProps({ 
  currentUser: { type: Object, required: true }, 
  assessmentId: { type: String, required: true } 
})
const emit = defineEmits(['back', 'assessment-complete'])

// 获取考核记录
const assessment = computed(() => getAssessmentById(props.assessmentId))

// 辅助函数
function getUserName(userId) {
  const user = USERS.find(u => u.id === userId)
  return user ? user.name : userId
}

function formatYmdDash(dateStr) {
  if (!dateStr) return ''
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

// 角色判断
const isTrainingEngineer = computed(() => props.currentUser.role === 'training_admin')
const isAssessor = computed(() => props.currentUser.role === 'assessor')
const isApplicant = computed(() => assessment.value?.applicantId === props.currentUser.id)
const canSignAsAssessor = computed(() => 
  isAssessor.value && 
  assessment.value?.assessorIds.includes(props.currentUser.id) &&
  !assessment.value?.assessorSignatures[props.currentUser.id]
)

// 重新考核对话框
const reassessDialog = ref(false)
const newAssessorIds = ref([])
const assessorOptions = computed(() => {
  return USERS.filter(u => u.role === 'assessor').map(u => ({
    label: `${u.name}（${u.department}）`,
    value: u.id
  }))
})

function openReassess() {
  newAssessorIds.value = [...assessment.value.assessorIds]
  reassessDialog.value = true
}

function doReassess() {
  if (newAssessorIds.value.length === 0) {
    ElMessage.error('请选择至少一名考核组成员')
    return
  }
  
  ElMessageBox.confirm('确定要重新考核吗？这将清除所有考核数据。', '确认重新考核', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(() => {
    reassessAssessment(props.assessmentId, newAssessorIds.value)
    ElMessage.success('已重新分配考核组成员')
    reassessDialog.value = false
  }).catch(() => {})
}

// 考核组成员签名
const assessorSignature = ref('')
const assessorSignatureDialog = ref(false)

function openAssessorSignature() {
  assessorSignature.value = ''
  assessorSignatureDialog.value = true
}

function doAssessorSignature() {
  if (!assessorSignature.value.trim()) {
    ElMessage.error('请输入签名')
    return
  }
  
  signAsAssessor(props.assessmentId, props.currentUser.id, assessorSignature.value.trim())
  ElMessage.success('签名成功')
  assessorSignatureDialog.value = false
}

// 申请人签名确认
const applicantSignature = ref('')
const applicantSignatureDialog = ref(false)

function openApplicantSignature() {
  applicantSignature.value = ''
  applicantSignatureDialog.value = true
}

function doApplicantSignature() {
  if (!applicantSignature.value.trim()) {
    ElMessage.error('请输入签名')
    return
  }
  
  ElMessageBox.confirm('确认对考核内容无异议并签名？', '确认签名', {
    type: 'warning',
    confirmButtonText: '确认签名',
    cancelButtonText: '取消'
  }).then(() => {
    signAsApplicant(props.assessmentId, applicantSignature.value.trim())
    
    // 更新对应的MTA流程状态为科长审核
    if (assessment.value?.processId) {
      updateProcess(assessment.value.processId, {
        status: 'in_progress',
        currentNode: '科长审核'
      })
    }
    
    ElMessage.success('签名确认成功，考核完成，流程已流转至科长审核')
    applicantSignatureDialog.value = false
    emit('assessment-complete')
  }).catch(() => {})
}

// 考核组成员填写考核数据
const assessmentDataDialog = ref(false)
const assessmentForm = ref({
  assessmentDate: '',
  assessmentContent: '',
  assessmentEvaluation: '',
  writtenScore: '',
  improvementSuggestions: '',
  assessmentConclusion: ''
})

function openAssessmentData() {
  const a = assessment.value
  assessmentForm.value = {
    assessmentDate: a.assessmentDate || '',
    assessmentContent: a.assessmentContent || '',
    assessmentEvaluation: a.assessmentEvaluation || '',
    writtenScore: a.writtenScore || '',
    improvementSuggestions: a.improvementSuggestions || '',
    assessmentConclusion: a.assessmentConclusion || ''
  }
  assessmentDataDialog.value = true
}

function saveAssessmentData() {
  if (!assessmentForm.value.assessmentDate) {
    ElMessage.error('请填写考核日期')
    return
  }
  if (!assessmentForm.value.assessmentContent) {
    ElMessage.error('请填写考核内容')
    return
  }
  if (!assessmentForm.value.assessmentEvaluation) {
    ElMessage.error('请填写考核评价')
    return
  }
  if (!assessmentForm.value.assessmentConclusion) {
    ElMessage.error('请选择考核结论')
    return
  }
  
  updateAssessment(props.assessmentId, assessmentForm.value)
  ElMessage.success('考核数据保存成功')
  assessmentDataDialog.value = false
}
</script>

<template>
  <section class="mta-assessment-detail" v-if="assessment">
    <!-- 考核基本信息 -->
    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header">
          <span>考核基本信息</span>
          <div v-if="isTrainingEngineer && assessment.status !== '考核完成'" class="actions">
            <el-button size="small" type="warning" :icon="Edit" @click="openReassess">重新考核</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请人">{{ getUserName(assessment.applicantId) }}</el-descriptions-item>
        <el-descriptions-item label="所在部门">{{ assessment.department }}</el-descriptions-item>
        <el-descriptions-item label="考核日期">{{ assessment.assessmentDate ? formatYmdDash(assessment.assessmentDate) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="考核形式">{{ assessment.assessmentForm }}</el-descriptions-item>
        <el-descriptions-item label="申请单项技术授权名称" :span="2">{{ assessment.targetMtaName }}</el-descriptions-item>
        <el-descriptions-item label="考核小组成员" :span="2">
          {{ assessment.assessorIds.map(id => getUserName(id)).join('、') }}
        </el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="assessment.status === '考核完成' ? 'success' : 'warning'">{{ assessment.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ assessment.createdAt }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 考核内容 -->
    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header">
          <span>考核内容</span>
          <div v-if="canSignAsAssessor" class="actions">
            <el-button size="small" type="primary" :icon="Edit" @click="openAssessmentData">填写考核数据</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="考核内容">{{ assessment.assessmentContent || '-' }}</el-descriptions-item>
        <el-descriptions-item label="考核评价">{{ assessment.assessmentEvaluation || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="assessment.assessmentForm === '面试+笔试'" label="笔试成绩">
          {{ assessment.writtenScore || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="改进建议">{{ assessment.improvementSuggestions || '-' }}</el-descriptions-item>
        <el-descriptions-item label="考核结论">{{ assessment.assessmentConclusion || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 签名信息 -->
    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header">
          <span>签名信息</span>
          <div class="actions">
            <el-button v-if="canSignAsAssessor" size="small" type="success" :icon="User" @click="openAssessorSignature">考核组成员签名</el-button>
            <el-button v-if="isApplicant && assessment.status === '待申请人签名确认'" size="small" type="primary" :icon="Check" @click="openApplicantSignature">申请人签名确认</el-button>
          </div>
        </div>
      </template>
      
      <!-- 考核组成员签名 -->
      <div class="signature-section">
        <h4>考核组成员签名</h4>
        <div class="signature-list">
          <div v-for="assessorId in assessment.assessorIds" :key="assessorId" class="signature-item">
            <span class="signature-name">{{ getUserName(assessorId) }}：</span>
            <span v-if="assessment.assessorSignatures[assessorId]" class="signature-value">
              {{ assessment.assessorSignatures[assessorId] }}
            </span>
            <span v-else class="signature-pending">待签名</span>
          </div>
        </div>
      </div>

      <!-- 申请人签名确认 -->
      <div class="signature-section">
        <h4>被考核人已确认以上考核评价并签名</h4>
        <div class="signature-item">
          <span class="signature-name">{{ getUserName(assessment.applicantId) }}：</span>
          <span v-if="assessment.applicantSignature" class="signature-value">
            {{ assessment.applicantSignature }}
          </span>
          <span v-else class="signature-pending">待签名</span>
        </div>
      </div>
    </el-card>

    <div class="actions">
      <el-button type="default" @click="emit('back')">返回</el-button>
    </div>

    <!-- 重新考核对话框 -->
    <el-dialog v-model="reassessDialog" title="重新考核" width="500px">
      <el-form label-width="120px">
        <el-form-item label="选择考核组成员" required>
          <el-select 
            v-model="newAssessorIds" 
            multiple 
            placeholder="请选择考核组成员" 
            style="width: 100%"
            :multiple-limit="5"
          >
            <el-option 
              v-for="option in assessorOptions" 
              :key="option.value" 
              :label="option.label" 
              :value="option.value" 
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reassessDialog = false">取消</el-button>
        <el-button type="warning" @click="doReassess">确定重新考核</el-button>
      </template>
    </el-dialog>

    <!-- 考核组成员签名对话框 -->
    <el-dialog v-model="assessorSignatureDialog" title="考核组成员签名" width="400px">
      <el-form label-width="80px">
        <el-form-item label="签名" required>
          <el-input v-model="assessorSignature" placeholder="请输入签名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assessorSignatureDialog = false">取消</el-button>
        <el-button type="success" @click="doAssessorSignature">确认签名</el-button>
      </template>
    </el-dialog>

    <!-- 申请人签名确认对话框 -->
    <el-dialog v-model="applicantSignatureDialog" title="申请人签名确认" width="400px">
      <el-form label-width="80px">
        <el-form-item label="签名" required>
          <el-input v-model="applicantSignature" placeholder="请输入签名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applicantSignatureDialog = false">取消</el-button>
        <el-button type="primary" @click="doApplicantSignature">确认签名</el-button>
      </template>
    </el-dialog>

    <!-- 考核数据填写对话框 -->
    <el-dialog v-model="assessmentDataDialog" title="填写考核数据" width="600px">
      <el-form label-width="120px">
        <el-form-item label="考核日期" required>
          <el-date-picker v-model="assessmentForm.assessmentDate" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="考核内容" required>
          <el-input v-model="assessmentForm.assessmentContent" type="textarea" :rows="3" placeholder="请填写考核内容" />
        </el-form-item>
        <el-form-item label="考核评价" required>
          <el-input v-model="assessmentForm.assessmentEvaluation" type="textarea" :rows="3" placeholder="请填写考核评价" />
        </el-form-item>
        <el-form-item v-if="assessment.assessmentForm === '面试+笔试'" label="笔试成绩">
          <el-input v-model="assessmentForm.writtenScore" placeholder="请输入笔试成绩" />
        </el-form-item>
        <el-form-item label="改进建议">
          <el-input v-model="assessmentForm.improvementSuggestions" type="textarea" :rows="2" placeholder="请填写改进建议" />
        </el-form-item>
        <el-form-item label="考核结论" required>
          <el-select v-model="assessmentForm.assessmentConclusion" placeholder="请选择考核结论" style="width: 100%">
            <el-option label="建议给予授权" value="建议给予授权" />
            <el-option label="不合格，重修后补考" value="不合格，重修后补考" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assessmentDataDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAssessmentData">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.mta-assessment-detail { 
  max-width: 100%;
  overflow-x: auto;
}
.block { margin-bottom: 12px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.actions { display: flex; gap: 8px; }
.signature-section { margin-bottom: 16px; }
.signature-section h4 { margin: 0 0 8px 0; font-size: 14px; color: #606266; }
.signature-list { display: flex; flex-direction: column; gap: 4px; }
.signature-item { display: flex; align-items: center; gap: 8px; }
.signature-name { font-weight: 500; min-width: 80px; }
.signature-value { color: #67c23a; font-weight: 500; }
.signature-pending { color: #909399; font-style: italic; }
.actions { margin-top: 16px; display: flex; gap: 8px; }
</style>
