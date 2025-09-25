import { reactive } from 'vue'
import { USERS } from './user'
import { worksStore } from './works'

const STORAGE_KEY = 'work_processes_store'

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const workProcessesStore = reactive({
  items: persisted?.items || [
    {
      id: 'wp_001',
      workId: 'wk_001',
      applicantId: 'u_001',
      applicantName: '刘备',
      department: '电气部',
      workName: '电气设备维护作业授权',
      status: 'assessment_completed', // pending, assessment_pending, assessment_in_progress, assessment_completed, section_chief_pending, section_chief_approved, section_chief_rejected, dept_manager_pending, dept_manager_approved, dept_manager_rejected, certificate_issued, completed
      assessmentId: 'wa_001',
      assessmentResult: 'suggest_authorize', // suggest_authorize, failed
      sectionChiefId: 'u_002', // 科长ID
      sectionChiefName: '关羽',
      sectionChiefApprovedAt: null,
      sectionChiefRejectedAt: null,
      sectionChiefComment: '',
      deptManagerId: 'u_008', // 部门经理ID
      deptManagerName: '曹操',
      deptManagerApprovedAt: null,
      deptManagerRejectedAt: null,
      deptManagerComment: '',
      certificateTemplateId: null,
      certificateIssuedAt: null,
      certificateExpireAt: null,
      createdAt: '2024-01-15 09:00:00',
      updatedAt: '2024-01-15 15:00:00'
    }
  ]
})

// 兼容旧代码：提供 processes 别名（指向 items）
// 某些组件可能仍然访问 workProcessesStore.processes
if (!('processes' in workProcessesStore)) {
  // 非只读引用，保持与 items 同步引用
  workProcessesStore.processes = workProcessesStore.items
}

// 为历史与新建记录补齐兼容字段
function normalizeCompatFields(p) {
  if (!p) return p
  // 旧组件使用的字段别名
  if (!('userId' in p)) p.userId = p.applicantId
  if (!('targetWorkId' in p)) p.targetWorkId = p.workId
  if (!('type' in p)) p.type = 'apply'
  if (!('currentNode' in p)) {
    const nodeMap = {
      assessment_pending: '待考核',
      assessment_in_progress: '考核中',
      assessment_completed: '考核完成',
      section_chief_pending: '科长审批',
      dept_manager_pending: '部门经理审批',
      certificate_issued: '证书签发'
    }
    p.currentNode = nodeMap[p.status] || '—'
  }
  return p
}

workProcessesStore.items.forEach(normalizeCompatFields)

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: workProcessesStore.items }))
  } catch {}
}

// 获取所有流程
export function getAllWorkProcesses() {
  return workProcessesStore.items
}

// 根据ID获取流程
export function getWorkProcessById(id) {
  return workProcessesStore.items.find(p => p.id === id) || null
}

// 根据申请人ID获取流程
export function getWorkProcessesByApplicant(applicantId) {
  return workProcessesStore.items.filter(p => p.applicantId === applicantId)
}

// 根据审核人ID获取待审核流程
export function getWorkProcessesByApprover(approverId) {
  return workProcessesStore.items.filter(p => 
    (p.status === 'section_chief_pending' && p.sectionChiefId === approverId) ||
    (p.status === 'dept_manager_pending' && p.deptManagerId === approverId)
  )
}

// 创建流程
export function createWorkProcess(payload) {
  const id = `wp_${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  
  const record = {
    id,
    workId: payload.workId,
    applicantId: payload.applicantId,
    applicantName: payload.applicantName,
    department: payload.department,
    workName: payload.workName,
    status: 'assessment_pending',
    assessmentId: null,
    assessmentResult: null,
    sectionChiefId: payload.sectionChiefId,
    sectionChiefName: payload.sectionChiefName,
    sectionChiefApprovedAt: null,
    sectionChiefRejectedAt: null,
    sectionChiefComment: '',
    deptManagerId: payload.deptManagerId,
    deptManagerName: payload.deptManagerName,
    deptManagerApprovedAt: null,
    deptManagerRejectedAt: null,
    deptManagerComment: '',
    certificateTemplateId: null,
    certificateIssuedAt: null,
    certificateExpireAt: null,
    createdAt: now,
    updatedAt: now
  }
  
  workProcessesStore.items.push(normalizeCompatFields(record))
  persist()
  return id
}

// 更新流程状态
export function updateWorkProcessStatus(processId, updates) {
  const idx = workProcessesStore.items.findIndex(p => p.id === processId)
  if (idx === -1) return false
  
  workProcessesStore.items[idx] = {
    ...workProcessesStore.items[idx],
    ...updates,
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  normalizeCompatFields(workProcessesStore.items[idx])
  persist()
  return true
}

// 科长审核
export function sectionChiefApprove(processId, comment = '') {
  const process = getWorkProcessById(processId)
  if (!process) return false
  
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  
  return updateWorkProcessStatus(processId, {
    status: 'dept_manager_pending',
    sectionChiefApprovedAt: now,
    sectionChiefComment: comment
  })
}

// 科长拒绝
export function sectionChiefReject(processId, comment = '') {
  const process = getWorkProcessById(processId)
  if (!process) return false
  
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  
  return updateWorkProcessStatus(processId, {
    status: 'section_chief_rejected',
    sectionChiefRejectedAt: now,
    sectionChiefComment: comment
  })
}

// 部门经理审核
export function deptManagerApprove(processId, certificateTemplateId, comment = '') {
  const process = getWorkProcessById(processId)
  if (!process) return false
  
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  
  return updateWorkProcessStatus(processId, {
    status: 'certificate_issued',
    deptManagerApprovedAt: now,
    deptManagerComment: comment,
    certificateTemplateId,
    certificateIssuedAt: now,
    certificateExpireAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ') // 默认1年有效期
  })
}

// 部门经理拒绝
export function deptManagerReject(processId, comment = '') {
  const process = getWorkProcessById(processId)
  if (!process) return false
  
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  
  return updateWorkProcessStatus(processId, {
    status: 'dept_manager_rejected',
    deptManagerRejectedAt: now,
    deptManagerComment: comment
  })
}

// 获取状态文本
export function getStatusText(status) {
  const map = {
    pending: '待处理',
    assessment_pending: '待考核',
    assessment_in_progress: '考核中',
    assessment_completed: '考核完成',
    section_chief_pending: '待科长审核',
    section_chief_approved: '科长已通过',
    section_chief_rejected: '科长已拒绝',
    dept_manager_pending: '待部门经理审核',
    dept_manager_approved: '部门经理已通过',
    dept_manager_rejected: '部门经理已拒绝',
    certificate_issued: '证书已颁发',
    completed: '已完成'
  }
  return map[status] || status
}

// 获取状态类型
export function getStatusType(status) {
  const map = {
    pending: 'info',
    assessment_pending: 'warning',
    assessment_in_progress: 'info',
    assessment_completed: 'success',
    section_chief_pending: 'warning',
    section_chief_approved: 'success',
    section_chief_rejected: 'danger',
    dept_manager_pending: 'warning',
    dept_manager_approved: 'success',
    dept_manager_rejected: 'danger',
    certificate_issued: 'success',
    completed: 'success'
  }
  return map[status] || 'info'
}

// 兼容旧命名：导出 getWorkProcessStatusType（等同于 getStatusType）
export function getWorkProcessStatusType(status) {
  return getStatusType(status)
}

// 兼容旧命名：导出 getWorkProcessTypeText
// 目前仅存在工作授权申请一种类型，返回固定文案
export function getWorkProcessTypeText(type) {
  const map = { apply: '工作授权申请' }
  return map[type] || '工作授权申请'
}

// 兼容旧命名：导出 listMyWorkProcesses
export function listMyWorkProcesses(userId) {
  // 我们的数据字段为 applicantId
  return workProcessesStore.items.filter(p => p.applicantId === userId)
}

// 兼容旧命名：导出 addWorkProcess（封装 createWorkProcess）
export function addWorkProcess({ userId, type = 'apply', targetWorkId }) {
  const user = USERS.find(u => u.id === userId)
  const work = worksStore.items.find(w => w.id === targetWorkId)
  if (!user || !work) return null

  // 同部门科长 / 部门经理
  const sectionChief = USERS.find(u => u.department === user.department && u.role === 'section_chief')
  const deptManager = USERS.find(u => u.department === user.department && u.role === 'dept_manager')

  const payload = {
    workId: work.id,
    applicantId: user.id,
    applicantName: user.name,
    department: user.department,
    workName: work.name,
    sectionChiefId: sectionChief?.id || '',
    sectionChiefName: sectionChief?.name || '',
    deptManagerId: deptManager?.id || '',
    deptManagerName: deptManager?.name || ''
  }
  return createWorkProcess(payload)
}