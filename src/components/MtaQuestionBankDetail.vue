<template>
  <div class="mta-question-bank-detail">
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        ← 返回
      </button>
      <h2>{{ isNew ? '新增题目' : '编辑题目' }}</h2>
    </div>

    <div class="form-container">
      <form @submit.prevent="saveQuestion">
        <!-- 基本信息 -->
        <div class="form-section">
          <h3>基本信息</h3>
          <div class="form-row">
            <div class="form-item">
              <label>题目标题 <span class="required">*</span></label>
              <input 
                v-model="questionForm.title" 
                type="text" 
                placeholder="请输入题目标题"
                required
              />
            </div>
            <div class="form-item">
              <label>题目类型 <span class="required">*</span></label>
              <select v-model="questionForm.type" required>
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
          </div>
          
          <div class="form-row">
            <div class="form-item">
              <label>题目难度 <span class="required">*</span></label>
              <select v-model="questionForm.difficulty" required>
                <option value="">请选择难度</option>
                <option 
                  v-for="difficulty in difficultyOptions" 
                  :key="difficulty.value" 
                  :value="difficulty.value"
                >
                  {{ difficulty.label }}
                </option>
              </select>
            </div>
            <div class="form-item">
              <label>关联MTA授权 <span class="required">*</span></label>
              <select v-model="questionForm.mtaAuthId" required>
                <option value="">请选择MTA授权</option>
                <option 
                  v-for="auth in mtaAuthOptions" 
                  :key="auth.id" 
                  :value="auth.id"
                >
                  {{ auth.name }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item">
              <label>题目分值 <span class="required">*</span></label>
              <input 
                v-model.number="questionForm.points" 
                type="number" 
                min="1" 
                max="100"
                placeholder="请输入分值"
                required
              />
            </div>
          </div>
        </div>

        <!-- 题目内容 -->
        <div class="form-section">
          <h3>题目内容</h3>
          <div class="form-item">
            <label>题目解析</label>
            <textarea 
              v-model="questionForm.analysis" 
              placeholder="请输入题目解析..."
              rows="4"
            ></textarea>
          </div>
          
          <div class="form-item">
            <label>参考答案 <span class="required">*</span></label>
            <textarea 
              v-model="questionForm.answer" 
              placeholder="请输入参考答案..."
              rows="3"
              required
            ></textarea>
          </div>
        </div>

        <!-- 选择题选项 -->
        <div v-if="questionForm.type === '选择题'" class="form-section">
          <h3>选择题选项</h3>
          <div class="options-container">
            <div 
              v-for="(option, index) in questionForm.options" 
              :key="index"
              class="option-item"
            >
              <div class="option-header">
                <span class="option-label">选项 {{ String.fromCharCode(65 + index) }}</span>
                <button 
                  v-if="questionForm.options.length > 2"
                  type="button" 
                  class="remove-option-btn" 
                  @click="removeOption(index)"
                >
                  删除
                </button>
              </div>
              <input 
                v-model="option.text" 
                type="text" 
                :placeholder="`请输入选项${String.fromCharCode(65 + index)}的内容`"
                class="option-input"
              />
            </div>
            <button 
              v-if="questionForm.options.length < 6"
              type="button" 
              class="add-option-btn" 
              @click="addOption"
            >
              + 添加选项
            </button>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <button type="button" class="cancel-btn" @click="goBack">取消</button>
          <button type="submit" class="save-btn">保存</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { 
  getQuestionById, 
  createQuestion, 
  updateQuestion,
  getMtaAuthOptions,
  getQuestionTypeOptions,
  getDifficultyOptions
} from '../mtaQuestionBank.js'

const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  },
  questionData: {
    type: Object,
    default: null
  },
  isNew: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['back'])

const mtaAuthOptions = ref([])
const questionTypeOptions = ref([])
const difficultyOptions = ref([])

const questionForm = ref({
  title: '',
  type: '',
  difficulty: '',
  mtaAuthId: '',
  mtaAuthName: '',
  points: 1,
  analysis: '',
  answer: '',
  options: [
    { key: 'A', text: '' },
    { key: 'B', text: '' }
  ]
})

// 加载选项数据
function loadOptions() {
  mtaAuthOptions.value = getMtaAuthOptions()
  questionTypeOptions.value = getQuestionTypeOptions()
  difficultyOptions.value = getDifficultyOptions()
}

// 添加选项
function addOption() {
  if (questionForm.value.options.length < 6) {
    const nextKey = String.fromCharCode(65 + questionForm.value.options.length)
    questionForm.value.options.push({ key: nextKey, text: '' })
  }
}

// 删除选项
function removeOption(index) {
  if (questionForm.value.options.length > 2) {
    questionForm.value.options.splice(index, 1)
    // 重新分配选项键
    questionForm.value.options.forEach((option, idx) => {
      option.key = String.fromCharCode(65 + idx)
    })
  }
}

// 更新MTA授权名称
function updateMtaAuthName() {
  const selectedAuth = mtaAuthOptions.value.find(auth => auth.id === questionForm.value.mtaAuthId)
  if (selectedAuth) {
    questionForm.value.mtaAuthName = selectedAuth.name
  }
}

// 保存题目
function saveQuestion() {
  if (!questionForm.value.title.trim()) {
    alert('请输入题目标题')
    return
  }
  
  if (!questionForm.value.type) {
    alert('请选择题目类型')
    return
  }
  
  if (!questionForm.value.difficulty) {
    alert('请选择题目难度')
    return
  }
  
  if (!questionForm.value.mtaAuthId) {
    alert('请选择关联MTA授权')
    return
  }
  
  if (!questionForm.value.answer.trim()) {
    alert('请输入参考答案')
    return
  }
  
  // 检查选择题选项
  if (questionForm.value.type === '选择题') {
    const hasEmptyOption = questionForm.value.options.some(option => !option.text.trim())
    if (hasEmptyOption) {
      alert('请填写所有选项内容')
      return
    }
  }
  
  const questionData = {
    ...questionForm.value,
    createdBy: props.currentUser.id
  }
  
  try {
    if (props.isNew) {
      createQuestion(questionData)
      alert('题目创建成功！')
    } else {
      updateQuestion(props.questionData.id, questionData)
      alert('题目更新成功！')
    }
    goBack()
  } catch (error) {
    alert('保存失败，请重试！')
  }
}

// 返回
function goBack() {
  emit('back')
}

onMounted(() => {
  loadOptions()
  
  // 如果是编辑模式，加载现有数据
  if (!props.isNew && props.questionData) {
    questionForm.value = { ...props.questionData }
  }
  
  // 监听MTA授权选择变化
  const unwatch = ref(questionForm.value.mtaAuthId)
  if (unwatch.value) {
    updateMtaAuthName()
  }
})
</script>

<style scoped>
.mta-question-bank-detail {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.back-btn {
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #e5e7eb;
}

.page-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 28px;
  font-weight: 600;
}

.form-container {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 40px;
}

.form-section h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 20px;
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.required {
  color: #dc2626;
  font-weight: 700;
}

.form-item input,
.form-item select,
.form-item textarea {
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-item input:focus,
.form-item select:focus,
.form-item textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
  margin-bottom: 12px;
}

.option-label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
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

.option-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.add-option-btn {
  padding: 12px 20px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;
}

.add-option-btn:hover {
  background: #e5e7eb;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 30px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn {
  padding: 12px 24px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.save-btn {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn:hover {
  background: #2563eb;
}
</style>
