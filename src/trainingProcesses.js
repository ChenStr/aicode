import { reactive } from 'vue'
import { USERS } from './user.js'
import { coursesStore } from './courses.js'

const STORAGE_KEY = 'training_processes_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

// 默认测试数据
const defaultProcesses = [
  {
    id: 'tp_001',
    type: '培训项目等效',
    initiatorId: 'u_001',
    initiatorName: '刘备',
    initiatorDepartment: '电气部',
    initiatorPosition: '电气工程师',
    status: '待审查', // 待审查、审查中、待部门经理批准、待培训部批准、已完成、已拒绝
    createdAt: '2024-01-15 09:00',
    submittedAt: '2024-01-15 09:30',
    equivalentItems: [
      {
        id: 'ei_001',
        courseId: 'c_005',
        courseName: '电气设备维护实操',
        equivalentReason: '已通过相关技能培训，具备同等能力'
      }
    ],
    signatures: {
      applicant: {
        name: '刘备',
        date: '2024-01-15 09:30',
        signed: true
      },
      trainingEngineer: {
        name: '',
        date: '',
        signed: false
      },
      deptManager: {
        name: '',
        date: '',
        signed: false
      },
      trainingDeptManager: {
        name: '',
        date: '',
        signed: false
      }
    },
    currentStep: 'trainingEngineer', // applicant, trainingEngineer, deptManager, trainingDeptManager
    comments: []
  },
  {
    id: 'tp_002',
    type: '培训项目等效',
    initiatorId: 'u_004',
    initiatorName: '赵云',
    initiatorDepartment: '电气部',
    initiatorPosition: '电气工程师',
    status: '待部门经理批准',
    createdAt: '2024-01-16 10:00',
    submittedAt: '2024-01-16 10:15',
    equivalentItems: [
      {
        id: 'ei_002',
        courseId: 'c_005',
        courseName: '电气设备维护实操',
        equivalentReason: '具有相关工作经验，技能水平达标'
      }
    ],
    signatures: {
      applicant: {
        name: '赵云',
        date: '2024-01-16 10:15',
        signed: true
      },
      trainingEngineer: {
        name: '张飞',
        date: '2024-01-16 14:30',
        signed: true
      },
      deptManager: {
        name: '',
        date: '',
        signed: false
      },
      trainingDeptManager: {
        name: '',
        date: '',
        signed: false
      }
    },
    currentStep: 'deptManager',
    comments: [
      {
        id: 'c_001',
        step: 'trainingEngineer',
        comment: '技能水平符合要求，同意等效申请',
        commenter: '张飞',
        date: '2024-01-16 14:30'
      }
    ]
  }
]

export const trainingProcessesStore = reactive({
  processes: persisted?.processes || defaultProcesses
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      processes: trainingProcessesStore.processes
    }))
  } catch {}
}

// 获取用户可查看的流程列表
export function getProcessesByUser(userId) {
  const user = USERS.find(u => u.id === userId)
  if (!user) return []
  
  // 培训部部门经理可以查看所有流程
  if (user.role === '培训部部门经理') {
    return trainingProcessesStore.processes
  }
  
  // 培训工程师、部门经理可以查看本部门所有流程
  if (user.role === '培训工程师' || user.role === '部门经理') {
    return trainingProcessesStore.processes.filter(p => p.initiatorDepartment === user.department)
  }
  
  // 普通员工只能查看自己发起的流程
  return trainingProcessesStore.processes.filter(p => p.initiatorId === userId)
}

// 获取流程详情
export function getProcessById(id) {
  return trainingProcessesStore.processes.find(p => p.id === id) || null
}

// 创建新流程
export function createProcess(processData) {
  const newProcess = {
    id: `tp_${Date.now()}`,
    type: processData.type,
    initiatorId: processData.initiatorId,
    initiatorName: processData.initiatorName,
    initiatorDepartment: processData.initiatorDepartment,
    initiatorPosition: processData.initiatorPosition,
    status: '待审查',
    createdAt: new Date().toISOString().slice(0, 16),
    submittedAt: '',
    equivalentItems: processData.equivalentItems || [],
    signatures: {
      applicant: {
        name: processData.initiatorName,
        date: '',
        signed: false
      },
      trainingEngineer: {
        name: '',
        date: '',
        signed: false
      },
      deptManager: {
        name: '',
        date: '',
        signed: false
      },
      trainingDeptManager: {
        name: '',
        date: '',
        signed: false
      }
    },
    currentStep: 'applicant',
    comments: []
  }
  
  trainingProcessesStore.processes.unshift(newProcess)
  persist()
  return newProcess
}

// 提交流程
export function submitProcess(processId) {
  const process = trainingProcessesStore.processes.find(p => p.id === processId)
  if (!process) return false
  
  process.status = '待审查'
  process.submittedAt = new Date().toISOString().slice(0, 16)
  process.signatures.applicant.signed = true
  process.signatures.applicant.date = new Date().toISOString().slice(0, 16)
  process.currentStep = 'trainingEngineer'
  
  persist()
  return true
}

// 培训工程师审查
export function reviewByTrainingEngineer(processId, comment, approved) {
  const process = trainingProcessesStore.processes.find(p => p.id === processId)
  if (!process) return false
  
  const user = USERS.find(u => u.role === '培训工程师' && u.department === process.initiatorDepartment)
  if (!user) return false
  
  process.signatures.trainingEngineer.name = user.name
  process.signatures.trainingEngineer.date = new Date().toISOString().slice(0, 16)
  process.signatures.trainingEngineer.signed = true
  
  process.comments.push({
    id: `c_${Date.now()}`,
    step: 'trainingEngineer',
    comment: comment,
    commenter: user.name,
    date: new Date().toISOString().slice(0, 16)
  })
  
  if (approved) {
    process.status = '待部门经理批准'
    process.currentStep = 'deptManager'
  } else {
    process.status = '已拒绝'
    process.currentStep = 'rejected'
  }
  
  persist()
  return true
}

// 部门经理批准
export function approveByDeptManager(processId, comment, approved) {
  const process = trainingProcessesStore.processes.find(p => p.id === processId)
  if (!process) return false
  
  const user = USERS.find(u => u.role === '部门经理' && u.department === process.initiatorDepartment)
  if (!user) return false
  
  process.signatures.deptManager.name = user.name
  process.signatures.deptManager.date = new Date().toISOString().slice(0, 16)
  process.signatures.deptManager.signed = true
  
  process.comments.push({
    id: `c_${Date.now()}`,
    step: 'deptManager',
    comment: comment,
    commenter: user.name,
    date: new Date().toISOString().slice(0, 16)
  })
  
  if (approved) {
    process.status = '待培训部批准'
    process.currentStep = 'trainingDeptManager'
  } else {
    process.status = '已拒绝'
    process.currentStep = 'rejected'
  }
  
  persist()
  return true
}

// 培训部部门经理批准
export function approveByTrainingDeptManager(processId, comment, approved) {
  const process = trainingProcessesStore.processes.find(p => p.id === processId)
  if (!process) return false
  
  const user = USERS.find(u => u.role === '培训部部门经理')
  if (!user) return false
  
  process.signatures.trainingDeptManager.name = user.name
  process.signatures.trainingDeptManager.date = new Date().toISOString().slice(0, 16)
  process.signatures.trainingDeptManager.signed = true
  
  process.comments.push({
    id: `c_${Date.now()}`,
    step: 'trainingDeptManager',
    comment: comment,
    commenter: user.name,
    date: new Date().toISOString().slice(0, 16)
  })
  
  if (approved) {
    process.status = '已完成'
    process.currentStep = 'completed'
  } else {
    process.status = '已拒绝'
    process.currentStep = 'rejected'
  }
  
  persist()
  return true
}

// 获取在岗培训课程列表
export function getOnJobTrainingCourses() {
  return coursesStore.courses.filter(course => course.type === '在岗培训')
}
