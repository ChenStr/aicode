import { reactive } from 'vue'

// MTA考核记录数据存储
// assessment: { 
//   id, processId, applicantId, department, assessmentDate, assessmentForm, 
//   targetMtaName, assessorIds, assessmentContent, assessmentEvaluation, 
//   writtenScore, improvementSuggestions, applicantSignature, 
//   assessmentConclusion, assessorSignatures, status, createdAt, updatedAt 
// }
const STORAGE_KEY = 'mta_assessments_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const mtaAssessmentsStore = reactive({
  assessments: persisted?.assessments || []
})

function persist() {
  try { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ assessments: mtaAssessmentsStore.assessments })) 
  } catch {}
}

// 一次性清理刘备（v1）：清空刘备的所有MTA考核
;(function cleanupLiuBeiAssessmentsV1() {
  try {
    const KEY = 'mta_cleanup_assess_lb_done_v1'
    if (localStorage.getItem(KEY)) return
    const before = mtaAssessmentsStore.assessments.length
    mtaAssessmentsStore.assessments = mtaAssessmentsStore.assessments.filter(a => a.applicantId !== 'u_001')
    const removed = before - mtaAssessmentsStore.assessments.length
    if (removed > 0) {
      console.log(`已清除刘备的 ${removed} 条MTA考核记录`)
      persist()
    }
    localStorage.setItem(KEY, '1')
  } catch {}
})()

// 根据用户角色获取可见的考核记录
export function getVisibleAssessments(currentUser) {
  const { role, id, department } = currentUser
  
  if (role === 'employee') {
    // 普通员工：只看自己的考核记录
    return mtaAssessmentsStore.assessments.filter(a => a.applicantId === id)
  } else if (role === 'assessor') {
    // 考核组成员：看分配给自己的考核 + 自己的考核记录
    return mtaAssessmentsStore.assessments.filter(a => 
      a.applicantId === id || a.assessorIds.includes(id)
    )
  } else if (['training_admin', 'section_chief', 'dept_manager'].includes(role)) {
    // 培训工程师、科长、部门经理：看本部门所有人的考核记录
    return mtaAssessmentsStore.assessments.filter(a => a.department === department)
  }
  
  return []
}

// 创建MTA考核记录
export function createAssessment(processInfo, targetMta, assessorIds) {
  const id = `ma_${Math.random().toString(36).slice(2,8)}`
  const assessment = {
    id,
    processId: processInfo.id,
    applicantId: processInfo.userId,
    department: processInfo.department || '电气部', // 从用户信息获取
    assessmentDate: '',
    assessmentForm: targetMta.assessmentForm || '面试',
    targetMtaName: `${targetMta.techName}（${targetMta.code}）`,
    assessorIds: assessorIds,
    assessmentContent: '',
    assessmentEvaluation: '',
    writtenScore: '',
    improvementSuggestions: '',
    applicantSignature: '',
    assessmentConclusion: '',
    assessorSignatures: {},
    status: '待考核',
    createdAt: new Date().toISOString().slice(0,10),
    updatedAt: new Date().toISOString().slice(0,10)
  }
  
  mtaAssessmentsStore.assessments.unshift(assessment)
  persist()
  return id
}

// 更新考核记录
export function updateAssessment(id, patch) {
  const idx = mtaAssessmentsStore.assessments.findIndex(a => a.id === id)
  if (idx === -1) return false
  
  mtaAssessmentsStore.assessments[idx] = { 
    ...mtaAssessmentsStore.assessments[idx], 
    ...patch,
    updatedAt: new Date().toISOString().slice(0,10)
  }
  persist()
  return true
}

// 重新考核（培训工程师操作）
export function reassessAssessment(id, newAssessorIds) {
  return updateAssessment(id, {
    assessorIds: newAssessorIds,
    assessmentDate: '',
    assessmentContent: '',
    assessmentEvaluation: '',
    writtenScore: '',
    improvementSuggestions: '',
    applicantSignature: '',
    assessmentConclusion: '',
    assessorSignatures: {},
    status: '待考核'
  })
}

// 考核组成员签名
export function signAsAssessor(assessmentId, assessorId, signature) {
  const assessment = mtaAssessmentsStore.assessments.find(a => a.id === assessmentId)
  if (!assessment) return false
  
  const newSignatures = { ...assessment.assessorSignatures, [assessorId]: signature }
  const signedCount = Object.keys(newSignatures).length
  const totalAssessors = assessment.assessorIds.length
  
  let newStatus = assessment.status
  if (signedCount === 1 && assessment.status === '待考核') {
    newStatus = '待考核组成员签名'
  } else if (signedCount === totalAssessors && assessment.status === '待考核组成员签名') {
    newStatus = '待申请人签名确认'
  }
  
  return updateAssessment(assessmentId, {
    assessorSignatures: newSignatures,
    status: newStatus
  })
}

// 申请人签名确认
export function signAsApplicant(assessmentId, signature) {
  return updateAssessment(assessmentId, {
    applicantSignature: signature,
    status: '考核完成'
  })
}

// 获取考核记录详情
export function getAssessmentById(id) {
  return mtaAssessmentsStore.assessments.find(a => a.id === id)
}

// 根据流程ID获取考核记录
export function getAssessmentByProcessId(processId) {
  return mtaAssessmentsStore.assessments.find(a => a.processId === processId)
}

export function removeAssessmentsByApplicant(applicantId) {
  const before = mtaAssessmentsStore.assessments.length
  mtaAssessmentsStore.assessments = mtaAssessmentsStore.assessments.filter(a => a.applicantId !== applicantId)
  const removed = before - mtaAssessmentsStore.assessments.length
  if (removed > 0) persist()
  return removed
}
