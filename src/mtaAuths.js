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
    ,
    {
      id: 'm_002',
      department: '电气部',
      techName: '配电柜检修',
      projectName: '配电柜检修专项培训',
      code: 'MTA-E-002',
      hours: 12,
      level: '初级',
      targetAudience: '电气维护技师',
      instructors: '工程师1名',
      assessmentMethod: '面试',
      objective: '掌握配电柜检修流程与关键点',
      materials: '内部教材V1.1',
      references: '企业标准Q/PD-02',
      prerequisites: '了解配电系统基础',
      trainingStrategy: '理论+实操',
      courses: ['c_001'],
      skillPractices: { minSelect: 1, minTimes: 1, items: [] },
      operationPractices: { minSelect: 0, minTimes: 0, items: [] },
      updatedAt: '2025-01-01'
    }
    ,
    {
      id: 'm_003',
      department: '电气部',
      techName: '继电保护测试',
      projectName: '继电保护与测试技术',
      code: 'MTA-E-003',
      hours: 20,
      level: '高级',
      targetAudience: '电气维护主管',
      instructors: '高级工程师2名',
      assessmentMethod: '面试+笔试',
      objective: '掌握继电保护的测试与故障分析',
      materials: '继保教材V2.0',
      references: 'GB/T 14285',
      prerequisites: '两年以上电气维护经验',
      trainingStrategy: '案例分析+实操演练',
      courses: ['c_002', 'c_003'],
      skillPractices: { minSelect: 1, minTimes: 1, items: [] },
      operationPractices: { minSelect: 0, minTimes: 0, items: [] },
      updatedAt: '2025-01-01'
    }
  ]
})

// 确保本地已有数据时也能补齐缺失的种子数据（避免旧localStorage覆盖新增初始化数据）
const seedItems = [
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
    skillPractices: { minSelect: 1, minTimes: 1, items: [ { id: 'p_001', workItemId: 'w_004', isRequired: true }, { id: 'p_002', workItemId: 'w_005', isRequired: false } ] },
    operationPractices: { minSelect: 1, minTimes: 1, items: [ { id: 'p_003', workItemId: 'w_001', isRequired: true }, { id: 'p_004', workItemId: 'w_002', isRequired: false } ] },
    updatedAt: '2025-01-01'
  },
  {
    id: 'm_002',
    department: '电气部',
    techName: '配电柜检修',
    projectName: '配电柜检修专项培训',
    code: 'MTA-E-002',
    hours: 12,
    level: '初级',
    targetAudience: '电气维护技师',
    instructors: '工程师1名',
    assessmentMethod: '面试',
    objective: '掌握配电柜检修流程与关键点',
    materials: '内部教材V1.1',
    references: '企业标准Q/PD-02',
    prerequisites: '了解配电系统基础',
    trainingStrategy: '理论+实操',
    courses: ['c_001'],
    skillPractices: { minSelect: 1, minTimes: 1, items: [] },
    operationPractices: { minSelect: 0, minTimes: 0, items: [] },
    updatedAt: '2025-01-01'
  },
  {
    id: 'm_003',
    department: '电气部',
    techName: '继电保护测试',
    projectName: '继电保护与测试技术',
    code: 'MTA-E-003',
    hours: 20,
    level: '高级',
    targetAudience: '电气维护主管',
    instructors: '高级工程师2名',
    assessmentMethod: '面试+笔试',
    objective: '掌握继电保护的测试与故障分析',
    materials: '继保教材V2.0',
    references: 'GB/T 14285',
    prerequisites: '两年以上电气维护经验',
    trainingStrategy: '案例分析+实操演练',
    courses: ['c_002', 'c_003'],
    skillPractices: { minSelect: 1, minTimes: 1, items: [] },
    operationPractices: { minSelect: 0, minTimes: 0, items: [] },
    updatedAt: '2025-01-01'
  }
]

;(function ensureSeedData() {
  const existingIds = new Set(mtaAuthsStore.items.map(i => i.id))
  let changed = false
  for (const seed of seedItems) {
    if (!existingIds.has(seed.id)) {
      mtaAuthsStore.items.push(seed)
      changed = true
    }
  }
  if (changed) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: mtaAuthsStore.items })) } catch {}
  }
})()

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
