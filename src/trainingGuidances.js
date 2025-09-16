import { reactive } from 'vue'
import { USERS } from './user'

// 简易部门列表（从用户中聚合）
export const DEPARTMENTS = Array.from(new Set(USERS.map(u => u.department)))

// 流程阶段与状态映射
export const FLOW_STAGES = [
  'employee_fill',
  'mentor_sign',
  'trainer_review',
  'manager_sign',
  'completed'
]

export function getStageLabel(stage) {
  const map = {
    employee_fill: '员工填写并签字',
    mentor_sign: '师傅签字',
    trainer_review: '培训工程师审核签字',
    manager_sign: '部门经理签字',
    completed: '已完成'
  }
  return map[stage] || stage
}

export function getStatusLabel(stage) {
  const map = {
    employee_fill: '待员工填写',
    mentor_sign: '待师傅签字',
    trainer_review: '待培训工程师审核',
    manager_sign: '待部门经理签字',
    completed: '已完成'
  }
  return map[stage] || stage
}

function createId() {
  return 'tg_' + Math.random().toString(36).slice(2, 8)
}

// 数据结构：
// {
//   id, receiverId, department, plans: [ { dateRange: [start,end], courseIds:[], responsibleDept:'' } ],
//   basicInfo: { name, gender, birthday, education, employeeNo, university, major, positionDirection, employeeCategory },
//   currentStage, signatures: { employee:{signedAt:null}, mentor:{signedAt:null}, trainer:{signedAt:null}, manager:{signedAt:null} }
// }

export const trainingGuidancesStore = reactive({
  items: []
})

export function getTrainingGuidanceById(id) {
  return trainingGuidancesStore.items.find(it => it.id === id) || null
}

// 模拟：通过接收人ID“查询”其他系统信息
export function fetchUserProfileById(userId) {
  const u = USERS.find(x => x.id === userId)
  if (!u) return null
  // 用固定模拟数据，真实系统应调用接口
  return {
    name: u.name,
    gender: '男',
    birthday: '1995-01-01',
    education: '本科',
    employeeNo: 'E' + userId.slice(-3).toUpperCase(),
    university: 'XX大学',
    major: '电气工程',
    positionDirection: '电气维护',
    employeeCategory: '社招人员3年工作经验'
  }
}

function createSignatureImage(name) {
  const text = name || '签名'
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='80'>`+
    `<rect width='100%' height='100%' fill='white'/>`+
    `<text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='28' font-family='"Zapfino", "Brush Script MT", "KaiTi", serif' fill='#111'>${text}</text>`+
    `</svg>`
  )
  return `data:image/svg+xml;charset=UTF-8,${svg}`
}

export function createTrainingGuidances({ creatorId, receiverIds, plans }) {
  const creator = USERS.find(u => u.id === creatorId)
  const created = []
  for (const rid of receiverIds) {
    const profile = fetchUserProfileById(rid)
    const receiver = USERS.find(u => u.id === rid)
    const item = {
      id: createId(),
      receiverId: rid,
      department: receiver?.department || creator?.department || '-',
      plans: plans.map(p => ({
        dateRange: p.dateRange ? [...p.dateRange] : ['', ''],
        courseIds: Array.isArray(p.courseIds) ? [...p.courseIds] : [],
        responsibleDept: p.responsibleDept || (receiver?.department || '-')
      })),
      basicInfo: profile,
      currentStage: 'employee_fill',
      signatures: {
        employee: { signedAt: null, signedBy: '', signedImage: '' },
        mentor: { signedAt: null, signedBy: '', signedImage: '' },
        trainer: { signedAt: null, signedBy: '', signedImage: '' },
        manager: { signedAt: null, signedBy: '', signedImage: '' }
      }
    }
    trainingGuidancesStore.items.unshift(item)
    created.push(item)
  }
  return created
}

export function listTrainingGuidancesForUser(user) {
  if (!user) return []
  const role = user.role
  if (role === 'employee') {
    return trainingGuidancesStore.items.filter(it => it.receiverId === user.id)
  }
  if (role === 'training_admin' || role === 'dept_manager' || role === 'section_chief') {
    return trainingGuidancesStore.items.filter(it => it.department === user.department)
  }
  return []
}

export function advanceGuidanceStage(item, actorRole, actorUser) {
  // 严格校验当前阶段允许的角色
  const allow = {
    employee_fill: 'employee',
    mentor_sign: 'mentor',
    trainer_review: 'training_admin',
    manager_sign: 'dept_manager'
  }
  const idx = FLOW_STAGES.indexOf(item.currentStage)
  if (idx < 0 || item.currentStage === 'completed') return false

  // 角色映射：师傅不在用户角色列表，用特殊身份标识
  if (allow[item.currentStage] === 'mentor') {
    // 简化：部门内任意培训工程师可代为确认“师傅”签字
    // 实际应绑定具体师傅ID
    if (actorRole !== 'training_admin') return false
    item.signatures.mentor.signedAt = new Date().toISOString().slice(0, 10)
    item.signatures.mentor.signedBy = (actorUser?.name || '培训工程师') + '（代师傅）'
    item.signatures.mentor.signedImage = createSignatureImage(actorUser?.name || '师傅')
  } else {
    if (allow[item.currentStage] !== actorRole) return false
    const key = actorRole === 'employee' ? 'employee' : actorRole === 'training_admin' ? 'trainer' : actorRole === 'dept_manager' ? 'manager' : null
    if (key) {
      item.signatures[key].signedAt = new Date().toISOString().slice(0, 10)
      const signerName = key === 'employee' ? (item.basicInfo?.name || '员工') : (actorUser?.name || '')
      item.signatures[key].signedBy = signerName
      item.signatures[key].signedImage = createSignatureImage(signerName)
    }
  }

  item.currentStage = FLOW_STAGES[idx + 1]
  return true
}


