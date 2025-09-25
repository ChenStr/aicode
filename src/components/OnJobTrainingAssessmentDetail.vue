<template>
  <div class="on-job-training-assessment-detail">
    <div class="header">
      <button class="back-btn" @click="$emit('back')">
        ← 返回
      </button>
      <h2>{{ assessment?.activityName || '在岗培训考核详情' }}</h2>
    </div>

    <div v-if="!assessment" class="loading">
      <p>加载中...</p>
    </div>

    <div v-else class="content">
      <!-- 考核基本信息 -->
      <div class="info-section">
        <h3>考核基本信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>课程名称：</label>
            <span>{{ assessment.courseName }}</span>
          </div>
          <div class="info-item">
            <label>考核方式：</label>
            <span>{{ assessment.assessmentMethods.join('、') }}</span>
          </div>
          <div class="info-item">
            <label>讲师：</label>
            <span>{{ assessment.instructorName }}</span>
          </div>
          <div class="info-item">
            <label>部门：</label>
            <span>{{ assessment.department }}</span>
          </div>
          <div class="info-item">
            <label>状态：</label>
            <span class="status-badge" :class="assessment.status === '已完成' ? 'completed' : 'in-progress'">
              {{ assessment.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- 学员考核列表 -->
      <div class="students-section">
        <div class="students-header">
          <h3>学员考核列表</h3>
          <div v-if="assessment?.instructorId === currentUser.id" class="filter-controls">
            <label>筛选状态：</label>
            <select v-model="statusFilter" @change="filterStudents">
              <option value="">全部</option>
              <option value="incomplete">未完成考核</option>
              <option value="complete">已完成考核</option>
            </select>
          </div>
        </div>
        <div class="students-list">
          <div 
            v-for="student in filteredStudents" 
            :key="student.id"
            class="student-card"
            :class="{ 'completed-assessment': student.status === '已完成' }"
          >
            <div class="student-header">
              <div class="student-info">
                <h4>{{ student.userName }}</h4>
                <span class="department">{{ student.userDepartment }} - {{ student.userPosition }}</span>
              </div>
              <span class="status-badge" :class="student.status === '已完成' ? 'completed' : 'in-progress'">
                {{ student.status }}
              </span>
            </div>

            <div class="student-actions">
              <!-- 讲师操作 -->
              <template v-if="assessment?.instructorId === currentUser.id">
                <!-- 面试考核 -->
                <button 
                  v-if="student.assessmentMethods.includes('面试')"
                  class="action-btn interview-btn"
                  @click="openInterviewEvaluation(student)"
                >
                  面试考核
                </button>
                
                <!-- 培训报告 -->
                <button 
                  v-if="student.assessmentMethods.includes('报告')"
                  class="action-btn report-btn"
                  @click="openTrainingReport(student)"
                >
                  培训报告
                </button>
                
                <!-- 成绩录入 -->
                <button 
                  class="action-btn score-btn"
                  @click="openScoreEntry(student)"
                >
                  成绩录入
                </button>
              </template>
              
              <!-- 学员操作 -->
              <template v-else>
                <!-- 面试考核评价（学员只能查看） -->
                <button 
                  v-if="student.assessmentMethods.includes('面试')"
                  class="action-btn interview-btn"
                  @click="openInterviewEvaluation(student)"
                >
                  查看面试评价
                </button>
                
                <!-- 培训报告（学员只能填写报告） -->
                <button 
                  v-if="student.assessmentMethods.includes('报告')"
                  class="action-btn report-btn"
                  @click="openTrainingReport(student)"
                >
                  填写报告
                </button>
                
                <!-- 成绩单（学员只能查看） -->
                <button 
                  class="action-btn score-btn"
                  @click="openScoreSheet(student)"
                >
                  查看成绩
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions-section">
        <button 
          v-if="assessment.status === '进行中' && assessment.instructorId === currentUser.id"
          class="complete-btn"
          @click="completeAssessment"
        >
          完成考核
        </button>
      </div>
    </div>

    <!-- 面试考核评价弹窗 -->
    <div v-if="showInterviewModal" class="modal-overlay" @click="closeInterviewModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ canEditInterview ? '面试考核评价' : '查看面试考核评价' }} - {{ currentStudent?.userName }}</h3>
          <button class="close-btn" @click="closeInterviewModal">×</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="saveInterviewEvaluation">
            <div class="form-grid">
              <div class="form-item">
                <label>姓名：</label>
                <input type="text" v-model="interviewForm.name" readonly />
              </div>
              <div class="form-item">
                <label>部门：</label>
                <input type="text" v-model="interviewForm.department" readonly />
              </div>
              <div class="form-item">
                <label>岗位：</label>
                <input type="text" v-model="interviewForm.position" readonly />
              </div>
              <div class="form-item">
                <label>考核形式：</label>
                <select v-model="interviewForm.assessmentForm" :disabled="!canEditInterview" required>
                  <option value="">请选择</option>
                  <option value="面试">面试</option>
                  <option value="实操/实践">实操/实践</option>
                </select>
              </div>
              <div class="form-item">
                <label>培训项目：</label>
                <input type="text" v-model="interviewForm.trainingProject" readonly />
              </div>
              <div class="form-item">
                <label>考核日期：</label>
                <input type="date" v-model="interviewForm.assessmentDate" :readonly="!canEditInterview" required />
              </div>
            </div>
            
            <div class="form-item full-width">
              <label>考核内容：</label>
              <textarea v-model="interviewForm.assessmentContent" rows="3" :readonly="!canEditInterview" required></textarea>
            </div>
            
            <div class="form-item full-width">
              <label>考核情况：</label>
              <textarea v-model="interviewForm.assessmentSituation" rows="3" :readonly="!canEditInterview" required></textarea>
            </div>
            
            <div class="form-item">
              <label>考核成绩：</label>
              <select v-model="interviewForm.assessmentScore" :disabled="!canEditInterview" required>
                <option value="">请选择</option>
                <option value="优秀">优秀</option>
                <option value="良好">良好</option>
                <option value="合格">合格</option>
                <option value="不合格">不合格</option>
              </select>
            </div>
            
            <div class="form-item full-width">
              <label>总体建议：</label>
              <textarea v-model="interviewForm.overallSuggestion" rows="3" :readonly="!canEditInterview"></textarea>
            </div>
            
            <div class="form-item full-width">
              <label>改进建议：</label>
              <textarea v-model="interviewForm.improvementSuggestion" rows="3" :readonly="!canEditInterview"></textarea>
            </div>
            
            <div class="form-item">
              <label>考核人签名：</label>
              <input type="text" v-model="interviewForm.assessorSignature" :readonly="!canEditInterview" required />
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="cancel-btn" @click="closeInterviewModal">
            {{ canEditInterview ? '取消' : '关闭' }}
          </button>
          <button v-if="canEditInterview" type="button" class="save-btn" @click="saveInterviewEvaluation">保存</button>
        </div>
      </div>
    </div>

    <!-- 培训报告弹窗 -->
    <div v-if="showReportModal" class="modal-overlay" @click="closeReportModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>培训报告 - {{ currentStudent?.userName }}</h3>
          <button class="close-btn" @click="closeReportModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-item">
              <label>姓名：</label>
              <input type="text" v-model="reportForm.name" readonly />
            </div>
            <div class="form-item">
              <label>部门：</label>
              <input type="text" v-model="reportForm.department" readonly />
            </div>
            <div class="form-item">
              <label>岗位：</label>
              <input type="text" v-model="reportForm.position" readonly />
            </div>
          </div>
          
          <div class="form-item full-width">
            <label>报告内容：</label>
            <textarea 
              v-model="reportForm.reportContent" 
              rows="6" 
              :readonly="currentUser.id !== currentStudent?.userId"
              placeholder="请填写培训报告内容..."
            ></textarea>
          </div>
          
          <div v-if="currentUser.id === currentStudent?.userId" class="form-actions">
            <button type="button" class="submit-btn" @click="submitReport">提交报告</button>
          </div>
          
          <div v-if="reportForm.reviewComment" class="form-item full-width">
            <label>报告评审意见：</label>
            <textarea v-model="reportForm.reviewComment" rows="3" readonly></textarea>
          </div>
          
          <div v-if="currentUser.id === assessment?.instructorId && !reportForm.reviewComment" class="form-item full-width">
            <label>报告评审意见：</label>
            <textarea v-model="reportForm.reviewComment" rows="3" placeholder="请填写评审意见..."></textarea>
            <button type="button" class="review-btn" @click="submitReview">提交评审</button>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="cancel-btn" @click="closeReportModal">关闭</button>
        </div>
      </div>
    </div>

    <!-- 成绩录入弹窗 -->
    <div v-if="showScoreModal" class="modal-overlay" @click="closeScoreModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>成绩录入 - {{ currentStudent?.userName }}</h3>
          <button class="close-btn" @click="closeScoreModal">×</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="saveScores">
            <div class="scores-grid">
              <!-- 笔试成绩 -->
              <div v-if="currentStudent?.assessmentMethods.includes('笔试')" class="form-item">
                <label>笔试成绩：</label>
                <div class="score-input-group">
                  <input 
                    type="number" 
                    v-model="scoreForm.writtenScore" 
                    min="0" 
                    max="100" 
                    placeholder="请输入笔试成绩"
                  />
                  <span class="score-unit">分</span>
                </div>
              </div>

              <!-- 报告成绩 -->
              <div v-if="currentStudent?.assessmentMethods.includes('报告')" class="form-item">
                <label>报告成绩：</label>
                <div class="score-input-group">
                  <input 
                    type="number" 
                    v-model="scoreForm.reportScore" 
                    min="0" 
                    max="100" 
                    placeholder="请输入报告成绩"
                  />
                  <span class="score-unit">分</span>
                </div>
              </div>

              <!-- 面试成绩 -->
              <div v-if="currentStudent?.assessmentMethods.includes('面试')" class="form-item">
                <label>面试成绩：</label>
                <div class="score-input-group">
                  <input 
                    type="number" 
                    v-model="scoreForm.interviewScore" 
                    min="0" 
                    max="100" 
                    placeholder="请输入面试成绩"
                  />
                  <span class="score-unit">分</span>
                </div>
              </div>
            </div>
            
            <div class="form-item full-width">
              <label>总体评价：</label>
              <textarea 
                v-model="scoreForm.instructorComment" 
                rows="4" 
                placeholder="请输入对学员的总体评价..."
              ></textarea>
            </div>
            
            <div class="form-item">
              <label>考核结果：</label>
              <div class="pass-options">
                <label class="radio-option">
                  <input 
                    type="radio" 
                    v-model="scoreForm.passed" 
                    :value="true"
                  />
                  <span class="radio-label pass">通过</span>
                </label>
                <label class="radio-option">
                  <input 
                    type="radio" 
                    v-model="scoreForm.passed" 
                    :value="false"
                  />
                  <span class="radio-label fail">不通过</span>
                </label>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="cancel-btn" @click="closeScoreModal">取消</button>
          <button type="button" class="save-btn" @click="saveScores">保存成绩</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  getAssessmentById, 
  getStudentAssessmentsByAssessmentId,
  updateInterviewEvaluation,
  updateTrainingReport,
  submitTrainingReport,
  reviewTrainingReport,
  completeAssessment as completeAssessmentAction,
  updateStudentScore
} from '../onJobTrainingAssessments.js'
import { updateActivityStatus } from '../onJobTraining.js'

const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  },
  assessmentId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['back', 'open-score-sheet'])

const assessment = ref(null)
const studentAssessments = ref([])
const showInterviewModal = ref(false)
const showReportModal = ref(false)
const showScoreModal = ref(false)
const currentStudent = ref(null)
const statusFilter = ref('')

const interviewForm = ref({
  name: '',
  department: '',
  position: '',
  assessmentForm: '',
  trainingProject: '',
  assessmentDate: '',
  assessmentContent: '',
  assessmentSituation: '',
  assessmentScore: '',
  overallSuggestion: '',
  improvementSuggestion: '',
  assessorSignature: '',
  signatureDate: ''
})

const reportForm = ref({
  name: '',
  department: '',
  position: '',
  reportContent: '',
  reviewComment: ''
})

const scoreForm = ref({
  writtenScore: null,
  reportScore: null,
  interviewScore: null,
  passed: false,
  instructorComment: ''
})

// 计算属性：判断当前用户是否有编辑面试评价的权限
const canEditInterview = computed(() => {
  return assessment.value?.instructorId === props.currentUser.id
})

// 计算属性：筛选后的学员列表
const filteredStudents = computed(() => {
  if (!statusFilter.value) {
    return studentAssessments.value
  }
  
  return studentAssessments.value.filter(student => {
    if (statusFilter.value === 'complete') {
      return student.status === '已完成'
    } else if (statusFilter.value === 'incomplete') {
      return student.status === '进行中'
    }
    return true
  })
})

// 判断学员考核是否完成
function isStudentAssessmentComplete(student) {
  // 检查面试考核是否完成
  const hasInterview = student.assessmentMethods.includes('面试')
  const interviewComplete = !hasInterview || (
    student.interviewEvaluation.assessmentForm &&
    student.interviewEvaluation.assessmentDate &&
    student.interviewEvaluation.assessmentContent &&
    student.interviewEvaluation.assessmentSituation &&
    student.interviewEvaluation.assessmentScore &&
    student.interviewEvaluation.assessorSignature
  )
  
  // 检查培训报告是否完成（如果有报告考核方式）
  const hasReport = student.assessmentMethods.includes('报告')
  const reportComplete = !hasReport || (
    student.trainingReport.reportContent &&
    student.trainingReport.reviewComment
  )
  
  return interviewComplete && reportComplete
}

// 筛选学员
function filterStudents() {
  // 筛选逻辑已在 computed 中处理
}

function loadAssessment() {
  assessment.value = getAssessmentById(props.assessmentId)
  if (assessment.value) {
    const allStudentAssessments = getStudentAssessmentsByAssessmentId(props.assessmentId)
    
    // 如果是讲师，显示所有学员的考核记录
    // 如果是学员，只显示自己的考核记录
    if (assessment.value.instructorId === props.currentUser.id) {
      studentAssessments.value = allStudentAssessments
    } else {
      studentAssessments.value = allStudentAssessments.filter(sa => sa.userId === props.currentUser.id)
    }
  }
}

function openInterviewEvaluation(student) {
  currentStudent.value = student
  interviewForm.value = { ...student.interviewEvaluation }
  showInterviewModal.value = true
}

function closeInterviewModal() {
  showInterviewModal.value = false
  currentStudent.value = null
}

function saveInterviewEvaluation() {
  if (!currentStudent.value) return
  
  interviewForm.value.signatureDate = new Date().toISOString().slice(0, 10)
  updateInterviewEvaluation(currentStudent.value.id, interviewForm.value)
  loadAssessment()
  closeInterviewModal()
}

function openTrainingReport(student) {
  currentStudent.value = student
  reportForm.value = { ...student.trainingReport }
  showReportModal.value = true
}

function closeReportModal() {
  showReportModal.value = false
  currentStudent.value = null
}

function submitReport() {
  if (!currentStudent.value) return
  
  submitTrainingReport(currentStudent.value.id, reportForm.value.reportContent)
  loadAssessment()
  closeReportModal()
}

function submitReview() {
  if (!currentStudent.value) return
  
  reviewTrainingReport(currentStudent.value.id, reportForm.value.reviewComment)
  loadAssessment()
  closeReportModal()
}

function openScoreEntry(student) {
  currentStudent.value = student
  scoreForm.value = {
    writtenScore: student.writtenScore,
    reportScore: student.reportScore,
    interviewScore: student.interviewScore,
    passed: student.passed,
    instructorComment: student.instructorComment || ''
  }
  showScoreModal.value = true
}

function closeScoreModal() {
  showScoreModal.value = false
  currentStudent.value = null
}

function saveScores() {
  if (!currentStudent.value) {
    console.error('currentStudent is null, cannot save scores')
    return
  }
  
  const scoreData = {
    writtenScore: scoreForm.value.writtenScore ? Number(scoreForm.value.writtenScore) : null,
    reportScore: scoreForm.value.reportScore ? Number(scoreForm.value.reportScore) : null,
    interviewScore: scoreForm.value.interviewScore ? Number(scoreForm.value.interviewScore) : null,
    passed: scoreForm.value.passed,
    instructorComment: scoreForm.value.instructorComment,
    completedAt: new Date().toISOString().slice(0, 16)
  }
  
  console.log('保存成绩数据:', {
    studentId: currentStudent.value.id,
    studentName: currentStudent.value.userName,
    scoreData: scoreData,
    assessmentMethods: currentStudent.value.assessmentMethods
  })
  
  const studentId = currentStudent.value.id
  updateStudentScore(studentId, scoreData)
  loadAssessment()
  closeScoreModal()
  
  // 检查是否所有成绩都已录入完成
  const updatedStudent = studentAssessments.value.find(sa => sa.id === studentId)
  console.log('更新后的学员状态:', {
    studentName: updatedStudent?.userName,
    status: updatedStudent?.status,
    writtenScore: updatedStudent?.writtenScore,
    reportScore: updatedStudent?.reportScore,
    interviewScore: updatedStudent?.interviewScore,
    passed: updatedStudent?.passed,
    instructorComment: updatedStudent?.instructorComment
  })
  
  if (updatedStudent && updatedStudent.status === '已完成') {
    alert('成绩保存成功！该学员考核已完成。')
  } else {
    alert('成绩保存成功！')
  }
}

function openScoreSheet(student) {
  emit('open-score-sheet', student)
}

function completeAssessment() {
  if (confirm('确定要完成此考核吗？完成后将无法修改，同时会归档在岗培训活动。')) {
    completeAssessmentAction(props.assessmentId)
    // 同时归档在岗培训活动
    if (assessment.value) {
      updateActivityStatus(assessment.value.activityId, '已归档')
    }
    loadAssessment()
  }
}

onMounted(() => {
  loadAssessment()
})
</script>

<style scoped>
.on-job-training-assessment-detail {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.back-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  margin-right: 20px;
  cursor: pointer;
  font-size: 14px;
}

.back-btn:hover {
  background: #4b5563;
}

.header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 24px;
  font-weight: 600;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.info-section, .students-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.info-section h3, .students-section h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item label {
  font-weight: 500;
  color: #6b7280;
  min-width: 80px;
  margin-right: 8px;
}

.info-item span {
  color: #374151;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.in-progress {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.completed {
  background: #d1fae5;
  color: #059669;
}

.students-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.student-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.student-card.completed-assessment {
  border-color: #10b981;
  background: #d1fae5;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
}

.student-card.completed-assessment .student-info h4 {
  color: #065f46;
}

.student-card.completed-assessment .department {
  color: #047857;
}

.student-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.student-info h4 {
  margin: 0 0 4px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.department {
  color: #6b7280;
  font-size: 14px;
}

.reminder-text {
  color: #d97706;
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
}

.students-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-controls label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.filter-controls select {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.score-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-input-group input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.score-unit {
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.pass-options {
  display: flex;
  gap: 20px;
}

.radio-option {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  margin-right: 8px;
}

.radio-label {
  font-size: 16px;
  font-weight: 500;
}

.radio-label.pass {
  color: #059669;
}

.radio-label.fail {
  color: #dc2626;
}

.student-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f3f4f6;
}

.interview-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.report-btn:hover {
  border-color: #10b981;
  color: #10b981;
}

.score-btn:hover {
  border-color: #f59e0b;
  color: #f59e0b;
}

.actions-section {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.complete-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.complete-btn:hover {
  background: #059669;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
}

.form-item.full-width {
  grid-column: 1 / -1;
}

.form-item label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-item input,
.form-item select,
.form-item textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.form-item input:readonly,
.form-item textarea:readonly {
  background: #f9fafb;
  color: #6b7280;
}

.form-item select:disabled {
  background: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.form-actions {
  margin: 16px 0;
}

.submit-btn, .review-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.submit-btn:hover, .review-btn:hover {
  background: #2563eb;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #4b5563;
}

.save-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.save-btn:hover {
  background: #059669;
}

@media (max-width: 768px) {
  .on-job-training-assessment-detail {
    padding: 15px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .student-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .student-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .modal-content {
    width: 95%;
    margin: 20px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
