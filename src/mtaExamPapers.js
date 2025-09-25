import { reactive } from 'vue'
import { USERS } from './user.js'
import { mtaAuthsStore } from './mtaAuths.js'
import { getQuestionsByUser } from './mtaQuestionBank.js'

const STORAGE_KEY = 'mta_exam_papers_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

// 默认测试数据
const defaultExamPapers = [
  {
    id: 'ep_001',
    name: '高压绝缘检测专项考试',
    description: '针对高压绝缘检测MTA授权的专项笔试试卷',
    mtaAuthId: 'm_001',
    mtaAuthName: '高压绝缘检测',
    status: '启用', // 启用、停用
    questionSettings: {
      choice: { easy: 2, medium: 3, hard: 1 }, // 选择题：初级2道，中级3道，高级1道
      fill: { easy: 1, medium: 2, hard: 1 },   // 填空题：初级1道，中级2道，高级1道
      judge: { easy: 2, medium: 1, hard: 0 }, // 判断题：初级2道，中级1道，高级0道
      essay: { easy: 0, medium: 1, hard: 1 }  // 简答题：初级0道，中级1道，高级1道
    },
    totalPoints: 100,
    timeLimit: 120, // 考试时间限制（分钟）
    passingScore: 60, // 及格分数
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-20 09:00',
    updatedAt: '2024-01-20 09:00'
  },
  {
    id: 'ep_002',
    name: '配电柜检修基础考试',
    description: '配电柜检修MTA授权的基础知识考试',
    mtaAuthId: 'm_002',
    mtaAuthName: '配电柜检修',
    status: '启用',
    questionSettings: {
      choice: { easy: 3, medium: 2, hard: 0 },
      fill: { easy: 2, medium: 1, hard: 0 },
      judge: { easy: 3, medium: 0, hard: 0 },
      essay: { easy: 0, medium: 0, hard: 0 }
    },
    totalPoints: 80,
    timeLimit: 90,
    passingScore: 50,
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-21 10:00',
    updatedAt: '2024-01-21 10:00'
  },
  {
    id: 'ep_003',
    name: '继电保护测试综合考试',
    description: '继电保护测试MTA授权的综合能力考试',
    mtaAuthId: 'm_003',
    mtaAuthName: '继电保护测试',
    status: '停用',
    questionSettings: {
      choice: { easy: 2, medium: 4, hard: 2 },
      fill: { easy: 1, medium: 2, hard: 2 },
      judge: { easy: 1, medium: 2, hard: 1 },
      essay: { easy: 0, medium: 1, hard: 2 }
    },
    totalPoints: 150,
    timeLimit: 180,
    passingScore: 90,
    department: '电气部',
    createdBy: 'u_003',
    createdByName: '张飞',
    createdAt: '2024-01-22 14:00',
    updatedAt: '2024-01-22 14:00'
  }
]

export const mtaExamPapersStore = reactive({
  examPapers: persisted?.examPapers || defaultExamPapers
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      examPapers: mtaExamPapersStore.examPapers
    }))
  } catch {}
}

// 获取用户可访问的试卷列表
export function getExamPapersByUser(userId) {
  const user = USERS.find(u => u.id === userId)
  if (!user) return []
  
  // 根据用户角色和部门返回试卷
  if (user.role === 'training_admin' || user.role === 'section_chief' || user.role === 'dept_manager') {
    return mtaExamPapersStore.examPapers.filter(paper => paper.department === user.department)
  }
  
  return []
}

// 根据ID获取试卷
export function getExamPaperById(id) {
  return mtaExamPapersStore.examPapers.find(paper => paper.id === id) || null
}

// 创建新试卷
export function createExamPaper(paperData) {
  const id = `ep_${Math.random().toString(36).slice(2, 8)}`
  const user = USERS.find(u => u.id === paperData.createdBy)
  
  // 获取MTA授权名称
  const mtaAuth = mtaAuthsStore.items.find(auth => auth.id === paperData.mtaAuthId)
  
  const newPaper = {
    id,
    ...paperData,
    mtaAuthName: mtaAuth ? mtaAuth.techName : '',
    department: user ? user.department : '',
    createdByName: user ? user.name : '',
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
  }
  
  mtaExamPapersStore.examPapers.push(newPaper)
  persist()
  return id
}

// 更新试卷
export function updateExamPaper(id, paperData) {
  const index = mtaExamPapersStore.examPapers.findIndex(paper => paper.id === id)
  if (index === -1) return false
  
  // 获取MTA授权名称
  const mtaAuth = mtaAuthsStore.items.find(auth => auth.id === paperData.mtaAuthId)
  
  mtaExamPapersStore.examPapers[index] = {
    ...mtaExamPapersStore.examPapers[index],
    ...paperData,
    mtaAuthName: mtaAuth ? mtaAuth.techName : mtaExamPapersStore.examPapers[index].mtaAuthName,
    updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
  }
  
  persist()
  return true
}

// 删除试卷
export function deleteExamPaper(id) {
  const index = mtaExamPapersStore.examPapers.findIndex(paper => paper.id === id)
  if (index === -1) return false
  
  mtaExamPapersStore.examPapers.splice(index, 1)
  persist()
  return true
}

// 获取MTA授权选项
export function getMtaAuthOptions() {
  return mtaAuthsStore.items.map(auth => ({
    id: auth.id,
    name: auth.techName
  }))
}

// 根据试卷设置生成题目列表
export function generateExamQuestions(paperId) {
  const paper = getExamPaperById(paperId)
  if (!paper) return []
  
  const allQuestions = getQuestionsByUser(paper.createdBy)
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
        q.mtaAuthId === paper.mtaAuthId
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
export function calculateTotalPoints(questionSettings) {
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

