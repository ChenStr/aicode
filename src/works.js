import { reactive } from 'vue'

const STORAGE_KEY = 'works_store'

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const worksStore = reactive({
  items: persisted?.items || [
    {
      id: 'wk_001',
      department: '电气部',
      name: '电气设备维护作业授权',
      code: 'WK-E-001',
      type: '标准作业', // 标准作业/临时作业/专项作业 等
      status: '启用', // 启用/停用
      needAudit: true,
      description: '面向电气维护岗位的通用作业授权',
      // 工作条件
      conditions: {
        education: '大专及以上',
        minYears: 1,
      },
      // 课程配置（课程ID数组）
      courses: ['c_001', 'c_002'],
      // 技术授权（MTA ID数组）
      mtaAuths: ['m_001'],
      // 岗位条件（任意满足其一，多选）
      positionsAnyOf: ['p_001', 'p_002'],
      // 实践配置（参考 MTA 授权的结构）
      practices: {
        skillPractices: { minSelect: 1, minTimes: 1, items: [ { id: 'wksp_001', workItemId: 'w_004', isRequired: true } ] },
        operationPractices: { minSelect: 1, minTimes: 1, items: [ { id: 'wkop_001', workItemId: 'w_002', isRequired: false } ] },
      },
      // 工作范围（选择的工作范围ID数组）
      workScopes: ['1-1', '1-2'],
      updatedAt: '2025-01-01'
    }
  ]
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: worksStore.items }))
  } catch {}
}

export function listWorksByDept(dept) {
  return worksStore.items.filter(i => i.department === dept)
}

export function getWorkById(id) {
  return worksStore.items.find(i => i.id === id) || null
}

export function addWork(payload) {
  const id = `wk_${Math.random().toString(36).slice(2, 8)}`
  const record = { id, updatedAt: new Date().toISOString().slice(0,10), ...payload }
  worksStore.items.push(record)
  persist()
  return id
}

export function updateWork(id, patch) {
  const idx = worksStore.items.findIndex(i => i.id === id)
  if (idx === -1) return false
  worksStore.items[idx] = { ...worksStore.items[idx], ...patch, updatedAt: new Date().toISOString().slice(0,10) }
  persist()
  return true
}

export function removeWork(id) {
  const before = worksStore.items.length
  worksStore.items = worksStore.items.filter(i => i.id !== id)
  persist()
  return worksStore.items.length !== before
}
