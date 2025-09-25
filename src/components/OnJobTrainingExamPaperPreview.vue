<template>
  <div class="paper-preview-modal" v-if="visible">
    <div class="modal-overlay" @click="closeModal"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>试卷预览 - {{ paperData.name }}</h3>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="modal-body">
        <!-- 试卷基本信息 -->
        <div class="paper-info">
          <div class="info-row">
            <div class="info-item">
              <label>试卷名称：</label>
              <span>{{ paperData.name }}</span>
            </div>
            <div class="info-item">
              <label>适用课程：</label>
              <span>{{ paperData.courseName || getCourseName(paperData.courseId) }}</span>
            </div>
          </div>
          
          <div class="info-row">
            <div class="info-item">
              <label>考试时长：</label>
              <span>{{ paperData.timeLimit }} 分钟</span>
            </div>
            <div class="info-item">
              <label>总分：</label>
              <span>{{ paperData.totalPoints || calculatePaperTotalPoints() }} 分</span>
            </div>
            <div class="info-item">
              <label>及格分数：</label>
              <span>{{ paperData.passingScore }} 分</span>
            </div>
          </div>
          
          <div class="info-row" v-if="paperData.description">
            <div class="info-item full-width">
              <label>试卷描述：</label>
              <span>{{ paperData.description }}</span>
            </div>
          </div>
        </div>

        <!-- 题目统计 -->
        <div class="question-stats">
          <h4>题目统计</h4>
          <div class="stats-grid">
            <div class="stat-item" v-for="(type, typeKey) in questionTypes" :key="typeKey">
              <div class="stat-header">
                <span class="stat-name">{{ type.name }}</span>
                <span class="stat-count">{{ getTypeTotal(typeKey) }} 题</span>
              </div>
              <div class="stat-details">
                <div class="detail-item" v-for="(diff, diffKey) in difficulties" :key="diffKey">
                  <span class="diff-label">{{ diff.name }}：</span>
                  <span class="diff-count">{{ getDifficultyCount(typeKey, diffKey) }} 题</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 题目列表 -->
        <div class="questions-section" v-if="generatedQuestions.length > 0">
          <h4>题目列表</h4>
          <div class="questions-list">
            <div 
              class="question-item" 
              v-for="(question, index) in generatedQuestions" 
              :key="question.id"
            >
              <div class="question-header">
                <span class="question-number">{{ index + 1 }}.</span>
                <span class="question-type">{{ question.type }}</span>
                <span class="question-difficulty">{{ question.difficulty }}</span>
                <span class="question-points">{{ question.points }}分</span>
              </div>
              
              <div class="question-content">
                <div class="question-title">{{ question.title }}</div>
                
                <!-- 选择题选项 -->
                <div class="question-options" v-if="question.type === '选择题' && question.options.length > 0">
                  <div 
                    class="option-item" 
                    v-for="option in question.options" 
                    :key="option.key"
                  >
                    <span class="option-key">{{ option.key }}.</span>
                    <span class="option-text">{{ option.text }}</span>
                  </div>
                </div>
                
                <!-- 填空题 -->
                <div class="fill-blank" v-if="question.type === '填空题'">
                  <div class="blank-placeholder">________________</div>
                </div>
                
                <!-- 判断题 -->
                <div class="judge-options" v-if="question.type === '判断题'">
                  <div class="option-item">
                    <span class="option-key">A.</span>
                    <span class="option-text">正确</span>
                  </div>
                  <div class="option-item">
                    <span class="option-key">B.</span>
                    <span class="option-text">错误</span>
                  </div>
                </div>
                
                <!-- 简答题 -->
                <div class="essay-area" v-if="question.type === '简答题'">
                  <div class="essay-placeholder">
                    <div class="essay-line"></div>
                    <div class="essay-line"></div>
                    <div class="essay-line"></div>
                  </div>
                </div>
              </div>
              
              <!-- 答案和解析（仅预览时显示） -->
              <div class="question-answer" v-if="showAnswers">
                <div class="answer-section">
                  <label>答案：</label>
                  <span class="answer-text">{{ question.answer }}</span>
                </div>
                <div class="analysis-section" v-if="question.analysis">
                  <label>解析：</label>
                  <span class="analysis-text">{{ question.analysis }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 无题目提示 -->
        <div class="no-questions" v-else>
          <div class="no-questions-content">
            <div class="no-questions-icon">📝</div>
            <h4>暂无题目</h4>
            <p>请先设置题目数量和难度，或确保题库中有足够的题目。</p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="preview-actions">
          <button 
            class="btn btn-secondary" 
            @click="toggleAnswers"
          >
            {{ showAnswers ? '隐藏答案' : '显示答案' }}
          </button>
          <button class="btn btn-primary" @click="closeModal">
            关闭预览
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { 
  generateOnJobTrainingExamQuestions, 
  calculateOnJobTrainingTotalPoints,
  getCourseOptions 
} from '../onJobTrainingExamPapers.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  paperData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close'])

const showAnswers = ref(false)
const generatedQuestions = ref([])
const courseOptions = ref([])

// 题目类型和难度配置
const questionTypes = {
  choice: { name: '选择题', key: 'choice' },
  fill: { name: '填空题', key: 'fill' },
  judge: { name: '判断题', key: 'judge' },
  essay: { name: '简答题', key: 'essay' }
}

const difficulties = {
  easy: { name: '初级', key: 'easy' },
  medium: { name: '中级', key: 'medium' },
  hard: { name: '高级', key: 'hard' }
}

// 计算属性
function getCourseName(courseId) {
  const course = courseOptions.value.find(c => c.id === courseId)
  return course ? course.name : ''
}

function getTypeTotal(typeKey) {
  if (!props.paperData.questionSettings) return 0
  const settings = props.paperData.questionSettings[typeKey]
  return (settings.easy || 0) + (settings.medium || 0) + (settings.hard || 0)
}

function getDifficultyCount(typeKey, diffKey) {
  if (!props.paperData.questionSettings) return 0
  return props.paperData.questionSettings[typeKey][diffKey] || 0
}

function calculatePaperTotalPoints() {
  if (!props.paperData.questionSettings) return 0
  return calculateOnJobTrainingTotalPoints(props.paperData.questionSettings)
}

// 方法
function loadCourseOptions() {
  courseOptions.value = getCourseOptions()
}

function generateQuestions() {
  if (props.paperData.id && props.paperData.id !== 'preview') {
    // 如果是已保存的试卷，生成实际题目
    generatedQuestions.value = generateOnJobTrainingExamQuestions(props.paperData.id)
  } else {
    // 如果是预览模式，生成模拟题目
    generatedQuestions.value = generateMockQuestions()
  }
}

function generateMockQuestions() {
  const mockQuestions = []
  let questionIndex = 1
  
  if (!props.paperData.questionSettings) return mockQuestions
  
  Object.keys(props.paperData.questionSettings).forEach(typeKey => {
    const typeMap = {
      'choice': '选择题',
      'fill': '填空题',
      'judge': '判断题',
      'essay': '简答题'
    }
    
    const difficultyMap = {
      'easy': '初级',
      'medium': '中级',
      'hard': '高级'
    }
    
    const settings = props.paperData.questionSettings[typeKey]
    const questionType = typeMap[typeKey]
    
    Object.keys(settings).forEach(diffKey => {
      const count = settings[diffKey]
      const questionDifficulty = difficultyMap[diffKey]
      
      for (let i = 0; i < count; i++) {
        mockQuestions.push({
          id: `mock_${questionIndex}`,
          title: `${questionType}示例题目 ${questionIndex}`,
          type: questionType,
          difficulty: questionDifficulty,
          points: 5,
          answer: questionType === '选择题' ? 'A' : questionType === '判断题' ? '正确' : '示例答案',
          analysis: '这是一道示例题目的解析',
          options: questionType === '选择题' ? [
            { key: 'A', text: '选项A' },
            { key: 'B', text: '选项B' },
            { key: 'C', text: '选项C' },
            { key: 'D', text: '选项D' }
          ] : []
        })
        questionIndex++
      }
    })
  })
  
  return mockQuestions
}

function toggleAnswers() {
  showAnswers.value = !showAnswers.value
}

function closeModal() {
  emit('close')
  showAnswers.value = false
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    generateQuestions()
  }
})

onMounted(() => {
  loadCourseOptions()
})
</script>

<style scoped>
.paper-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 20px;
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
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.modal-body {
  padding: 24px;
  max-height: calc(90vh - 80px);
  overflow-y: auto;
}

.paper-info {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-item.full-width {
  flex: 1;
}

.info-item label {
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  min-width: 80px;
}

.info-item span {
  color: #1f2937;
  font-size: 14px;
}

.question-stats {
  margin-bottom: 24px;
}

.question-stats h4 {
  margin: 0 0 16px 0;
  color: #374151;
  font-size: 16px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: white;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.stat-name {
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
}

.stat-count {
  color: #3b82f6;
  font-size: 14px;
  font-weight: 600;
}

.stat-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.diff-label {
  color: #6b7280;
  font-size: 12px;
}

.diff-count {
  color: #374151;
  font-size: 12px;
  font-weight: 500;
}

.questions-section h4 {
  margin: 0 0 16px 0;
  color: #374151;
  font-size: 16px;
  font-weight: 600;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  background: white;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.question-number {
  color: #3b82f6;
  font-size: 16px;
  font-weight: 600;
}

.question-type,
.question-difficulty {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.question-type {
  background: #dbeafe;
  color: #1e40af;
}

.question-difficulty {
  background: #f3f4f6;
  color: #374151;
}

.question-points {
  color: #059669;
  font-size: 14px;
  font-weight: 600;
  margin-left: auto;
}

.question-content {
  margin-bottom: 16px;
}

.question-title {
  color: #1f2937;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
}

.question-options,
.judge-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.option-key {
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  min-width: 20px;
}

.option-text {
  color: #374151;
  font-size: 14px;
  line-height: 1.4;
}

.fill-blank {
  margin: 12px 0;
}

.blank-placeholder {
  border-bottom: 2px solid #6b7280;
  min-width: 200px;
  height: 20px;
  margin: 8px 0;
}

.essay-area {
  margin: 12px 0;
}

.essay-placeholder {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 12px;
  background: #f9fafb;
}

.essay-line {
  height: 20px;
  border-bottom: 1px solid #d1d5db;
  margin-bottom: 8px;
}

.essay-line:last-child {
  margin-bottom: 0;
}

.question-answer {
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 6px;
  padding: 12px;
}

.answer-section,
.analysis-section {
  margin-bottom: 8px;
}

.answer-section:last-child,
.analysis-section:last-child {
  margin-bottom: 0;
}

.answer-section label,
.analysis-section label {
  color: #0c4a6e;
  font-size: 12px;
  font-weight: 600;
  margin-right: 8px;
}

.answer-text,
.analysis-text {
  color: #0c4a6e;
  font-size: 14px;
}

.no-questions {
  text-align: center;
  padding: 60px 20px;
}

.no-questions-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.no-questions-icon {
  font-size: 48px;
}

.no-questions h4 {
  margin: 0;
  color: #6b7280;
  font-size: 18px;
}

.no-questions p {
  margin: 0;
  color: #9ca3af;
  font-size: 14px;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 20px;
  }
  
  .info-row {
    flex-direction: column;
    gap: 8px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-actions {
    flex-direction: column;
  }
}
</style>
