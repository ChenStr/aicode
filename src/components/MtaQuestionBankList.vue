<template>
  <div class="mta-question-bank-list">
    <div class="page-header">
      <h2>MTA考核笔试题库</h2>
      <button class="add-btn" @click="openQuestionDetail({ isNew: true })">
        <span class="add-icon">+</span>
        新增题目
      </button>
    </div>

    <div class="question-list">
      <div class="list-header">
        <h3>题目列表</h3>
        <div class="filter-controls">
          <select v-model="typeFilter" @change="filterQuestions">
            <option value="">全部类型</option>
            <option value="选择题">选择题</option>
            <option value="填空题">填空题</option>
            <option value="判断题">判断题</option>
            <option value="简答题">简答题</option>
          </select>
          <select v-model="difficultyFilter" @change="filterQuestions">
            <option value="">全部难度</option>
            <option value="初级">初级</option>
            <option value="中级">中级</option>
            <option value="高级">高级</option>
          </select>
          <select v-model="mtaAuthFilter" @change="filterQuestions">
            <option value="">全部MTA授权</option>
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

      <div class="question-table">
        <table>
          <thead>
            <tr>
              <th>题目标题</th>
              <th>题目类型</th>
              <th>难度</th>
              <th>关联MTA授权</th>
              <th>分值</th>
              <th>创建人</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="question in filteredQuestions" :key="question.id">
              <td class="title-cell">
                <div class="question-title">{{ question.title }}</div>
                <div class="question-meta">
                  <span class="question-id">ID: {{ question.id }}</span>
                </div>
              </td>
              <td>
                <span class="type-badge" :class="getTypeClass(question.type)">
                  {{ question.type }}
                </span>
              </td>
              <td>
                <span class="difficulty-badge" :class="getDifficultyClass(question.difficulty)">
                  {{ question.difficulty }}
                </span>
              </td>
              <td>{{ question.mtaAuthName }}</td>
              <td>{{ question.points }}分</td>
              <td>{{ question.createdByName }}</td>
              <td>{{ question.createdAt }}</td>
              <td>
                <div class="action-buttons">
                  <button class="edit-btn" @click="openQuestionDetail({ question, isNew: false })">
                    编辑
                  </button>
                  <button class="delete-btn" @click="deleteQuestion(question.id)">
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredQuestions.length === 0" class="empty-state">
        <p>暂无题目数据</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getQuestionsByUser, deleteQuestion as deleteQuestionAction, getMtaAuthOptions } from '../mtaQuestionBank.js'

const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-question-detail'])

const questions = ref([])
const typeFilter = ref('')
const difficultyFilter = ref('')
const mtaAuthFilter = ref('')
const mtaAuthOptions = ref([])

// 计算属性：筛选后的题目列表
const filteredQuestions = computed(() => {
  let filtered = questions.value

  if (typeFilter.value) {
    filtered = filtered.filter(q => q.type === typeFilter.value)
  }

  if (difficultyFilter.value) {
    filtered = filtered.filter(q => q.difficulty === difficultyFilter.value)
  }

  if (mtaAuthFilter.value) {
    filtered = filtered.filter(q => q.mtaAuthId === mtaAuthFilter.value)
  }

  return filtered
})

// 获取类型样式类
function getTypeClass(type) {
  const typeMap = {
    '选择题': 'choice',
    '填空题': 'fill',
    '判断题': 'judge',
    '简答题': 'essay'
  }
  return typeMap[type] || 'default'
}

// 获取难度样式类
function getDifficultyClass(difficulty) {
  const difficultyMap = {
    '初级': 'easy',
    '中级': 'medium',
    '高级': 'hard'
  }
  return difficultyMap[difficulty] || 'default'
}

// 加载题目列表
function loadQuestions() {
  questions.value = getQuestionsByUser(props.currentUser.id)
}

// 加载MTA授权选项
function loadMtaAuthOptions() {
  mtaAuthOptions.value = getMtaAuthOptions()
}

// 筛选题目
function filterQuestions() {
  // 筛选逻辑已在计算属性中处理
}

// 打开题目详情
function openQuestionDetail(data) {
  emit('open-question-detail', data)
}

// 删除题目
function deleteQuestion(id) {
  if (confirm('确定要删除这道题目吗？删除后无法恢复。')) {
    if (deleteQuestionAction(id)) {
      loadQuestions()
      alert('题目删除成功！')
    } else {
      alert('删除失败，请重试！')
    }
  }
}

onMounted(() => {
  loadQuestions()
  loadMtaAuthOptions()
})
</script>

<style scoped>
.mta-question-bank-list {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.page-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 28px;
  font-weight: 600;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.add-icon {
  font-size: 20px;
  font-weight: bold;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h3 {
  margin: 0;
  color: #374151;
  font-size: 20px;
  font-weight: 600;
}

.filter-controls {
  display: flex;
  gap: 12px;
}

.filter-controls select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.question-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.question-table table {
  width: 100%;
  border-collapse: collapse;
}

.question-table th {
  background: #f9fafb;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.question-table td {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  color: #6b7280;
}

.question-table tr:hover {
  background: #f9fafb;
}

.title-cell {
  max-width: 300px;
}

.question-title {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
}

.question-meta {
  font-size: 12px;
  color: #9ca3af;
}

.question-id {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.type-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.type-badge.choice {
  background: #dbeafe;
  color: #1e40af;
}

.type-badge.fill {
  background: #dcfce7;
  color: #166534;
}

.type-badge.judge {
  background: #fef3c7;
  color: #92400e;
}

.type-badge.essay {
  background: #ede9fe;
  color: #6b21a8;
}

.difficulty-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.difficulty-badge.easy {
  background: #dcfce7;
  color: #166534;
}

.difficulty-badge.medium {
  background: #fef3c7;
  color: #92400e;
}

.difficulty-badge.hard {
  background: #fee2e2;
  color: #991b1b;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.edit-btn {
  padding: 6px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.edit-btn:hover {
  background: #2563eb;
}

.delete-btn {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.delete-btn:hover {
  background: #dc2626;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  font-size: 16px;
}
</style>
