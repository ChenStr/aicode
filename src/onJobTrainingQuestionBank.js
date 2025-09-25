import { reactive } from 'vue'
import { USERS } from './user.js'
import { coursesStore } from './courses.js'

const STORAGE_KEY = 'onjob_training_question_bank_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

// 默认测试数据
const defaultQuestions = [
  {
    id: 'ojq_001',
    title: '电气安全基础理论知识',
    type: '选择题',
    difficulty: '初级',
    courseId: 'c_001',
    courseName: '电气安全基础',
    points: 5,
    analysis: '本题考查电气安全基础理论知识。',
    answer: 'A',
    options: [
      { key: 'A', text: '电气安全是电力系统运行的基础保障' },
      { key: 'B', text: '电气安全可以忽略不计' },
      { key: 'C', text: '电气安全只涉及高压设备' },
      { key: 'D', text: '电气安全与个人防护无关' }
    ],
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-15 09:00',
    updatedAt: '2024-01-15 09:00'
  },
  {
    id: 'ojq_002',
    title: '配电系统维护流程',
    type: '填空题',
    difficulty: '中级',
    courseId: 'c_002',
    courseName: '配电系统入门',
    points: 8,
    analysis: '本题考查配电系统维护的标准流程。',
    answer: '断电、验电、挂牌、维护、测试、送电',
    options: [],
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-16 10:00',
    updatedAt: '2024-01-16 10:00'
  },
  {
    id: 'ojq_003',
    title: '高压设备操作安全要求',
    type: '判断题',
    difficulty: '初级',
    courseId: 'c_004',
    courseName: '高压设备在岗实操培训',
    points: 3,
    analysis: '本题考查高压设备操作的安全要求。',
    answer: '正确',
    options: [],
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-17 14:00',
    updatedAt: '2024-01-17 14:00'
  },
  {
    id: 'ojq_004',
    title: '配电系统故障分析与处理',
    type: '简答题',
    difficulty: '高级',
    courseId: 'c_005',
    courseName: '配电系统维护在岗培训',
    points: 15,
    analysis: '本题考查配电系统故障分析的综合能力。',
    answer: '1. 故障现象分析：观察设备状态、测量数据、检查报警信息；2. 故障原因判断：分析可能原因，排除干扰因素；3. 处理方案制定：根据故障类型制定安全有效的处理方案；4. 实施处理：按规程操作，确保安全；5. 验证结果：测试设备功能，确认故障消除。',
    options: [],
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-18 16:00',
    updatedAt: '2024-01-18 16:00'
  }
]

export const onJobTrainingQuestionBankStore = reactive({
  questions: persisted?.questions || defaultQuestions
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      questions: onJobTrainingQuestionBankStore.questions
    }))
  } catch {}
}

// 获取用户可查看的题目列表
export function getOnJobTrainingQuestionsByUser(userId) {
  const user = USERS.find(u => u.id === userId)
  if (!user) return []
  
  // 普通用户无法访问
  if (user.role === 'employee') {
    return []
  }
  
  // 培训工程师、科长、部门经理可以查看本部门所有题目
  if (['training_admin', 'section_chief', 'dept_manager'].includes(user.role)) {
    return onJobTrainingQuestionBankStore.questions.filter(q => q.department === user.department)
  }
  
  return []
}

// 获取题目详情
export function getOnJobTrainingQuestionById(id) {
  return onJobTrainingQuestionBankStore.questions.find(q => q.id === id) || null
}

// 创建新题目
export function createOnJobTrainingQuestion(questionData) {
  const user = USERS.find(u => u.id === questionData.createdBy)
  if (!user) return null
  
  const newQuestion = {
    id: `ojq_${Date.now()}`,
    title: questionData.title,
    type: questionData.type,
    difficulty: questionData.difficulty,
    courseId: questionData.courseId,
    courseName: questionData.courseName,
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
  
  onJobTrainingQuestionBankStore.questions.unshift(newQuestion)
  persist()
  return newQuestion
}

// 更新题目
export function updateOnJobTrainingQuestion(id, questionData) {
  const index = onJobTrainingQuestionBankStore.questions.findIndex(q => q.id === id)
  if (index === -1) return false
  
  onJobTrainingQuestionBankStore.questions[index] = {
    ...onJobTrainingQuestionBankStore.questions[index],
    ...questionData,
    updatedAt: new Date().toISOString().slice(0, 16)
  }
  
  persist()
  return true
}

// 删除题目
export function deleteOnJobTrainingQuestion(id) {
  const index = onJobTrainingQuestionBankStore.questions.findIndex(q => q.id === id)
  if (index === -1) return false
  
  onJobTrainingQuestionBankStore.questions.splice(index, 1)
  persist()
  return true
}

// 获取课程选项（用于下拉选择）
export function getCourseOptions() {
  return coursesStore.courses.map(course => ({
    id: course.id,
    name: course.name
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
