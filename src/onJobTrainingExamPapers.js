import { reactive } from 'vue'
import { USERS } from './user.js'
import { coursesStore } from './courses.js'
import { getOnJobTrainingQuestionsByUser } from './onJobTrainingQuestionBank.js'

const STORAGE_KEY = 'onjob_training_exam_papers_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

// 默认测试数据
const defaultExamPapers = [
  {
    id: 'ojep_001',
    name: '电气安全基础考试',
    description: '针对电气安全基础课程的专项笔试试卷',
    courseId: 'c_001',
    courseName: '电气安全基础',
    status: '启用', // 启用、停用
    questionSettings: {
      choice: { easy: 3, medium: 2, hard: 1 }, // 选择题：初级3道，中级2道，高级1道
      fill: { easy: 1, medium: 1, hard: 0 },   // 填空题：初级1道，中级1道，高级0道
      judge: { easy: 2, medium: 1, hard: 0 }, // 判断题：初级2道，中级1道，高级0道
      essay: { easy: 0, medium: 1, hard: 0 }  // 简答题：初级0道，中级1道，高级0道
    },
    totalPoints: 100,
    timeLimit: 90, // 考试时间限制（分钟）
    passingScore: 60, // 及格分数
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-20 09:00',
    updatedAt: '2024-01-20 09:00'
  },
  {
    id: 'ojep_002',
    name: '配电系统维护考试',
    description: '配电系统维护在岗培训的基础知识考试',
    courseId: 'c_005',
    courseName: '配电系统维护在岗培训',
    status: '启用',
    questionSettings: {
      choice: { easy: 2, medium: 3, hard: 1 },
      fill: { easy: 1, medium: 2, hard: 1 },
      judge: { easy: 2, medium: 1, hard: 0 },
      essay: { easy: 0, medium: 1, hard: 1 }
    },
    totalPoints: 120,
    timeLimit: 120,
    passingScore: 70,
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-21 10:00',
    updatedAt: '2024-01-21 10:00'
  },
  {
    id: 'ojep_003',
    name: '高压设备操作综合考试',
    description: '高压设备在岗实操培训的综合能力考试',
    courseId: 'c_004',
    courseName: '高压设备在岗实操培训',
    status: '停用',
    questionSettings: {
      choice: { easy: 2, medium: 4, hard: 2 },
      fill: { easy: 1, medium: 2, hard: 2 },
      judge: { easy: 1, medium: 2, hard: 1 },
      essay: { easy: 0, medium: 1, hard: 2 }
    },
    totalPoints: 150,
    timeLimit: 150,
    passingScore: 90,
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-22 14:00',
    updatedAt: '2024-01-22 14:00'
  }
]

export const onJobTrainingExamPapersStore = reactive({
  examPapers: persisted?.examPapers || defaultExamPapers
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      examPapers: onJobTrainingExamPapersStore.examPapers
    }))
  } catch {}
}

// 获取用户可访问的试卷列表
export function getOnJobTrainingExamPapersByUser(userId) {
  const user = USERS.find(u => u.id === userId)
  if (!user) return []
  
  // 根据用户角色和部门返回试卷
  if (user.role === 'training_admin' || user.role === 'section_chief' || user.role === 'dept_manager') {
    return onJobTrainingExamPapersStore.examPapers.filter(paper => paper.department === user.department)
  }
  
  return []
}

// 根据ID获取试卷
export function getOnJobTrainingExamPaperById(id) {
  return onJobTrainingExamPapersStore.examPapers.find(paper => paper.id === id) || null
}

// 创建新试卷
export function createOnJobTrainingExamPaper(paperData) {
  const id = `ojep_${Math.random().toString(36).slice(2, 8)}`
  const user = USERS.find(u => u.id === paperData.createdBy)
  
  // 获取课程名称
  const course = coursesStore.courses.find(c => c.id === paperData.courseId)
  
  const newPaper = {
    id,
    ...paperData,
    courseName: course ? course.name : '',
    department: user ? user.department : '',
    createdByName: user ? user.name : '',
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
  }
  
  onJobTrainingExamPapersStore.examPapers.push(newPaper)
  persist()
  return id
}

// 更新试卷
export function updateOnJobTrainingExamPaper(id, paperData) {
  const index = onJobTrainingExamPapersStore.examPapers.findIndex(paper => paper.id === id)
  if (index === -1) return false
  
  // 获取课程名称
  const course = coursesStore.courses.find(c => c.id === paperData.courseId)
  
  onJobTrainingExamPapersStore.examPapers[index] = {
    ...onJobTrainingExamPapersStore.examPapers[index],
    ...paperData,
    courseName: course ? course.name : onJobTrainingExamPapersStore.examPapers[index].courseName,
    updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
  }
  
  persist()
  return true
}

// 删除试卷
export function deleteOnJobTrainingExamPaper(id) {
  const index = onJobTrainingExamPapersStore.examPapers.findIndex(paper => paper.id === id)
  if (index === -1) return false
  
  onJobTrainingExamPapersStore.examPapers.splice(index, 1)
  persist()
  return true
}

// 获取课程选项
export function getCourseOptions() {
  return coursesStore.courses.map(course => ({
    id: course.id,
    name: course.name
  }))
}

// 根据试卷设置生成题目列表
export function generateOnJobTrainingExamQuestions(paperId) {
  const paper = getOnJobTrainingExamPaperById(paperId)
  if (!paper) return []
  
  const allQuestions = getOnJobTrainingQuestionsByUser(paper.createdBy)
  const examQuestions = []
  
  // 按题目类型和难度筛选题目
  Object.keys(paper.questionSettings).forEach(type => {
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
    
    const settings = paper.questionSettings[type]
    const questionType = typeMap[type]
    
    Object.keys(settings).forEach(difficulty => {
      const count = settings[difficulty]
      const questionDifficulty = difficultyMap[difficulty]
      
      // 筛选符合条件的题目
      const availableQuestions = allQuestions.filter(q => 
        q.type === questionType && 
        q.difficulty === questionDifficulty &&
        q.courseId === paper.courseId
      )
      
      // 随机选择指定数量的题目
      const selectedQuestions = availableQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, count)
      
      examQuestions.push(...selectedQuestions)
    })
  })
  
  return examQuestions
}

// 计算试卷总分
export function calculateOnJobTrainingTotalPoints(questionSettings) {
  let totalPoints = 0
  
  Object.keys(questionSettings).forEach(type => {
    const settings = questionSettings[type]
    Object.keys(settings).forEach(difficulty => {
      const count = settings[difficulty]
      // 这里可以根据题目类型和难度设置不同的分值
      const pointsPerQuestion = 5 // 默认每题5分
      totalPoints += count * pointsPerQuestion
    })
  })
  
  return totalPoints
}
