<template>
  <div class="on-job-training-score-sheet">
    <div class="header">
      <button class="back-btn" @click="$emit('back')">
        ← 返回
      </button>
      <h2>成绩单 - {{ studentAssessment?.userName || '学员' }}</h2>
    </div>

    <div v-if="!studentAssessment" class="loading">
      <p>加载中...</p>
    </div>

    <div v-else class="content">
      <!-- 学员基本信息 -->
      <div class="info-section">
        <h3>学员基本信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>姓名：</label>
            <span>{{ studentAssessment.userName }}</span>
          </div>
          <div class="info-item">
            <label>部门：</label>
            <span>{{ studentAssessment.userDepartment }}</span>
          </div>
          <div class="info-item">
            <label>岗位：</label>
            <span>{{ studentAssessment.userPosition }}</span>
          </div>
          <div class="info-item">
            <label>培训项目：</label>
            <span>{{ assessment?.courseName }}</span>
          </div>
          <div class="info-item">
            <label>考核方式：</label>
            <span>{{ studentAssessment.assessmentMethods.join('、') }}</span>
          </div>
          <div class="info-item">
            <label>状态：</label>
            <span class="status-badge" :class="studentAssessment.status === '已完成' ? 'completed' : 'in-progress'">
              {{ studentAssessment.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- 成绩显示区域 -->
      <div class="scores-section">
        <h3>成绩结果</h3>
        <div class="scores-display">
          <div class="scores-grid">
            <!-- 笔试成绩 -->
            <div v-if="studentAssessment.assessmentMethods.includes('笔试')" class="score-item">
              <label>笔试成绩：</label>
              <div class="score-display">
                <span class="score-value">{{ studentAssessment.writtenScore || '-' }}</span>
                <span class="score-unit">分</span>
              </div>
            </div>

            <!-- 报告成绩 -->
            <div v-if="studentAssessment.assessmentMethods.includes('报告')" class="score-item">
              <label>报告成绩：</label>
              <div class="score-display">
                <span class="score-value">{{ studentAssessment.reportScore || '-' }}</span>
                <span class="score-unit">分</span>
              </div>
            </div>

            <!-- 面试成绩 -->
            <div v-if="studentAssessment.assessmentMethods.includes('面试')" class="score-item">
              <label>面试成绩：</label>
              <div class="score-display">
                <span class="score-value">{{ studentAssessment.interviewScore || '-' }}</span>
                <span class="score-unit">分</span>
              </div>
            </div>
          </div>

          <!-- 总体评价 -->
          <div class="evaluation-section">
            <label>总体评价：</label>
            <div class="evaluation-display">
              {{ studentAssessment.instructorComment || '暂无评价' }}
            </div>
          </div>

          <!-- 考核结果 -->
          <div class="pass-section">
            <label>考核结果：</label>
            <div class="result-display">
              <span class="result-badge" :class="studentAssessment.passed ? 'pass' : 'fail'">
                {{ studentAssessment.passed ? '通过' : '不通过' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 培训报告内容（如果有） -->
      <div v-if="studentAssessment.assessmentMethods.includes('报告') && studentAssessment.trainingReport.reportContent" class="report-section">
        <h3>培训报告</h3>
        <div class="report-content">
          <div class="report-header">
            <span class="report-label">报告内容：</span>
            <span class="report-status" v-if="studentAssessment.trainingReport.submittedAt">
              提交时间：{{ studentAssessment.trainingReport.submittedAt }}
            </span>
          </div>
          <div class="report-text">
            {{ studentAssessment.trainingReport.reportContent }}
          </div>
          
          <div v-if="studentAssessment.trainingReport.reviewComment" class="review-content">
            <div class="review-header">
              <span class="review-label">评审意见：</span>
              <span class="review-status" v-if="studentAssessment.trainingReport.reviewedAt">
                评审时间：{{ studentAssessment.trainingReport.reviewedAt }}
              </span>
            </div>
            <div class="review-text">
              {{ studentAssessment.trainingReport.reviewComment }}
            </div>
          </div>
        </div>
      </div>

      <!-- 面试考核评价（如果有） -->
      <div v-if="studentAssessment.assessmentMethods.includes('面试') && studentAssessment.interviewEvaluation.assessmentForm" class="interview-section">
        <h3>面试考核评价</h3>
        <div class="interview-content">
          <div class="interview-grid">
            <div class="interview-item">
              <label>考核形式：</label>
              <span>{{ studentAssessment.interviewEvaluation.assessmentForm }}</span>
            </div>
            <div class="interview-item">
              <label>考核日期：</label>
              <span>{{ studentAssessment.interviewEvaluation.assessmentDate }}</span>
            </div>
            <div class="interview-item">
              <label>考核成绩：</label>
              <span class="score-badge" :class="getScoreClass(studentAssessment.interviewEvaluation.assessmentScore)">
                {{ studentAssessment.interviewEvaluation.assessmentScore }}
              </span>
            </div>
          </div>
          
          <div class="interview-details">
            <div class="detail-item">
              <label>考核内容：</label>
              <p>{{ studentAssessment.interviewEvaluation.assessmentContent }}</p>
            </div>
            <div class="detail-item">
              <label>考核情况：</label>
              <p>{{ studentAssessment.interviewEvaluation.assessmentSituation }}</p>
            </div>
            <div class="detail-item">
              <label>总体建议：</label>
              <p>{{ studentAssessment.interviewEvaluation.overallSuggestion }}</p>
            </div>
            <div class="detail-item">
              <label>改进建议：</label>
              <p>{{ studentAssessment.interviewEvaluation.improvementSuggestion }}</p>
            </div>
            <div class="detail-item">
              <label>考核人签名：</label>
              <span>{{ studentAssessment.interviewEvaluation.assessorSignature }}</span>
              <span v-if="studentAssessment.interviewEvaluation.signatureDate" class="signature-date">
                （{{ studentAssessment.interviewEvaluation.signatureDate }}）
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  getStudentAssessmentById,
  getAssessmentById
} from '../onJobTrainingAssessments.js'

const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  },
  studentAssessmentId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['back'])

const studentAssessment = ref(null)
const assessment = ref(null)

// 移除不需要的编辑相关代码

function loadData() {
  studentAssessment.value = getStudentAssessmentById(props.studentAssessmentId)
  if (studentAssessment.value) {
    assessment.value = getAssessmentById(studentAssessment.value.assessmentId)
  }
}

function getScoreClass(score) {
  if (!score) return ''
  switch (score) {
    case '优秀': return 'excellent'
    case '良好': return 'good'
    case '合格': return 'pass'
    case '不合格': return 'fail'
    default: return ''
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.on-job-training-score-sheet {
  padding: 20px;
  max-width: 1000px;
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

.info-section, .scores-section, .report-section, .interview-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.info-section h3, .scores-section h3, .report-section h3, .interview-section h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

.scores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.score-item {
  display: flex;
  flex-direction: column;
}

.score-item label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.score-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-input-group input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  text-align: center;
}

.score-input-group input:readonly {
  background: #f9fafb;
  color: #6b7280;
}

.score-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-value {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  min-width: 40px;
  text-align: center;
}

.evaluation-display {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  color: #374151;
  line-height: 1.6;
  min-height: 60px;
}

.result-display {
  display: flex;
  align-items: center;
}

.result-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.result-badge.pass {
  background: #d1fae5;
  color: #059669;
}

.result-badge.fail {
  background: #fee2e2;
  color: #dc2626;
}

.score-unit {
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.evaluation-section {
  margin-bottom: 24px;
}

.evaluation-section label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.evaluation-section textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
}

.evaluation-section textarea:readonly {
  background: #f9fafb;
  color: #6b7280;
}

.pass-section {
  margin-bottom: 24px;
}

.pass-section label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
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

.radio-option input[type="radio"]:disabled {
  cursor: not-allowed;
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

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: #4b5563;
}

.save-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.save-btn:hover {
  background: #059669;
}

.report-content, .interview-content {
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
}

.report-header, .review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.report-label, .review-label {
  font-weight: 600;
  color: #374151;
}

.report-status, .review-status {
  font-size: 12px;
  color: #6b7280;
}

.report-text, .review-text {
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
}

.interview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.interview-item {
  display: flex;
  align-items: center;
}

.interview-item label {
  font-weight: 500;
  color: #6b7280;
  min-width: 80px;
  margin-right: 8px;
}

.interview-item span {
  color: #374151;
}

.score-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.score-badge.excellent {
  background: #dbeafe;
  color: #1d4ed8;
}

.score-badge.good {
  background: #d1fae5;
  color: #059669;
}

.score-badge.pass {
  background: #fef3c7;
  color: #d97706;
}

.score-badge.fail {
  background: #fee2e2;
  color: #dc2626;
}

.interview-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.detail-item p {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
}

.detail-item span {
  color: #374151;
}

.signature-date {
  color: #6b7280;
  font-size: 12px;
  margin-left: 8px;
}

@media (max-width: 768px) {
  .on-job-training-score-sheet {
    padding: 15px;
  }
  
  .info-grid, .scores-grid, .interview-grid {
    grid-template-columns: 1fr;
  }
  
  .pass-options {
    flex-direction: column;
    gap: 12px;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .report-header, .review-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
