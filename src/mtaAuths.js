import { reactive } from 'vue'

const STORAGE_KEY = 'mta_auths_store'

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const mtaAuthsStore = reactive({
  items: persisted?.items || [
    {
      id: 'm_001',
      department: '电气部',
      techName: '高压绝缘检测',
      projectName: '高压检测专项培训',
      code: 'MTA-E-001',
      hours: 16,
      level: '中级',
      targetAudience: '电气维护技师',
      instructors: '高级工程师1名',
      assessmentMethod: '面试+笔试',
      objective: '掌握高压绝缘检测流程与判定标准',
      materials: '内部教材V1.0',
      references: 'GB/T 16927.1',
      prerequisites: '具备电气基础理论知识，有1年以上电气维护工作经验，熟悉安全操作规程',
      trainingStrategy: '理论授课30% + 实操训练50% + 案例分析20%，采用小班制教学，每班不超过15人',
      courses: ['c_001', 'c_002'],
      skillPractices: { 
        minSelect: 1, 
        minTimes: 1, 
        items: [
          { id: 'p_001', workItemId: 'w_004', isRequired: true },
          { id: 'p_002', workItemId: 'w_005', isRequired: false }
        ] 
      },
      operationPractices: { 
        minSelect: 1, 
        minTimes: 1, 
        items: [
          { id: 'p_003', workItemId: 'w_001', isRequired: true },
          { id: 'p_004', workItemId: 'w_002', isRequired: false }
        ] 
      },
      updatedAt: '2025-01-01'
    }
  ]
})

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: mtaAuthsStore.items })) } catch {}
}

export function listMtaByDept(dept) {
  return mtaAuthsStore.items.filter(i => i.department === dept)
}

export function addMta(payload) {
  const id = `m_${Math.random().toString(36).slice(2, 8)}`
  const record = { id, updatedAt: new Date().toISOString().slice(0,10), ...payload }
  mtaAuthsStore.items.push(record)
  persist()
  return id
}

export function updateMta(id, patch) {
  const idx = mtaAuthsStore.items.findIndex(i => i.id === id)
  if (idx === -1) return false
  mtaAuthsStore.items[idx] = { ...mtaAuthsStore.items[idx], ...patch, updatedAt: new Date().toISOString().slice(0,10) }
  persist()
  return true
}
