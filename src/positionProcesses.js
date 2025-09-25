import { reactive } from 'vue'

// 岗位流程数据存储
// process: { id, userId, type: 'apply'|'equivalent'|'extend'|'assessment', targetPositionId, sourcePositionId?, months?, reason?, status: 'in_progress'|'rejected'|'approved', currentNode, createdAt }
const STORAGE_KEY = 'position_processes_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const positionProcessesStore = reactive({
  processes: persisted?.processes || []
})

function persist() {
  try { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ processes: positionProcessesStore.processes })) 
  } catch {}
}

export function listMyPositionProcesses(userId) {
  return positionProcessesStore.processes.filter(p => p.userId === userId)
}

export function addPositionProcess(payload) {
  const id = `pp_${Math.random().toString(36).slice(2,8)}`
  
  // 根据流程类型设置不同的初始节点
  let initialNode = '培训工程师审核'
  if (payload.type === 'equivalent') {
    // 岗位等效流程：由申请人填写并签名后提交至科长
    initialNode = '申请人提交'
  } else if (payload.type === 'extend') {
    initialNode = '科长审核'
  } else if (payload.type === 'assessment') {
    initialNode = '培训工程师审核'
  }
  
  const record = {
    id,
    status: 'in_progress',
    currentNode: initialNode,
    createdAt: new Date().toISOString().slice(0,10),
    ...payload
  }
  positionProcessesStore.processes.unshift(record)
  persist()
  return id
}

export function setProcessApplicantSigned(id, signed) {
  const idx = positionProcessesStore.processes.findIndex(p => p.id === id)
  if (idx === -1) return false
  positionProcessesStore.processes[idx] = { ...positionProcessesStore.processes[idx], applicantSigned: !!signed }
  persist()
  return true
}

export function updatePositionProcess(id, patch) {
  const idx = positionProcessesStore.processes.findIndex(p => p.id === id)
  if (idx === -1) return false
  positionProcessesStore.processes[idx] = { ...positionProcessesStore.processes[idx], ...patch }
  persist()
  return true
}

export function removePositionProcess(id) {
  const before = positionProcessesStore.processes.length
  positionProcessesStore.processes = positionProcessesStore.processes.filter(p => p.id !== id)
  persist()
  return positionProcessesStore.processes.length !== before
}

export function removeAllPositionProcessesByUser(userId) {
  const initialLength = positionProcessesStore.processes.length
  positionProcessesStore.processes = positionProcessesStore.processes.filter(p => p.userId !== userId)
  const removed = initialLength - positionProcessesStore.processes.length
  if (removed > 0) persist()
  return removed
}

export function getPositionProcessTypeText(type) {
  const typeMap = {
    'apply': '岗位申请',
    'equivalent': '岗位等效',
    'extend': '岗位延期',
    'assessment': '社聘/转岗人员考核'
  }
  return typeMap[type] || type
}

export function getPositionProcessStatusType(status) {
  const statusMap = {
    'in_progress': 'warning',
    'rejected': 'danger',
    'approved': 'success'
  }
  return statusMap[status] || 'info'
}

// 一次性清除关羽的所有岗位发起流程
;(function cleanupGuanYuPositionProcesses() {
  try {
    const KEY = 'position_cleanup_guanyu_done_v1'
    const done = localStorage.getItem(KEY)
    if (done) return
    
    const removed = removeAllPositionProcessesByUser('u_002') // 关羽的用户ID
    if (removed > 0) {
      console.log(`已清除关羽的 ${removed} 条岗位发起流程`)
    }
    localStorage.setItem(KEY, '1')
  } catch {}
})()
