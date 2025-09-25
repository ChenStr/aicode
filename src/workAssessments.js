import { reactive } from 'vue'
import { getWorkById } from './works'
import { updateWorkProcessStatus } from './workProcesses'

const STORAGE_KEY = 'work_assessments_store'

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const workAssessmentsStore = reactive({
  items: persisted?.items || [
    {
      id: 'wa_001',
      processId: 'wp_001', // 关联的工作授权申请流程ID
      workId: 'wk_001', // 关联的工作定义ID
      applicantId: 'u_001',
      applicantName: '刘备',
      department: '电气部',
      education: '本科',
      workYears: 3,
      assessorIds: ['u_004', 'u_005'], // 考核小组成员ID列表
      assessmentDate: '2024-01-15',
      assessmentContent: '对申请人进行电气设备维护相关技能考核，包括理论知识和实际操作能力。申请人能够熟练操作电气设备，具备基本的故障诊断能力。',
      assessmentEvaluation: '申请人理论知识扎实，实际操作熟练，能够独立完成电气设备维护工作。在考核过程中表现出良好的学习能力和安全意识。',
      improvementSuggestions: '建议加强新技术学习，提高故障诊断能力。可以参加更多专业培训课程。',
      conclusion: 'suggest_authorize', // suggest_authorize | failed
      status: 'completed', // pending | in_progress | completed
      signatures: [
        { assessorId: 'u_004', assessorName: '赵云', signedAt: '2024-01-15 14:30:00' },
        { assessorId: 'u_005', assessorName: '马超', signedAt: '2024-01-15 15:00:00' }
      ],
      createdAt: '2024-01-15 09:00:00',
      updatedAt: '2024-01-15 15:00:00'
    },
    {
      id: 'wa_002',
      processId: 'wp_002',
      workId: 'wk_001', // 使用相同的工作定义
      applicantId: 'u_001',
      applicantName: '刘备',
      department: '电气部',
      education: '本科',
      workYears: 3,
      assessorIds: ['u_003', 'u_006'],
      assessmentDate: '2024-01-20',
      assessmentContent: '对申请人进行高压设备操作技能考核，包括安全操作规程、设备维护和应急处理能力。',
      assessmentEvaluation: '申请人在高压设备操作方面表现良好，安全意识强，能够按照规程进行操作。',
      improvementSuggestions: '建议加强高压设备故障处理能力，多参与实际维修工作。',
      conclusion: 'suggest_authorize',
      status: 'in_progress',
      signatures: [
        { assessorId: 'u_003', assessorName: '张飞', signedAt: '2024-01-20 10:30:00' }
      ],
      createdAt: '2024-01-20 09:00:00',
      updatedAt: '2024-01-20 10:30:00'
    },
    {
      id: 'wa_003',
      processId: 'wp_003',
      workId: 'wk_001', // 使用相同的工作定义
      applicantId: 'u_002',
      applicantName: '关羽',
      department: '电气部',
      education: '硕士',
      workYears: 8,
      assessorIds: ['u_004', 'u_005', 'u_006'],
      assessmentDate: '2024-01-18',
      assessmentContent: '对申请人进行电气系统设计能力考核，包括系统分析、设计计算和图纸绘制能力。',
      assessmentEvaluation: '申请人具备扎实的电气理论基础，设计思路清晰，能够独立完成复杂电气系统设计。',
      improvementSuggestions: '建议关注新技术发展，学习智能化电气系统设计。',
      conclusion: 'suggest_authorize',
      status: 'completed',
      signatures: [
        { assessorId: 'u_004', assessorName: '赵云', signedAt: '2024-01-18 16:00:00' },
        { assessorId: 'u_005', assessorName: '马超', signedAt: '2024-01-18 16:15:00' },
        { assessorId: 'u_006', assessorName: '黄忠', signedAt: '2024-01-18 16:30:00' }
      ],
      createdAt: '2024-01-18 09:00:00',
      updatedAt: '2024-01-18 16:30:00'
    },
    {
      id: 'wa_004',
      processId: 'wp_004',
      workId: 'wk_001', // 使用相同的工作定义
      applicantId: 'u_001',
      applicantName: '刘备',
      department: '电气部',
      education: '本科',
      workYears: 3,
      assessorIds: ['u_003', 'u_004'],
      assessmentDate: '2024-01-22',
      assessmentContent: '',
      assessmentEvaluation: '',
      improvementSuggestions: '',
      conclusion: '',
      status: 'pending',
      signatures: [],
      createdAt: '2024-01-22 09:00:00',
      updatedAt: '2024-01-22 09:00:00'
    }
  ]
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ assessments: workAssessmentsStore.assessments }))
  } catch {}
}

// 根据流程ID创建工作考核
export function createWorkAssessment(payload) {
  const id = `wa_${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  
  const record = {
    id,
    processId: payload.processId,
    workId: payload.workId,
    applicantId: payload.applicantId,
    applicantName: payload.applicantName,
    department: payload.department,
    education: payload.education,
    workYears: payload.workYears,
    assessorIds: payload.assessorIds || [],
    assessmentDate: payload.assessmentDate || new Date().toISOString().slice(0, 10),
    assessmentContent: '',
    assessmentEvaluation: '',
    improvementSuggestions: '',
    conclusion: '',
    status: 'pending',
    signatures: [],
    createdAt: now,
    updatedAt: now
  }
  
  workAssessmentsStore.items.push(record)
  persist()
  return id
}

// 更新工作考核
export function updateWorkAssessment(id, updates) {
  const idx = workAssessmentsStore.items.findIndex(item => item.id === id)
  if (idx === -1) return false
  
  workAssessmentsStore.items[idx] = {
    ...workAssessmentsStore.items[idx],
    ...updates,
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  persist()
  return true
}

// 根据流程ID获取工作考核
export function getWorkAssessmentByProcessId(processId) {
  return workAssessmentsStore.items.find(item => item.processId === processId)
}

// 获取所有工作考核
export function getAllWorkAssessments() {
  return workAssessmentsStore.items
}

// 根据考核人ID获取相关考核
export function getWorkAssessmentsByAssessor(assessorId) {
  return workAssessmentsStore.items.filter(item => 
    item.assessorIds.includes(assessorId)
  )
}

// 根据用户权限获取考核数据
export function getWorkAssessmentsByPermission(currentUser) {
  const { role, department, id } = currentUser
  
  // 普通员工只能查看自己的考核
  if (role === 'employee') {
    return workAssessmentsStore.items.filter(item => item.applicantId === id)
  }
  
  // 培训工程师、科长、部门经理可以查看本部门的所有考核
  if (['training_admin', 'section_chief', 'dept_manager'].includes(role)) {
    return workAssessmentsStore.items.filter(item => item.department === department)
  }
  
  // 考核组成员可以查看自己参与的考核
  if (role === 'assessor') {
    return workAssessmentsStore.items.filter(item => 
      item.assessorIds.includes(id) || item.applicantId === id
    )
  }
  
  // 默认返回空数组
  return []
}

// 获取工作授权名称
export function getWorkAuthorizationName(workId) {
  const work = getWorkById(workId)
  return work ? work.name : '未知工作授权'
}

// 添加考核人签名
export function addAssessmentSignature(assessmentId, assessorId, assessorName) {
  const assessment = workAssessmentsStore.items.find(item => item.id === assessmentId)
  if (!assessment) return false
  
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  
  // 检查是否已签名
  const existingSignature = assessment.signatures.find(sig => sig.assessorId === assessorId)
  if (existingSignature) {
    existingSignature.signedAt = now
  } else {
    assessment.signatures.push({
      assessorId,
      assessorName,
      signedAt: now
    })
  }
  
  // 检查是否所有考核人都已签名
  const allSigned = assessment.assessorIds.every(id => 
    assessment.signatures.some(sig => sig.assessorId === id)
  )
  
  if (allSigned) {
    assessment.status = 'completed'
    
    // 更新工作流程状态
    updateWorkProcessStatus(assessment.processId, {
      status: 'section_chief_pending',
      assessmentId: assessment.id,
      assessmentResult: assessment.conclusion
    })
  }
  
  assessment.updatedAt = now
  persist()
  return true
}
