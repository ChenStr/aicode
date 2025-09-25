import { reactive } from 'vue'
import { workProcessesStore } from './workProcesses'

const STORAGE_KEY = 'work_certificates_store'

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const workCertificatesStore = reactive({
  items: persisted?.items || [
    {
      id: 'wc_001',
      processId: 'wp_001',
      workId: 'wk_001',
      workName: '电气设备维护作业授权',
      applicantId: 'u_001',
      applicantName: '刘备',
      department: '电气部',
      certificateTemplateId: 'wct_001',
      certificateTemplateName: '电气设备维护作业授权证书模版',
      certificateNumber: 'WC-2024-001',
      issuedAt: '2024-01-15 16:00:00',
      expireAt: '2025-01-15 16:00:00',
      status: 'valid', // valid, expired, revoked
      content: '【工作授权证书】\n刘备 同志已完成电气设备维护作业授权相关培训和实践，经考核合格，现授予工作授权。\n\n授权内容：电气设备维护作业授权\n授权部门：电气部\n签发日期：2024-01-15\n有效期至：2025-01-15\n\n特此证明',
      backgroundUrl: '',
      createdAt: '2024-01-15 16:00:00',
      updatedAt: '2024-01-15 16:00:00'
    }
  ]
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: workCertificatesStore.items }))
  } catch {}
}

// 获取所有证书
export function getAllWorkCertificates() {
  return workCertificatesStore.items
}

// 根据ID获取证书
export function getWorkCertificateById(id) {
  return workCertificatesStore.items.find(c => c.id === id) || null
}

// 根据申请人ID获取证书
export function getWorkCertificatesByApplicant(applicantId) {
  return workCertificatesStore.items.filter(c => c.applicantId === applicantId)
}

// 根据流程ID获取证书
export function getWorkCertificateByProcessId(processId) {
  return workCertificatesStore.items.find(c => c.processId === processId) || null
}

// 颁发证书
export function issueWorkCertificate(processId, certificateTemplateId, templateData) {
  const process = workProcessesStore.items.find(p => p.id === processId)
  if (!process) return false
  
  const id = `wc_${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  
  // 生成证书编号
  const year = new Date().getFullYear()
  const count = workCertificatesStore.items.filter(c => c.certificateNumber.startsWith(`WC-${year}`)).length + 1
  const certificateNumber = `WC-${year}-${count.toString().padStart(3, '0')}`
  
  // 生成证书内容
  const content = generateCertificateContent(templateData, {
    applicantName: process.applicantName,
    workName: process.workName,
    department: process.department,
    issuedAt: now,
    expireAt: process.certificateExpireAt
  })
  
  const certificate = {
    id,
    processId,
    workId: process.workId,
    workName: process.workName,
    applicantId: process.applicantId,
    applicantName: process.applicantName,
    department: process.department,
    certificateTemplateId,
    certificateTemplateName: templateData.name,
    certificateNumber,
    issuedAt: now,
    expireAt: process.certificateExpireAt,
    status: 'valid',
    content,
    backgroundUrl: templateData.backgroundUrl || '',
    createdAt: now,
    updatedAt: now
  }
  
  workCertificatesStore.items.push(certificate)
  persist()
  return id
}

// 生成证书内容
function generateCertificateContent(template, data) {
  let content = template.contentTemplate || ''
  
  // 替换变量
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    content = content.replace(regex, data[key] || '')
  })
  
  return content
}

// 撤销证书
export function revokeWorkCertificate(certificateId, reason = '') {
  const idx = workCertificatesStore.items.findIndex(c => c.id === certificateId)
  if (idx === -1) return false
  
  workCertificatesStore.items[idx] = {
    ...workCertificatesStore.items[idx],
    status: 'revoked',
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  persist()
  return true
}

// 获取证书状态文本
export function getCertificateStatusText(status) {
  const map = {
    valid: '有效',
    expired: '已过期',
    revoked: '已撤销'
  }
  return map[status] || status
}

// 获取证书状态类型
export function getCertificateStatusType(status) {
  const map = {
    valid: 'success',
    expired: 'warning',
    revoked: 'danger'
  }
  return map[status] || 'info'
}
