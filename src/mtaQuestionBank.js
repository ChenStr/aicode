import { reactive } from 'vue'
import { USERS } from './user.js'
import { mtaAuthsStore } from './mtaAuths.js'

const STORAGE_KEY = 'mta_question_bank_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

// 默认测试数据
const defaultQuestions = [
  {
    id: 'q_001',
    title: '高压绝缘检测基础知识',
    type: '选择题',
    difficulty: '初级',
    mtaAuthId: 'm_001',
    mtaAuthName: '高压绝缘检测',
    points: 5,
    analysis: '本题考查高压绝缘检测的基本概念和操作规范。',
    answer: 'A',
    options: [
      { key: 'A', text: '绝缘电阻测试是检测设备绝缘性能的重要手段' },
      { key: 'B', text: '绝缘电阻测试不需要断电进行' },
      { key: 'C', text: '绝缘电阻值越高说明设备绝缘性能越差' },
      { key: 'D', text: '绝缘电阻测试可以带电进行' }
    ],
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-15 09:00',
    updatedAt: '2024-01-15 09:00'
  },
  {
    id: 'q_002',
    title: '配电柜检修流程',
    type: '填空题',
    difficulty: '中级',
    mtaAuthId: 'm_002',
    mtaAuthName: '配电柜检修',
    points: 8,
    analysis: '本题考查配电柜检修的标准流程和注意事项。',
    answer: '断电、验电、挂牌、检修、测试、送电',
    options: [],
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-16 10:00',
    updatedAt: '2024-01-16 10:00'
  },
  {
    id: 'q_003',
    title: '继电保护测试安全要求',
    type: '判断题',
    difficulty: '初级',
    mtaAuthId: 'm_003',
    mtaAuthName: '继电保护测试',
    points: 3,
    analysis: '本题考查继电保护测试的安全要求。',
    answer: '正确',
    options: [],
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-17 14:00',
    updatedAt: '2024-01-17 14:00'
  },
  {
    id: 'q_004',
    title: '高压绝缘检测故障分析',
    type: '简答题',
    difficulty: '高级',
    mtaAuthId: 'm_001',
    mtaAuthName: '高压绝缘检测',
    points: 15,
    analysis: '本题考查高压绝缘检测中常见故障的分析和处理方法。',
    answer: '1. 绝缘电阻值偏低：检查设备受潮、绝缘老化、接线松动等问题；2. 测试数据不稳定：检查测试环境、设备接地、测试方法等；3. 异常放电：分析放电类型、位置、原因，采取相应处理措施。',
    options: [],
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-18 16:00',
    updatedAt: '2024-01-18 16:00'
  }
]

export const mtaQuestionBankStore = reactive({
  questions: persisted?.questions || defaultQuestions
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      questions: mtaQuestionBankStore.questions
    }))
  } catch {}
}

// 获取用户可查看的题目列表
export function getQuestionsByUser(userId) {
  const user = USERS.find(u => u.id === userId)
  if (!user) return []
  
  // 普通用户无法访问
  if (user.role === 'employee') {
    return []
  }
  
  // 培训工程师、科长、部门经理可以查看本部门所有题目
  if (['training_admin', 'section_chief', 'dept_manager'].includes(user.role)) {
    return mtaQuestionBankStore.questions.filter(q => q.department === user.department)
  }
  
  return []
}

// 获取题目详情
export function getQuestionById(id) {
  return mtaQuestionBankStore.questions.find(q => q.id === id) || null
}

// 创建新题目
export function createQuestion(questionData) {
  const user = USERS.find(u => u.id === questionData.createdBy)
  if (!user) return null
  
  const newQuestion = {
    id: `q_${Date.now()}`,
    title: questionData.title,
    type: questionData.type,
    difficulty: questionData.difficulty,
    mtaAuthId: questionData.mtaAuthId,
    mtaAuthName: questionData.mtaAuthName,
    points: questionData.points,
    analysis: questionData.analysis,
    answer: questionData.answer,
    options: questionData.options || [],
    department: user.department,
    createdBy: questionData.createdBy,
    createdByName: user.name,
    createdAt: new Date().toISOString().slice(0, 16),
    updatedAt: new Date().toISOString().slice(0, 16)
  }
  
  mtaQuestionBankStore.questions.unshift(newQuestion)
  persist()
  return newQuestion
}

// 更新题目
export function updateQuestion(id, questionData) {
  const index = mtaQuestionBankStore.questions.findIndex(q => q.id === id)
  if (index === -1) return false
  
  mtaQuestionBankStore.questions[index] = {
    ...mtaQuestionBankStore.questions[index],
    ...questionData,
    updatedAt: new Date().toISOString().slice(0, 16)
  }
  
  persist()
  return true
}

// 删除题目
export function deleteQuestion(id) {
  const index = mtaQuestionBankStore.questions.findIndex(q => q.id === id)
  if (index === -1) return false
  
  mtaQuestionBankStore.questions.splice(index, 1)
  persist()
  return true
}

// 获取MTA授权列表（用于下拉选择）
export function getMtaAuthOptions() {
  return mtaAuthsStore.items.map(auth => ({
    id: auth.id,
    name: auth.techName
  }))
}

// 获取题目类型选项
export function getQuestionTypeOptions() {
  return [
    { value: '选择题', label: '选择题' },
    { value: '填空题', label: '填空题' },
    { value: '判断题', label: '判断题' },
    { value: '简答题', label: '简答题' }
  ]
}

// 获取难度选项
export function getDifficultyOptions() {
  return [
    { value: '初级', label: '初级' },
    { value: '中级', label: '中级' },
    { value: '高级', label: '高级' }
  ]
}
