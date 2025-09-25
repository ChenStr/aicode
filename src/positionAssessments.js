import { reactive } from 'vue'

// 岗位考核与工作总结/设想存储
// assessment: {
//   id, processId, applicantId, department, targetPositionId, currentPositionLabel,
//   assessorIds: string[],
//   // 线下讨论统一结论（共享字段）
//   reportContent: string,
//   qaContent: string,
//   // 统一考核结果：'pending' | 'suggest_authorize' | 'failed'
//   finalResult: 'pending' | 'suggest_authorize' | 'failed',
//   // 签名记录（每个考核人独立签名）
//   records: Array<{ assessorId, signed, signedAt }>,
//   status: 'in_progress' | 'completed',
//   createdAt
// }
// summaryPlan: {
//   id, processId, applicantId, department, targetPositionId,
//   summaryText, planText, managerSigned, managerSignedAt,
//   status: 'draft' | 'submitted'
// }

const STORAGE_KEY = 'position_assessments_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const positionAssessmentsStore = reactive({
  assessments: persisted?.assessments || [],
  summaries: persisted?.summaries || []
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      assessments: positionAssessmentsStore.assessments,
      summaries: positionAssessmentsStore.summaries
    }))
  } catch {}
}

export function createAssessment(payload) {
  const id = `pa_${Math.random().toString(36).slice(2,8)}`
  const record = {
    id,
    status: 'in_progress',
    finalResult: 'pending',
    reportContent: '',
    qaContent: '',
    createdAt: new Date().toISOString().slice(0,10),
    ...payload
  }
  // 初始化每位考核人的签名记录
  record.records = (payload.assessorIds || []).map(aid => ({ assessorId: aid, signed: false, signedAt: '' }))
  positionAssessmentsStore.assessments.unshift(record)
  persist()
  return id
}

export function updateAssessment(id, patch) {
  const idx = positionAssessmentsStore.assessments.findIndex(a => a.id === id)
  if (idx === -1) return false
  positionAssessmentsStore.assessments[idx] = { ...positionAssessmentsStore.assessments[idx], ...patch }
  persist()
  return true
}

export function findAssessmentsByUser(user) {
  const u = user || {}
  // 权限：
  // - 普通员工：仅本人相关（申请人为本人，或自己是考核人）
  // - 考核组成员：本人相关（同上）
  // - 培训工程师/科长/部门经理：查看本部门所有
  if (['training_admin','section_chief','dept_manager'].includes(u.role)) {
    return positionAssessmentsStore.assessments.filter(a => a.department === u.department)
  }
  return positionAssessmentsStore.assessments.filter(a => a.applicantId === u.id || (a.assessorIds || []).includes(u.id))
}

// 工作总结与设想
export function createSummaryPlan(payload) {
  const id = `sp_${Math.random().toString(36).slice(2,8)}`
  const record = {
    id,
    status: 'draft',
    summaryText: '',
    planText: '',
    managerSigned: false,
    managerSignedAt: '',
    createdAt: new Date().toISOString().slice(0,10),
    ...payload
  }
  positionAssessmentsStore.summaries.unshift(record)
  persist()
  return id
}

export function updateSummaryPlan(id, patch) {
  const idx = positionAssessmentsStore.summaries.findIndex(s => s.id === id)
  if (idx === -1) return false
  positionAssessmentsStore.summaries[idx] = { ...positionAssessmentsStore.summaries[idx], ...patch }
  persist()
  return true
}

export function findSummaryPlanByProcess(processId) {
  return positionAssessmentsStore.summaries.find(s => s.processId === processId) || null
}

export function listAssessments() {
  return positionAssessmentsStore.assessments
}


