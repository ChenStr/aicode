import { reactive } from 'vue'

const STORAGE_KEY = 'positions_store'

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const positionsStore = reactive({
  items: persisted?.items || [
    {
      id: 'p_001',
      name: '电气维护技师',
      parentPosition: '电气维护主管',
      level: '二级',
      department: '电气部',
      requireWorkPlan: true,
      description: '负责电气设备的日常维护和故障处理',
      mtaAuthorizations: {
        minSelect: 2,
        items: [
          { id: 'mta_001', mtaId: 'm_001', isRequired: true },
          { id: 'mta_002', mtaId: 'm_002', isRequired: false }
        ]
      },
      specialCertificates: {
        minSelect: 1,
        items: [
          { id: 'sc_001', certId: 'm_001', isRequired: true },
          { id: 'sc_002', certId: 'm_002', isRequired: false }
        ]
      },
      courses: ['c_001', 'c_002'],
      skillPractices: {
        minSelect: 1,
        minTimes: 2,
        items: [
          { id: 'sp_001', workItemId: 'w_004', isRequired: true },
          { id: 'sp_002', workItemId: 'w_005', isRequired: false }
        ]
      },
      updatedAt: '2025-01-01'
    },
    {
      id: 'p_002',
      name: '电气维护主管',
      parentPosition: '',
      level: '三级',
      department: '电气部',
      requireWorkPlan: true,
      description: '负责电气维护团队的管理和技术指导',
      mtaAuthorizations: {
        minSelect: 3,
        items: [
          { id: 'mta_003', mtaId: 'm_001', isRequired: true },
          { id: 'mta_004', mtaId: 'm_002', isRequired: true },
          { id: 'mta_005', mtaId: 'm_003', isRequired: false }
        ]
      },
      // 电气维护主管：当前无特种作业证书要求
      specialCertificates: { minSelect: 0, items: [] },
      courses: ['c_001', 'c_002', 'c_003'],
      skillPractices: {
        minSelect: 2,
        minTimes: 1,
        items: [
          { id: 'sp_003', workItemId: 'w_004', isRequired: true },
          { id: 'sp_004', workItemId: 'w_005', isRequired: true },
          { id: 'sp_005', workItemId: 'w_008', isRequired: false }
        ]
      },
      updatedAt: '2025-01-01'
    }
  ]
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: positionsStore.items }))
  } catch {}
}

// 启动时规范化：电气部岗位强制 requireWorkPlan = true（覆盖历史数据）
try {
  (positionsStore.items || []).forEach(p => {
    if (p && p.department === '电气部' && p.requireWorkPlan !== true) {
      p.requireWorkPlan = true
    }
  })
  persist()
} catch {}

export function listPositionsByDept(dept) {
  return positionsStore.items.filter(p => p.department === dept)
}

export function addPosition(payload) {
  const id = `p_${Math.random().toString(36).slice(2, 8)}`
  const record = { 
    id, 
    updatedAt: new Date().toISOString().slice(0,10), 
    ...payload 
  }
  positionsStore.items.push(record)
  persist()
  return id
}

export function updatePosition(id, patch) {
  const idx = positionsStore.items.findIndex(p => p.id === id)
  if (idx === -1) return false
  positionsStore.items[idx] = { 
    ...positionsStore.items[idx], 
    ...patch, 
    updatedAt: new Date().toISOString().slice(0,10) 
  }
  persist()
  return true
}

export function removePosition(id) {
  const before = positionsStore.items.length
  positionsStore.items = positionsStore.items.filter(p => p.id !== id)
  persist()
  return positionsStore.items.length !== before
}