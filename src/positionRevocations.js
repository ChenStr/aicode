import { reactive } from 'vue'

// 岗位撤销记录：
// { id, userId, userName, department, revokedPositionId, authorizedAt, revokedAt, status,
//   employeeSigned, employeeSignedAt, deptManagerSigned, deptManagerSignedAt, vpSigned, vpSignedAt }
const STORAGE_KEY = 'position_revocations_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const positionRevocationsStore = reactive({
  items: persisted?.items || []
})

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: positionRevocationsStore.items })) } catch {}
}

export function listByRoleScope(currentUser) {
  const role = currentUser?.role
  if (!role) return []
  if (role === 'employee') {
    return positionRevocationsStore.items.filter(it => it.userId === currentUser.id)
  }
  // 培训工程师、科长、部门经理可看本部门
  if (['training_admin','section_chief','dept_manager'].includes(role)) {
    return positionRevocationsStore.items.filter(it => it.department === currentUser.department)
  }
  // 其他默认仅本人
  return positionRevocationsStore.items.filter(it => it.userId === currentUser.id)
}

export function createRevocation(payload) {
  const id = `prv_${Math.random().toString(36).slice(2,8)}`
  const now = new Date().toISOString().slice(0,10)
  const record = {
    id,
    status: 'pending',
    authorizedAt: '',
    revokedAt: '',
    employeeSigned: false,
    employeeSignedAt: '',
    deptManagerSigned: false,
    deptManagerSignedAt: '',
    vpSigned: false,
    vpSignedAt: '',
    ...payload
  }
  if (!record.revokedAt) record.revokedAt = now
  positionRevocationsStore.items.unshift(record)
  persist()
  return id
}

export function updateRevocation(id, patch) {
  const idx = positionRevocationsStore.items.findIndex(it => it.id === id)
  if (idx === -1) return false
  positionRevocationsStore.items[idx] = { ...positionRevocationsStore.items[idx], ...patch }
  persist()
  return true
}

export function getById(id) {
  return positionRevocationsStore.items.find(it => it.id === id) || null
}

// 签字操作
export function signByEmployee(id) {
  const now = new Date().toISOString().slice(0,10)
  return updateRevocation(id, { employeeSigned: true, employeeSignedAt: now })
}

export function signByDeptManager(id) {
  const now = new Date().toISOString().slice(0,10)
  return updateRevocation(id, { deptManagerSigned: true, deptManagerSignedAt: now })
}

export function signByVp(id) {
  const now = new Date().toISOString().slice(0,10)
  return updateRevocation(id, { vpSigned: true, vpSignedAt: now })
}

export function submitRevocation(id) {
  return updateRevocation(id, { status: 'submitted' })
}

// 本地演示：如果当前没有任何撤销记录，自动生成一条示例数据（刘备 / 电气部 / p_001）
;(function seedIfEmpty() {
  try {
    if (!Array.isArray(positionRevocationsStore.items) || positionRevocationsStore.items.length > 0) return
    const today = new Date()
    const format = (d) => new Date(d).toISOString().slice(0,10)
    const authorizedAt = format(new Date(today.getFullYear()-1, today.getMonth(), today.getDate()))
    const revokedAt = format(today)
    const sample = {
      id: `prv_${Math.random().toString(36).slice(2,8)}`,
      userId: 'u_001',
      userName: '刘备',
      department: '电气部',
      revokedPositionId: 'p_001',
      authorizedAt,
      revokedAt,
      status: 'pending',
      employeeSigned: false,
      employeeSignedAt: '',
      deptManagerSigned: false,
      deptManagerSignedAt: '',
      vpSigned: false,
      vpSignedAt: ''
    }
    positionRevocationsStore.items.unshift(sample)
    persist()
  } catch {}
})()


