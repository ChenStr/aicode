import { reactive } from 'vue'

// 岗位证书模版：{ id, department, positionId, name, description, backgroundUrl, defaultExpireYears, contentTemplate, variables }
const STORAGE_KEY = 'position_cert_templates_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const positionCertTemplatesStore = reactive({
  templates: persisted?.templates || []
})

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ templates: positionCertTemplatesStore.templates })) } catch {}
}

// 数据迁移与规范
;(function migrateEnsureDefaults() {
  try {
    let changed = false
    positionCertTemplatesStore.templates.forEach(t => {
      if (!t.id || typeof t.id !== 'string' || !t.id.trim()) {
        t.id = `pct_${Math.random().toString(36).slice(2,8)}`
        changed = true
      }
      if (typeof t.defaultExpireYears !== 'number' || t.defaultExpireYears <= 0) {
        t.defaultExpireYears = 5
        changed = true
      }
      if (!t.variables) {
        t.variables = [
          { key: 'applicantName', label: '获取人', type: 'built_in' },
          { key: 'issuedAt', label: '签发时间', type: 'built_in' },
          { key: 'expireAt', label: '有效期至', type: 'built_in' },
          { key: 'positionName', label: '岗位名称', type: 'built_in' }
        ]
        changed = true
      }
    })
    if (changed) persist()
  } catch {}
})()

export function listTemplatesByDepartment(department) {
  return positionCertTemplatesStore.templates.filter(t => t.department === department)
}

export function listTemplatesByPosition(department, positionId) {
  return positionCertTemplatesStore.templates.filter(t => t.department === department && t.positionId === positionId)
}

export function createTemplate(payload) {
  const id = `pct_${Math.random().toString(36).slice(2,8)}`
  const record = {
    id,
    name: '未命名模版',
    description: '',
    backgroundUrl: '',
    defaultExpireYears: 5,
    contentTemplate: '',
    variables: [
      { key: 'applicantName', label: '获取人', type: 'built_in' },
      { key: 'issuedAt', label: '签发时间', type: 'built_in' },
      { key: 'expireAt', label: '有效期至', type: 'built_in' },
      { key: 'positionName', label: '岗位名称', type: 'built_in' }
    ],
    ...payload
  }
  positionCertTemplatesStore.templates.unshift(record)
  persist()
  return id
}

export function updateTemplate(id, patch) {
  const idx = positionCertTemplatesStore.templates.findIndex(t => t.id === id)
  if (idx === -1) return false
  positionCertTemplatesStore.templates[idx] = { ...positionCertTemplatesStore.templates[idx], ...patch }
  persist()
  return true
}

export function removeTemplate(id) {
  const idx = positionCertTemplatesStore.templates.findIndex(t => t.id === id)
  if (idx === -1) return false
  positionCertTemplatesStore.templates.splice(idx, 1)
  persist()
  return true
}


