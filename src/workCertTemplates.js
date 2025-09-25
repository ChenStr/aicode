import { reactive } from 'vue'

const STORAGE_KEY = 'work_cert_templates_store'

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const workCertTemplatesStore = reactive({
  items: persisted?.items || [
    {
      id: 'wct_001',
      department: '电气部',
      workId: 'wk_001',
      name: '电气设备维护作业授权证书模版',
      description: '电气设备维护作业授权证书模版',
      backgroundUrl: '',
      defaultExpireYears: 3,
      contentTemplate: '【工作授权证书】\n{{applicantName}} 同志已完成{{workName}}相关培训和实践，经考核合格，现授予工作授权。\n\n授权内容：{{workName}}\n授权部门：{{department}}\n签发日期：{{issuedAt}}\n有效期至：{{expireAt}}\n\n特此证明',
      variables: [
        { key: 'applicantName', label: '申请人姓名', type: 'built_in' },
        { key: 'issuedAt', label: '签发时间', type: 'built_in' },
        { key: 'expireAt', label: '有效期至', type: 'built_in' },
        { key: 'workName', label: '工作授权名称', type: 'built_in' },
        { key: 'department', label: '部门', type: 'built_in' }
      ],
      createdAt: '2024-01-01 09:00:00',
      updatedAt: '2024-01-01 09:00:00'
    }
  ]
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: workCertTemplatesStore.items }))
  } catch {}
}

// 根据部门获取模版列表
export function listTemplatesByDepartment(department) {
  return workCertTemplatesStore.items.filter(t => t.department === department)
}

// 根据ID获取模版
export function getTemplateById(id) {
  return workCertTemplatesStore.items.find(t => t.id === id) || null
}

// 创建模版
export function createTemplate(payload) {
  const id = `wct_${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  
  const record = {
    id,
    department: payload.department,
    workId: payload.workId,
    name: payload.name,
    description: payload.description || '',
    backgroundUrl: payload.backgroundUrl || '',
    defaultExpireYears: payload.defaultExpireYears || 3,
    contentTemplate: payload.contentTemplate || '',
    variables: payload.variables || [],
    createdAt: now,
    updatedAt: now
  }
  
  workCertTemplatesStore.items.push(record)
  persist()
  return id
}

// 更新模版
export function updateTemplate(id, updates) {
  const idx = workCertTemplatesStore.items.findIndex(t => t.id === id)
  if (idx === -1) return false
  
  workCertTemplatesStore.items[idx] = {
    ...workCertTemplatesStore.items[idx],
    ...updates,
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  persist()
  return true
}

// 删除模版
export function removeTemplate(id) {
  const before = workCertTemplatesStore.items.length
  workCertTemplatesStore.items = workCertTemplatesStore.items.filter(t => t.id !== id)
  persist()
  return workCertTemplatesStore.items.length !== before
}
