import { reactive } from 'vue'

// 流程数据存储
// process: { id, userId, type: 'apply'|'equivalent'|'extend', targetMtaId, sourceMtaId?, months?, reason?, status: 'in_progress'|'rejected'|'approved', currentNode, createdAt }
const STORAGE_KEY = 'mta_processes_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const mtaProcessesStore = reactive({
  processes: persisted?.processes || [
    // 为刘备创建一个已完成的MTA授权流程，用于测试等效流程
    {
      id: 'mp_test_001',
      userId: 'u_001', // 刘备
      type: 'apply',
      targetMtaId: 'm_001', // 高压绝缘检测
      status: 'approved',
      currentNode: '已完成',
      createdAt: '2024-01-15',
      issuedCert: {
        mtaId: 'm_001',
        issuedAt: '2024-01-15',
        expireYears: 1,
        applicantId: 'u_001'
      }
    }
  ]
})

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ processes: mtaProcessesStore.processes })) } catch {}
}

export function listMyProcesses(userId) {
  return mtaProcessesStore.processes.filter(p => p.userId === userId)
}

export function addProcess(payload) {
  const id = `mp_${Math.random().toString(36).slice(2,8)}`
  
  // 根据流程类型设置不同的初始节点
  let initialNode = '培训工程师审核'
  if (payload.type === 'equivalent') {
    initialNode = '培训工程师审核'
  } else if (payload.type === 'extend') {
    initialNode = '科长审核'
  }
  
  const record = {
    id,
    status: 'in_progress',
    currentNode: initialNode,
    createdAt: new Date().toISOString().slice(0,10),
    ...payload
  }
  mtaProcessesStore.processes.unshift(record)
  persist()
  return id
}

export function updateProcess(id, patch) {
  const idx = mtaProcessesStore.processes.findIndex(p => p.id === id)
  if (idx === -1) return false
  mtaProcessesStore.processes[idx] = { ...mtaProcessesStore.processes[idx], ...patch }
  persist()
  return true
}

export function removeLatestByUser(userId, count = 1) {
  let removed = 0
  for (let i = mtaProcessesStore.processes.length - 1; i >= 0 && removed < count; i--) {
    if (mtaProcessesStore.processes[i].userId === userId) {
      mtaProcessesStore.processes.splice(i, 1)
      removed++
    }
  }
  if (removed > 0) persist()
  return removed
}

export function removeAllByUser(userId) {
  const initialLength = mtaProcessesStore.processes.length
  mtaProcessesStore.processes = mtaProcessesStore.processes.filter(p => p.userId !== userId)
  const removed = initialLength - mtaProcessesStore.processes.length
  if (removed > 0) persist()
  return removed
}

// 一次性清除刘备的所有MTA发起流程
;(function cleanupLiuBeiAllOnce() {
  try {
    const KEY = 'mta_cleanup_lb_all_done_v2'
    const done = localStorage.getItem(KEY)
    if (done) return
    const removed = removeAllByUser('u_001')
    if (removed > 0) {
      console.log(`已清除刘备的 ${removed} 条MTA发起流程`)
    }
    localStorage.setItem(KEY, '1')
  } catch {}
})()

// 追加一次性清理（v3）：再次清空刘备的所有MTA发起流程
;(function cleanupLiuBeiAllV3() {
  try {
    const KEY = 'mta_cleanup_lb_all_done_v3'
    const done = localStorage.getItem(KEY)
    if (done) return
    const removed = removeAllByUser('u_001')
    if (removed > 0) {
      console.log(`已清除刘备的 ${removed} 条MTA发起流程（v3）`)
    }
    localStorage.setItem(KEY, '1')
  } catch {}
})()

// 用户已获得的MTA授权（等效/延期选择来源）
// 这里提供一个空的种子，后续可由其它流程写入
export const userMtaCertsStore = reactive({
  items: persisted?.userMtaCerts || [
    // 为刘备创建一个已通过的MTA授权，用于测试等效流程
    {
      id: 'cert_test_001',
      userId: 'u_001', // 刘备
      mtaId: 'm_001', // 高压绝缘检测
      obtainedAt: '2024-01-15',
      expireAt: '2025-01-15'
    }
  ] // { id, userId, mtaId, obtainedAt, expireAt }
})

export function listMyMtaCerts(userId) {
  return userMtaCertsStore.items.filter(i => i.userId === userId)
}

// 清除刘备的等效流程记录
export function removeEquivalentProcessesByUser(userId) {
  const initialLength = mtaProcessesStore.processes.length
  mtaProcessesStore.processes = mtaProcessesStore.processes.filter(p => 
    !(p.userId === userId && p.type === 'equivalent')
  )
  const removed = initialLength - mtaProcessesStore.processes.length
  if (removed > 0) persist()
  return removed
}

// 一次性清除刘备的所有等效流程
;(function cleanupLiuBeiEquivalentOnce() {
  try {
    const KEY = 'mta_cleanup_lb_equivalent_done_v1'
    const done = localStorage.getItem(KEY)
    if (done) return
    const removed = removeEquivalentProcessesByUser('u_001')
    if (removed > 0) {
      console.log(`已清除刘备的 ${removed} 条MTA等效流程`)
    }
    localStorage.setItem(KEY, '1')
  } catch {}
})()

// 清除刘备的高压绝缘检测MTA授权和相关等效流程
;(function cleanupLiuBeiHighVoltageOnce() {
  try {
    const KEY = 'mta_cleanup_lb_highvoltage_done_v1'
    const done = localStorage.getItem(KEY)
    if (done) return
    
    // 清除刘备的高压绝缘检测MTA授权流程
    const initialLength = mtaProcessesStore.processes.length
    mtaProcessesStore.processes = mtaProcessesStore.processes.filter(p => 
      !(p.userId === 'u_001' && p.targetMtaId === 'm_001')
    )
    const removedProcesses = initialLength - mtaProcessesStore.processes.length
    
    // 清除刘备的高压绝缘检测MTA授权证书
    const initialCertLength = userMtaCertsStore.items.length
    userMtaCertsStore.items = userMtaCertsStore.items.filter(cert => 
      !(cert.userId === 'u_001' && cert.mtaId === 'm_001')
    )
    const removedCerts = initialCertLength - userMtaCertsStore.items.length
    
    if (removedProcesses > 0 || removedCerts > 0) {
      console.log(`已清除刘备的高压绝缘检测MTA授权：${removedProcesses} 条流程，${removedCerts} 条证书`)
      persist()
    }
    localStorage.setItem(KEY, '1')
  } catch {}
})()


