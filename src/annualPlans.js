import { reactive } from 'vue'
import { USERS } from './user'
import { positionsStore } from './positions'
import { positionPlansStore } from './positionPlans'
import { mtaAuthsStore } from './mtaAuths'
import { coursesStore } from './courses'

const STORAGE_KEY = 'annual_plans_store'

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const annualPlansStore = reactive({
  items: persisted?.items || [
    {
      id: 'ap_001',
      userId: 'u_001',
      name: '2025年度学习计划',
      year: new Date().getFullYear(),
      selectedCourseIds: ['c_001'],
      createdAt: '2025-01-05',
      updatedAt: '2025-01-05'
    }
  ]
})

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: annualPlansStore.items })) } catch {}
}

// 迁移：补全旧数据缺失的名称、年份、课程数组
;(function migrateAnnualPlans() {
  let changed = false
  const currentYear = new Date().getFullYear()
  for (const p of annualPlansStore.items) {
    if (!p.name || typeof p.name !== 'string') { p.name = '未命名计划'; changed = true }
    if (!p.year || typeof p.year !== 'number') { p.year = currentYear; changed = true }
    if (!Array.isArray(p.selectedCourseIds)) { p.selectedCourseIds = []; changed = true }
    if (!p.createdAt) { p.createdAt = new Date().toISOString().slice(0,10); changed = true }
    if (!p.updatedAt) { p.updatedAt = new Date().toISOString().slice(0,10); changed = true }
  }
  if (changed) {
    persist()
  }
})()

export function listMyAnnualPlans(userId) {
  return annualPlansStore.items.filter(p => p.userId === userId)
}

export function addAnnualPlan(payload) {
  const id = `ap_${Math.random().toString(36).slice(2, 8)}`
  const record = {
    id,
    createdAt: new Date().toISOString().slice(0,10),
    updatedAt: new Date().toISOString().slice(0,10),
    ...payload
  }
  annualPlansStore.items.unshift(record)
  persist()
  return id
}

export function updateAnnualPlan(id, patch) {
  const idx = annualPlansStore.items.findIndex(p => p.id === id)
  if (idx === -1) return false
  annualPlansStore.items[idx] = {
    ...annualPlansStore.items[idx],
    ...patch,
    updatedAt: new Date().toISOString().slice(0,10)
  }
  persist()
  return true
}

export function removeAnnualPlan(id) {
  const before = annualPlansStore.items.length
  annualPlansStore.items = annualPlansStore.items.filter(p => p.id !== id)
  persist()
  return annualPlansStore.items.length !== before
}

// 计算当前用户今年可选择的课程：
// 来源1：用户在“进行中”的岗位规划对应岗位的课程
// 来源2：该岗位挂接的MTA授权所关联的课程去重合并
export function listSelectableCoursesForUser(userId) {
  const user = USERS.find(u => u.id === userId)
  if (!user) return []
  // 依据岗位规划中状态为进行中的记录，匹配目标岗位
  const activePlan = positionPlansStore.items.find(p => p.userId === user.id && p.status === 'in_progress')
  let activePosition = null
  if (activePlan) {
    activePosition = positionsStore.items.find(pos => pos.name === activePlan.targetPosition && pos.department === activePlan.department)
  }
  // 兜底：若没有进行中的岗位规划，仍回退到部门下的首个岗位
  if (!activePosition) {
    const deptPositions = positionsStore.items.filter(p => p.department === user.department)
    activePosition = deptPositions[0]
  }
  if (!activePosition) return []

  const fromPositionCourses = Array.isArray(activePosition.courses) ? activePosition.courses.slice() : []

  const mtaCourseIds = new Set()
  if (activePosition.mtaAuthorizations && Array.isArray(activePosition.mtaAuthorizations.items)) {
    for (const item of activePosition.mtaAuthorizations.items) {
      const mta = mtaAuthsStore.items.find(m => m.id === item.mtaId)
      if (mta && Array.isArray(mta.courses)) {
        for (const cid of mta.courses) mtaCourseIds.add(cid)
      }
    }
  }

  const merged = Array.from(new Set([...fromPositionCourses, ...Array.from(mtaCourseIds)]))
  const allowed = new Set(coursesStore.courses.filter(c => c.department === user.department).map(c => c.id))
  return merged.filter(id => allowed.has(id))
}


