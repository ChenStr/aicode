import { reactive } from 'vue'
import { USERS } from './user.js'

// 在岗培训考核数据存储
const STORAGE_KEY = 'on_job_training_assessments_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

// 如果本地存储中没有数据，使用默认测试数据
const defaultAssessments = [
  {
    id: 'ojta_001',
    activityId: 'ojt_002',
    activityName: '电气设备维护在岗培训',
    courseId: 'c_005',
    courseName: '电气设备维护实操',
    assessmentMethods: ['笔试', '报告', '面试'],
    instructorId: 'u_003',
    instructorName: '张飞',
    department: '电气部',
    status: '进行中',
    createdAt: '2024-01-20 09:00',
    createdBy: 'u_003'
  }
]

const defaultStudentAssessments = [
  {
    id: 'ojtas_001',
    assessmentId: 'ojta_001',
    activityId: 'ojt_002',
    userId: 'u_001',
    userName: '刘备',
    userDepartment: '电气部',
    userPosition: '电气工程师',
    assessmentMethods: ['笔试', '报告', '面试'],
    status: '进行中',
    interviewEvaluation: {
      name: '刘备',
      department: '电气部',
      position: '电气工程师',
      assessmentForm: '',
      trainingProject: '电气设备维护实操',
      assessmentDate: '',
      assessmentContent: '',
      assessmentSituation: '',
      assessmentScore: '',
      overallSuggestion: '',
      improvementSuggestion: '',
      assessorSignature: '',
      signatureDate: ''
    },
    trainingReport: {
      name: '刘备',
      department: '电气部',
      position: '电气工程师',
      reportContent: '',
      reviewComment: '',
      submittedAt: '',
      reviewedAt: ''
    },
    // 成绩相关字段
    writtenScore: null,
    reportScore: null,
    interviewScore: null,
    passed: null,
    instructorComment: '',
    completedAt: null,
    createdAt: '2024-01-20 09:00'
  },
  {
    id: 'ojtas_002',
    assessmentId: 'ojta_001',
    activityId: 'ojt_002',
    userId: 'u_004',
    userName: '赵云',
    userDepartment: '电气部',
    userPosition: '电气工程师',
    assessmentMethods: ['笔试', '报告', '面试'],
    status: '进行中',
    interviewEvaluation: {
      name: '赵云',
      department: '电气部',
      position: '电气工程师',
      assessmentForm: '',
      trainingProject: '电气设备维护实操',
      assessmentDate: '',
      assessmentContent: '',
      assessmentSituation: '',
      assessmentScore: '',
      overallSuggestion: '',
      improvementSuggestion: '',
      assessorSignature: '',
      signatureDate: ''
    },
    trainingReport: {
      name: '赵云',
      department: '电气部',
      position: '电气工程师',
      reportContent: '',
      reviewComment: '',
      submittedAt: '',
      reviewedAt: ''
    },
    // 成绩相关字段
    writtenScore: null,
    reportScore: null,
    interviewScore: null,
    passed: null,
    instructorComment: '',
    completedAt: null,
    createdAt: '2024-01-20 09:00'
  },
  {
    id: 'ojtas_003',
    assessmentId: 'ojta_001',
    activityId: 'ojt_002',
    userId: 'u_005',
    userName: '马超',
    userDepartment: '电气部',
    userPosition: '电气工程师',
    assessmentMethods: ['笔试', '报告', '面试'],
    status: '进行中',
    interviewEvaluation: {
      name: '马超',
      department: '电气部',
      position: '电气工程师',
      assessmentForm: '',
      trainingProject: '电气设备维护实操',
      assessmentDate: '',
      assessmentContent: '',
      assessmentSituation: '',
      assessmentScore: '',
      overallSuggestion: '',
      improvementSuggestion: '',
      assessorSignature: '',
      signatureDate: ''
    },
    trainingReport: {
      name: '马超',
      department: '电气部',
      position: '电气工程师',
      reportContent: '',
      reviewComment: '',
      submittedAt: '',
      reviewedAt: ''
    },
    // 成绩相关字段
    writtenScore: null,
    reportScore: null,
    interviewScore: null,
    passed: null,
    instructorComment: '',
    completedAt: null,
    createdAt: '2024-01-20 09:00'
  }
]

export const onJobTrainingAssessmentsStore = reactive({
  assessments: persisted?.assessments || defaultAssessments,
  studentAssessments: persisted?.studentAssessments || defaultStudentAssessments
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      assessments: onJobTrainingAssessmentsStore.assessments,
      studentAssessments: onJobTrainingAssessmentsStore.studentAssessments
    }))
  } catch {}
}

// 获取当前用户的所有在岗培训考核（作为讲师或学员）
export function getAssessmentsByUser(userId) {
  // 获取用户作为讲师的考核
  const instructorAssessments = onJobTrainingAssessmentsStore.assessments.filter(a => a.instructorId === userId)
  
  // 获取用户作为学员参与的考核
  const studentAssessmentIds = onJobTrainingAssessmentsStore.studentAssessments
    .filter(sa => sa.userId === userId)
    .map(sa => sa.assessmentId)
  
  const studentAssessments = onJobTrainingAssessmentsStore.assessments.filter(a => 
    studentAssessmentIds.includes(a.id)
  )
  
  // 合并并去重
  const allAssessments = [...instructorAssessments, ...studentAssessments]
  const uniqueAssessments = allAssessments.filter((assessment, index, self) => 
    index === self.findIndex(a => a.id === assessment.id)
  )
  
  return uniqueAssessments
}

// 获取考核详情
export function getAssessmentById(id) {
  return onJobTrainingAssessmentsStore.assessments.find(a => a.id === id) || null
}

// 获取考核的学员列表
export function getStudentAssessmentsByAssessmentId(assessmentId) {
  return onJobTrainingAssessmentsStore.studentAssessments.filter(sa => sa.assessmentId === assessmentId)
}

// 获取学员考核详情
export function getStudentAssessmentById(id) {
  return onJobTrainingAssessmentsStore.studentAssessments.find(sa => sa.id === id) || null
}

// 创建在岗培训考核（由讲师点击开始考核时自动创建）
export async function createAssessment(activityId, signedInStudents) {
  const activity = onJobTrainingAssessmentsStore.assessments.find(a => a.activityId === activityId)
  if (activity) {
    return activity.id // 已存在，返回现有ID
  }

  // 从在岗培训活动数据中获取信息
  const { getActivityById } = await import('./onJobTraining.js')
  const activityData = getActivityById(activityId)
  if (!activityData) return null

  const assessmentId = `ojta_${Math.random().toString(36).slice(2, 8)}`
  const assessment = {
    id: assessmentId,
    activityId,
    activityName: activityData.name,
    courseId: activityData.courseId,
    courseName: activityData.courseName,
    assessmentMethods: activityData.assessmentMethods,
    instructorId: activityData.instructorId,
    instructorName: activityData.instructorName,
    department: activityData.department,
    status: '进行中',
    createdAt: new Date().toISOString().slice(0, 16),
    createdBy: activityData.instructorId
  }

  onJobTrainingAssessmentsStore.assessments.unshift(assessment)

  // 为每个签到的学员创建考核记录
  signedInStudents.forEach(student => {
    const user = USERS.find(u => u.id === student.userId)
    const studentAssessmentId = `ojtas_${Math.random().toString(36).slice(2, 8)}`
    const studentAssessment = {
      id: studentAssessmentId,
      assessmentId,
      activityId,
      userId: student.userId,
      userName: student.userName,
      userDepartment: user?.department || '',
      userPosition: '电气工程师', // 默认岗位，实际应从用户数据中获取
      assessmentMethods: activityData.assessmentMethods,
      status: '进行中',
      interviewEvaluation: {
        name: student.userName,
        department: user?.department || '',
        position: '电气工程师',
        assessmentForm: '',
        trainingProject: activityData.courseName,
        assessmentDate: '',
        assessmentContent: '',
        assessmentSituation: '',
        assessmentScore: '',
        overallSuggestion: '',
        improvementSuggestion: '',
        assessorSignature: '',
        signatureDate: ''
      },
      trainingReport: {
        name: student.userName,
        department: user?.department || '',
        position: '电气工程师',
        reportContent: '',
        reviewComment: '',
        submittedAt: '',
        reviewedAt: ''
      },
      createdAt: new Date().toISOString().slice(0, 16)
    }
    onJobTrainingAssessmentsStore.studentAssessments.push(studentAssessment)
  })

  persist()
  return assessmentId
}

// 更新面试考核评价
export function updateInterviewEvaluation(studentAssessmentId, evaluationData) {
  const idx = onJobTrainingAssessmentsStore.studentAssessments.findIndex(sa => sa.id === studentAssessmentId)
  if (idx === -1) return false
  
  onJobTrainingAssessmentsStore.studentAssessments[idx].interviewEvaluation = {
    ...onJobTrainingAssessmentsStore.studentAssessments[idx].interviewEvaluation,
    ...evaluationData
  }
  persist()
  return true
}

// 更新培训报告
export function updateTrainingReport(studentAssessmentId, reportData) {
  const idx = onJobTrainingAssessmentsStore.studentAssessments.findIndex(sa => sa.id === studentAssessmentId)
  if (idx === -1) return false
  
  onJobTrainingAssessmentsStore.studentAssessments[idx].trainingReport = {
    ...onJobTrainingAssessmentsStore.studentAssessments[idx].trainingReport,
    ...reportData
  }
  persist()
  return true
}

// 提交培训报告（学员操作）
export function submitTrainingReport(studentAssessmentId, reportContent) {
  const idx = onJobTrainingAssessmentsStore.studentAssessments.findIndex(sa => sa.id === studentAssessmentId)
  if (idx === -1) return false
  
  onJobTrainingAssessmentsStore.studentAssessments[idx].trainingReport.reportContent = reportContent
  onJobTrainingAssessmentsStore.studentAssessments[idx].trainingReport.submittedAt = new Date().toISOString().slice(0, 16)
  persist()
  return true
}

// 评审培训报告（讲师操作）
export function reviewTrainingReport(studentAssessmentId, reviewComment) {
  const idx = onJobTrainingAssessmentsStore.studentAssessments.findIndex(sa => sa.id === studentAssessmentId)
  if (idx === -1) return false
  
  onJobTrainingAssessmentsStore.studentAssessments[idx].trainingReport.reviewComment = reviewComment
  onJobTrainingAssessmentsStore.studentAssessments[idx].trainingReport.reviewedAt = new Date().toISOString().slice(0, 16)
  persist()
  return true
}

// 更新学员成绩
export function updateStudentScore(studentAssessmentId, scoreData) {
  const idx = onJobTrainingAssessmentsStore.studentAssessments.findIndex(sa => sa.id === studentAssessmentId)
  if (idx === -1) return false
  
  onJobTrainingAssessmentsStore.studentAssessments[idx] = { 
    ...onJobTrainingAssessmentsStore.studentAssessments[idx], 
    ...scoreData 
  }
  
  // 检查是否所有成绩都已录入完成，如果是则更新状态为已完成
  const student = onJobTrainingAssessmentsStore.studentAssessments[idx]
  if (isStudentScoreComplete(student)) {
    onJobTrainingAssessmentsStore.studentAssessments[idx].status = '已完成'
  }
  
  persist()
  return true
}

// 检查学员成绩是否录入完成
function isStudentScoreComplete(student) {
  // 检查所有考核方式的成绩是否都已录入
  const hasWritten = student.assessmentMethods.includes('笔试')
  const hasReport = student.assessmentMethods.includes('报告')
  const hasInterview = student.assessmentMethods.includes('面试')
  
  const writtenComplete = !hasWritten || (student.writtenScore !== null && student.writtenScore !== undefined)
  const reportComplete = !hasReport || (student.reportScore !== null && student.reportScore !== undefined)
  const interviewComplete = !hasInterview || (student.interviewScore !== null && student.interviewScore !== undefined)
  
  // 还需要有总体评价和考核结果
  const hasComment = student.instructorComment && student.instructorComment.trim() !== ''
  const hasResult = student.passed !== null && student.passed !== undefined && student.passed !== ''
  
  console.log('检查学员成绩完成状态:', {
    studentName: student.userName,
    hasWritten,
    hasReport,
    hasInterview,
    writtenComplete,
    reportComplete,
    interviewComplete,
    hasComment,
    hasResult,
    writtenScore: student.writtenScore,
    reportScore: student.reportScore,
    interviewScore: student.interviewScore,
    passed: student.passed,
    instructorComment: student.instructorComment
  })
  
  return writtenComplete && reportComplete && interviewComplete && hasComment && hasResult
}

// 完成考核
export function completeAssessment(assessmentId) {
  const idx = onJobTrainingAssessmentsStore.assessments.findIndex(a => a.id === assessmentId)
  if (idx === -1) return false
  
  onJobTrainingAssessmentsStore.assessments[idx].status = '已完成'
  
  // 同时更新所有学员考核状态
  onJobTrainingAssessmentsStore.studentAssessments
    .filter(sa => sa.assessmentId === assessmentId)
    .forEach(sa => {
      sa.status = '已完成'
    })
  
  persist()
  return true
}
