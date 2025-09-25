<template>
  <div class="question-detail-modal" v-if="visible">
    <div class="modal-overlay" @click="closeModal"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ isNew ? '新增题目' : '编辑题目' }}</h3>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="saveQuestion">
          <!-- 基本信息 -->
          <div class="form-section">
            <h4>基本信息</h4>
            <div class="form-row">
              <div class="form-group">
                <label>题目内容 *</label>
                <textarea 
                  v-model="formData.title" 
                  required 
                  placeholder="请输入题目内容"
                  class="form-textarea"
                  rows="3"
                ></textarea>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>题目类型 *</label>
                <select v-model="formData.type" required class="form-select">
                  <option value="">请选择题目类型</option>
                  <option 
                    v-for="type in questionTypeOptions" 
                    :key="type.value" 
                    :value="type.value"
                  >
                    {{ type.label }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>难度 *</label>
                <select v-model="formData.difficulty" required class="form-select">
                  <option value="">请选择难度</option>
                  <option 
                    v-for="diff in difficultyOptions" 
                    :key="diff.value" 
                    :value="diff.value"
                  >
                    {{ diff.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
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
              <div class="form-group">
                <label>分值 *</label>
                <input 
                  v-model.number="formData.points" 
                  type="number" 
                  required 
                  min="1"
                  max="100"
                  class="form-input"
                />
              </div>
            </div>
          </div>

          <!-- 选择题选项 -->
          <div class="form-section" v-if="formData.type === '选择题'">
            <h4>选项设置</h4>
            <div class="options-container">
              <div class="option-item" v-for="(option, index) in formData.options" :key="index">
                <div class="option-header">
                  <label>选项 {{ option.key }}</label>
                  <button type="button" class="remove-option-btn" @click="removeOption(index)">
                    删除
                  </button>
                </div>
                <textarea 
                  v-model="option.text" 
                  placeholder="请输入选项内容"
                  class="form-textarea"
                  rows="2"
                ></textarea>
              </div>
              <button type="button" class="add-option-btn" @click="addOption">
                添加选项
              </button>
            </div>
          </div>

          <!-- 答案设置 -->
          <div class="form-section">
            <h4>答案设置</h4>
            <div class="form-row">
              <div class="form-group">
                <label>正确答案 *</label>
                <div v-if="formData.type === '选择题'" class="answer-select">
                  <select v-model="formData.answer" required class="form-select">
                    <option value="">请选择正确答案</option>
                    <option 
                      v-for="option in formData.options" 
                      :key="option.key" 
                      :value="option.key"
                    >
                      {{ option.key }}. {{ option.text }}
                    </option>
                  </select>
                </div>
                <div v-else-if="formData.type === '判断题'" class="answer-select">
                  <select v-model="formData.answer" required class="form-select">
                    <option value="">请选择正确答案</option>
                    <option value="正确">正确</option>
                    <option value="错误">错误</option>
                  </select>
                </div>
                <textarea 
                  v-else
                  v-model="formData.answer" 
                  required 
                  placeholder="请输入正确答案"
                  class="form-textarea"
                  rows="3"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- 解析设置 -->
          <div class="form-section">
            <h4>解析设置</h4>
            <div class="form-row">
              <div class="form-group">
                <label>题目解析</label>
                <textarea 
                  v-model="formData.analysis" 
                  placeholder="请输入题目解析"
                  class="form-textarea"
                  rows="3"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">
              取消
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
  createOnJobTrainingQuestion, 
  updateOnJobTrainingQuestion, 
  getOnJobTrainingQuestionById,
  getCourseOptions,
  getQuestionTypeOptions,
  getDifficultyOptions 
} from '../onJobTrainingQuestionBank.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  questionId: {
    type: String,
    default: null
  },
  currentUser: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const isNew = computed(() => !props.questionId)

// 表单数据
const formData = ref({
  title: '',
  type: '',
  difficulty: '',
  courseId: '',
  courseName: '',
  points: 5,
  answer: '',
  analysis: '',
  options: [
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' }
  ]
})

// 选项数据
const courseOptions = ref([])
const questionTypeOptions = ref([])
const difficultyOptions = ref([])

// 计算属性
const canSave = computed(() => {
  return formData.value.title.trim() && 
         formData.value.type && 
         formData.value.difficulty &&
         formData.value.courseId &&
         formData.value.points > 0 &&
         formData.value.answer.trim()
})

// 方法
function loadOptions() {
  courseOptions.value = getCourseOptions()
  questionTypeOptions.value = getQuestionTypeOptions()
  difficultyOptions.value = getDifficultyOptions()
}

function loadQuestionData() {
  if (!isNew.value && props.questionId) {
    const question = getOnJobTrainingQuestionById(props.questionId)
    if (question) {
      formData.value = {
        title: question.title,
        type: question.type,
        difficulty: question.difficulty,
        courseId: question.courseId,
        courseName: question.courseName,
        points: question.points,
        answer: question.answer,
        analysis: question.analysis || '',
        options: question.options.length > 0 ? question.options : [
          { key: 'A', text: '' },
          { key: 'B', text: '' },
          { key: 'C', text: '' },
          { key: 'D', text: '' }
        ]
      }
    }
  }
}

function resetForm() {
  formData.value = {
    title: '',
    type: '',
    difficulty: '',
    courseId: '',
    courseName: '',
    points: 5,
    answer: '',
    analysis: '',
    options: [
      { key: 'A', text: '' },
      { key: 'B', text: '' },
      { key: 'C', text: '' },
      { key: 'D', text: '' }
    ]
  }
}

function addOption() {
  const keys = ['A', 'B', 'C', 'D', 'E', 'F']
  const nextKey = keys[formData.value.options.length]
  if (nextKey) {
    formData.value.options.push({ key: nextKey, text: '' })
  }
}

function removeOption(index) {
  if (formData.value.options.length > 2) {
    formData.value.options.splice(index, 1)
  }
}

function saveQuestion() {
  if (!canSave.value) return
  
  // 获取课程名称
  const course = courseOptions.value.find(c => c.id === formData.value.courseId)
  
  const questionData = {
    ...formData.value,
    courseName: course ? course.name : '',
    createdBy: props.currentUser.id
  }
  
  try {
    if (isNew.value) {
      createOnJobTrainingQuestion(questionData)
      alert('题目创建成功！')
    } else {
      const success = updateOnJobTrainingQuestion(props.questionId, questionData)
      if (success) {
        alert('题目更新成功！')
      } else {
        alert('更新失败，请重试！')
        return
      }
    }
    
    emit('close')
    resetForm()
  } catch (error) {
    alert('操作失败，请重试！')
    console.error('Save question error:', error)
  }
}

function closeModal() {
  emit('close')
  resetForm()
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadQuestionData()
  }
})

onMounted(() => {
  loadOptions()
})
</script>

<style scoped>
.question-detail-modal {
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
  max-width: 800px;
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

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.option-header label {
  margin: 0;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
}

.remove-option-btn {
  padding: 4px 8px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.remove-option-btn:hover {
  background: #dc2626;
}

.add-option-btn {
  padding: 10px 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.add-option-btn:hover {
  background: #059669;
}

.answer-select {
  width: 100%;
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
  
  .form-actions {
    flex-direction: column;
  }
}
</style>
