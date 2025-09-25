<template>
  <div class="paper-detail-modal" v-if="visible">
    <div class="modal-overlay" @click="closeModal"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ isNew ? '新增试卷' : '编辑试卷' }}</h3>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="savePaper">
          <!-- 基本信息 -->
          <div class="form-section">
            <h4>基本信息</h4>
            <div class="form-row">
              <div class="form-group">
                <label>试卷名称 *</label>
                <input 
                  v-model="formData.name" 
                  type="text" 
                  required 
                  placeholder="请输入试卷名称"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>适用课程 *</label>
                <select v-model="formData.courseId" required class="form-select">
                  <option value="">请选择适用课程</option>
                  <option 
                    v-for="course in courseOptions" 
                    :key="course.id" 
                    :value="course.id"
                  >
                    {{ course.name }}
                  </option>
                </select>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>试卷描述</label>
                <textarea 
                  v-model="formData.description" 
                  placeholder="请输入试卷描述"
                  class="form-textarea"
                  rows="3"
                ></textarea>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>状态 *</label>
                <select v-model="formData.status" required class="form-select">
                  <option value="启用">启用</option>
                  <option value="停用">停用</option>
                </select>
              </div>
              <div class="form-group">
                <label>考试时长（分钟）*</label>
                <input 
                  v-model.number="formData.timeLimit" 
                  type="number" 
                  required 
                  min="30"
                  max="300"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>及格分数 *</label>
                <input 
                  v-model.number="formData.passingScore" 
                  type="number" 
                  required 
                  min="0"
                  :max="totalPoints"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>总分</label>
                <input 
                  :value="totalPoints" 
                  type="number" 
                  readonly 
                  class="form-input readonly"
                />
              </div>
            </div>
          </div>

          <!-- 题目设置 -->
          <div class="form-section">
            <h4>题目设置</h4>
            <div class="question-settings">
              <div class="question-type" v-for="(type, typeKey) in questionTypes" :key="typeKey">
                <div class="type-header">
                  <h5>{{ type.name }}</h5>
                  <span class="type-total">总计: {{ getTypeTotal(typeKey) }} 题</span>
                </div>
                
                <div class="difficulty-settings">
                  <div class="difficulty-item" v-for="(difficulty, diffKey) in difficulties" :key="diffKey">
                    <label>{{ difficulty.name }}</label>
                    <input 
                      v-model.number="formData.questionSettings[typeKey][diffKey]"
                      type="number"
                      min="0"
                      max="20"
                      class="difficulty-input"
                      @input="updateTotalPoints"
                    />
                    <span class="available-count">
                      (可用: {{ getAvailableQuestions(typeKey, diffKey) }})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">
              取消
            </button>
            <button type="button" class="btn btn-info" @click="previewPaper" :disabled="!canPreview">
              预览
            </button>
            <button type="submit" class="btn btn-primary" :disabled="!canSave">
              {{ isNew ? '创建' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { 
  createOnJobTrainingExamPaper, 
  updateOnJobTrainingExamPaper, 
  getOnJobTrainingExamPaperById,
  getCourseOptions,
  calculateOnJobTrainingTotalPoints 
} from '../onJobTrainingExamPapers.js'
import { getOnJobTrainingQuestionsByUser } from '../onJobTrainingQuestionBank.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  paperId: {
    type: String,
    default: null
  },
  currentUser: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'preview'])

const isNew = computed(() => !props.paperId)

// 表单数据
const formData = ref({
  name: '',
  description: '',
  courseId: '',
  status: '启用',
  timeLimit: 120,
  passingScore: 60,
  questionSettings: {
    choice: { easy: 0, medium: 0, hard: 0 },
    fill: { easy: 0, medium: 0, hard: 0 },
    judge: { easy: 0, medium: 0, hard: 0 },
    essay: { easy: 0, medium: 0, hard: 0 }
  }
})

// 课程选项
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
const totalPoints = computed(() => {
  return calculateOnJobTrainingTotalPoints(formData.value.questionSettings)
})

const canSave = computed(() => {
  return formData.value.name.trim() && 
         formData.value.courseId && 
         formData.value.timeLimit > 0 &&
         formData.value.passingScore >= 0 &&
         totalPoints.value > 0
})

const canPreview = computed(() => {
  return formData.value.name.trim() && 
         formData.value.courseId && 
         totalPoints.value > 0
})

// 方法
function loadCourseOptions() {
  courseOptions.value = getCourseOptions()
}

function loadPaperData() {
  if (!isNew.value && props.paperId) {
    const paper = getOnJobTrainingExamPaperById(props.paperId)
    if (paper) {
      formData.value = {
        name: paper.name,
        description: paper.description || '',
        courseId: paper.courseId,
        status: paper.status,
        timeLimit: paper.timeLimit,
        passingScore: paper.passingScore,
        questionSettings: { ...paper.questionSettings }
      }
    }
  }
}

function resetForm() {
  formData.value = {
    name: '',
    description: '',
    courseId: '',
    status: '启用',
    timeLimit: 120,
    passingScore: 60,
    questionSettings: {
      choice: { easy: 0, medium: 0, hard: 0 },
      fill: { easy: 0, medium: 0, hard: 0 },
      judge: { easy: 0, medium: 0, hard: 0 },
      essay: { easy: 0, medium: 0, hard: 0 }
    }
  }
}

function getTypeTotal(typeKey) {
  const settings = formData.value.questionSettings[typeKey]
  return (settings.easy || 0) + (settings.medium || 0) + (settings.hard || 0)
}

function getAvailableQuestions(typeKey, diffKey) {
  if (!formData.value.courseId) return 0
  
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
  
  const questions = getOnJobTrainingQuestionsByUser(props.currentUser.id)
  return questions.filter(q => 
    q.type === typeMap[typeKey] && 
    q.difficulty === difficultyMap[diffKey] &&
    q.courseId === formData.value.courseId
  ).length
}

function updateTotalPoints() {
  // 触发计算属性更新
}

function savePaper() {
  if (!canSave.value) return
  
  const paperData = {
    ...formData.value,
    createdBy: props.currentUser.id
  }
  
  try {
    if (isNew.value) {
      const id = createOnJobTrainingExamPaper(paperData)
      alert('试卷创建成功！')
    } else {
      const success = updateOnJobTrainingExamPaper(props.paperId, paperData)
      if (success) {
        alert('试卷更新成功！')
      } else {
        alert('更新失败，请重试！')
        return
      }
    }
    
    emit('close')
    resetForm()
  } catch (error) {
    alert('操作失败，请重试！')
    console.error('Save paper error:', error)
  }
}

function previewPaper() {
  if (!canPreview.value) return
  
  // 创建临时试卷对象用于预览
  const previewData = {
    ...formData.value,
    id: isNew.value ? 'preview' : props.paperId,
    totalPoints: totalPoints.value
  }
  
  emit('preview', previewData)
}

function closeModal() {
  emit('close')
  resetForm()
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadPaperData()
  }
})

onMounted(() => {
  loadCourseOptions()
})
</script>

<style scoped>
.paper-detail-modal {
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

.form-section {
  margin-bottom: 32px;
}

.form-section h4 {
  margin: 0 0 16px 0;
  color: #374151;
  font-size: 16px;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 6px;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
}

.form-input,
.form-select,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.readonly {
  background: #f9fafb;
  color: #6b7280;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.question-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.question-type {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

.type-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.type-header h5 {
  margin: 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.type-total {
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.difficulty-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.difficulty-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.difficulty-item label {
  min-width: 60px;
  margin: 0;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
}

.difficulty-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  text-align: center;
}

.available-count {
  color: #6b7280;
  font-size: 12px;
}

.form-actions {
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-info {
  background: #10b981;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #059669;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 20px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .question-settings {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>
