import { reactive } from 'vue'
import { USERS } from './user'

// 状态枚举说明：
// draft: 草稿（当前未使用，保留扩展）
// pending_training: 审批中-培训工程师
// pending_section: 审批中-科长
// pending_manager: 审批中-部门经理
// in_progress: 进行中（审批完成或无需审批创建）
// rejected: 已驳回
// completed: 已完成（员工达成目标岗位后由外部流程置位）

// 来源：employee(员工自发)、leader_assign(领导指派)、hr_auto(HR自动)

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('positionPlans') || 'null') : null

function nowStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const positionPlansStore = reactive({
  items: persisted?.items || [
    {
      id: 'pp_001',
      targetPosition: '电气维护技师',
      userId: 'u_001',
      department: '电气部',
      description: '计划一年内通过MTA授权并完成关键实践项目',
      improvementSuggestion: '',
      status: 'pending_training',
      source: 'employee',
      createdBy: 'u_001',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      approvalHistory: []
    },
    {
      id: 'pp_002',
      targetPosition: '电气维护主管',
      userId: 'u_001',
      department: '电气部',
      description: '由科长指派重点培养',
      improvementSuggestion: '',
      status: 'in_progress',
      source: 'leader_assign',
      createdBy: 'u_002',
      createdAt: '2025-01-03',
      updatedAt: '2025-01-03',
      approvalHistory: [
        { step: 'leader_assign', action: 'assign', by: 'u_002', at: '2025-01-03', comment: '表现优异，进入培养' }
      ]
    }
  ]
})

function persist() {
  try { localStorage.setItem('positionPlans', JSON.stringify({ items: positionPlansStore.items })) } catch (_) {}
}

export function listPlansByDept(department) {
  return positionPlansStore.items.filter(p => p.department === department)
}

export function listPlansByUser(userId) {
  return positionPlansStore.items.filter(p => p.userId === userId)
}

export function addPlan(plan) {
  const id = `pp_${Math.random().toString(36).slice(2, 8)}`
  const created = {
    id,
    approvalHistory: [],
    createdAt: nowStr(),
    updatedAt: nowStr(),
    ...plan,
  }
  positionPlansStore.items.unshift(created)
  persist()
  return created
}

export function updatePlan(id, patch) {
  const idx = positionPlansStore.items.findIndex(p => p.id === id)
  if (idx === -1) return
  positionPlansStore.items[idx] = {
    ...positionPlansStore.items[idx],
    ...patch,
    updatedAt: nowStr(),
  }
  persist()
}

export function removePlan(id) {
  const idx = positionPlansStore.items.findIndex(p => p.id === id)
  if (idx === -1) return
  positionPlansStore.items.splice(idx, 1)
  persist()
}

export function getUserLabel(userId) {
  const u = USERS.find(u => u.id === userId)
  return u ? `${u.name}（${u.department}｜${u.roleLabel}）` : userId
}

// 审批流推进与驳回
export function approvePlan(id, approver) {
  const plan = positionPlansStore.items.find(p => p.id === id)
  if (!plan) return
  const approval = { step: plan.status, action: 'approve', by: approver.id, at: nowStr(), comment: '' }
  if (plan.status === 'pending_training') plan.status = 'pending_section'
  else if (plan.status === 'pending_section') plan.status = 'pending_manager'
  else if (plan.status === 'pending_manager') plan.status = 'in_progress'
  plan.approvalHistory.push(approval)
  plan.updatedAt = nowStr()
  persist()
}

export function rejectPlan(id, approver, comment = '') {
  const plan = positionPlansStore.items.find(p => p.id === id)
  if (!plan) return
  const approval = { step: plan.status, action: 'reject', by: approver.id, at: nowStr(), comment }
  plan.status = 'rejected'
  plan.improvementSuggestion = comment
  plan.approvalHistory.push(approval)
  plan.updatedAt = nowStr()
  persist()
}


