import { reactive } from 'vue'

const STORAGE_KEY = 'work_items_store'

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const workItemsStore = reactive({
  items: persisted?.items || [
    { id: 'w_001', name: '设备升级', type: '实践', department: '电气部' },
    { id: 'w_002', name: '系统巡检', type: '实践', department: '电气部' },
    { id: 'w_003', name: '教学方案制定', type: '技能', department: '培训部' },
    { id: 'w_004', name: '安全操作规程', type: '技能', department: '电气部' },
    { id: 'w_005', name: '故障诊断训练', type: '技能', department: '电气部' },
    { id: 'w_006', name: '实操考核', type: '实践', department: '培训部' },
    { id: 'w_007', name: '设备维护', type: '实践', department: '电气部' },
    { id: 'w_008', name: '应急处理', type: '技能', department: '电气部' }
  ]
})

export function listWorkItemsByDept(dept) {
  return workItemsStore.items.filter(i => i.department === dept)
}

export function addWorkItem({ name, type, department }) {
  const id = `w_${Math.random().toString(36).slice(2, 8)}`
  workItemsStore.items.push({ id, name, type, department })
  persist()
  return id
}

export function updateWorkItem(id, patch) {
  const idx = workItemsStore.items.findIndex(i => i.id === id)
  if (idx === -1) return false
  workItemsStore.items[idx] = { ...workItemsStore.items[idx], ...patch }
  persist()
  return true
}

export function removeWorkItem(id) {
  const before = workItemsStore.items.length
  workItemsStore.items = workItemsStore.items.filter(i => i.id !== id)
  persist()
  return workItemsStore.items.length !== before
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: workItemsStore.items }))
  } catch {}
}
