import { reactive } from 'vue'

// 授权证书模版：{ id, department, mtaId, name, description, backgroundUrl, textStyles, defaultExpireYears, contentTemplate, variables }
// variables 示例：[{ key:'applicantName', label:'获取人', type:'built_in' }, { key:'issuedAt', label:'签发时间', type:'built_in' }, { key:'expireAt', label:'有效期至', type:'built_in' }, ...]
const STORAGE_KEY = 'mta_cert_templates_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const certTemplatesStore = reactive({
  templates: persisted?.templates || []
})

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ templates: certTemplatesStore.templates })) } catch {}
}

// 数据迁移：为缺失 id 的模版补全 id，并规范默认字段
;(function migrateTemplatesEnsureId() {
  try {
    let changed = false
    certTemplatesStore.templates.forEach((t, idx) => {
      if (!t.id || typeof t.id !== 'string' || !t.id.trim()) {
        t.id = `ct_${Math.random().toString(36).slice(2,8)}`
        changed = true
      }
      if (!t.variables) {
        t.variables = [
          { key: 'applicantName', label: '获取人', type: 'built_in' },
          { key: 'issuedAt', label: '签发时间', type: 'built_in' },
          { key: 'expireAt', label: '有效期至', type: 'built_in' },
          { key: 'mtaName', label: '授权名称', type: 'built_in' }
        ]
        changed = true
      }
      if (typeof t.defaultExpireYears !== 'number' || t.defaultExpireYears <= 0) {
        t.defaultExpireYears = 5
        changed = true
      }
    })
    if (changed) persist()
  } catch {}
})()

export function listTemplatesByDepartment(department) {
  return certTemplatesStore.templates.filter(t => t.department === department)
}

export function listTemplatesByMta(department, mtaId) {
  return certTemplatesStore.templates.filter(t => t.department === department && t.mtaId === mtaId)
}

export function createTemplate(payload) {
  const id = `ct_${Math.random().toString(36).slice(2,8)}`
  const record = {
    id,
    name: '未命名模版',
    description: '',
    backgroundUrl: '',
    textStyles: {},
    defaultExpireYears: 5,
    contentTemplate: '',
    variables: [
      { key: 'applicantName', label: '获取人', type: 'built_in' },
      { key: 'issuedAt', label: '签发时间', type: 'built_in' },
      { key: 'expireAt', label: '有效期至', type: 'built_in' }
    ],
    ...payload
  }
  certTemplatesStore.templates.unshift(record)
  persist()
  return id
}

export function updateTemplate(id, patch) {
  const idx = certTemplatesStore.templates.findIndex(t => t.id === id)
  if (idx === -1) return false
  certTemplatesStore.templates[idx] = { ...certTemplatesStore.templates[idx], ...patch }
  persist()
  return true
}

export function removeTemplate(id) {
  const idx = certTemplatesStore.templates.findIndex(t => t.id === id)
  if (idx === -1) return false
  certTemplatesStore.templates.splice(idx, 1)
  persist()
  return true
}
