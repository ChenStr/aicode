<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Close } from '@element-plus/icons-vue'
import { worksStore } from '../works'
import { addWorkProcess } from '../workProcesses'
import { coursesStore } from '../courses'
import { mtaAuthsStore } from '../mtaAuths'
import { listMyCourseScores, listMyPractices, listMyPracticeAudits } from '../trainingRecords'
import { mtaProcessesStore, userMtaCertsStore } from '../mtaProcesses'
import { USERS } from '../user'
import { WORK_SCOPES, getWorkScopeById } from '../workScopes'
import { workItemsStore } from '../workItems'
import { positionsStore } from '../positions'
// 取“我的岗位”名称（与我的岗位页口径一致：当前部门下的第一个岗位）
const myPositionName = computed(() => {
  const u = applicant.value
  if (!u) return '-'
  const deptPositions = positionsStore.items.filter(p => p.department === u.department)
  return deptPositions.length ? (deptPositions[0]?.name || '-') : '-'
})

const props = defineProps({
  currentUser: { type: Object, required: true },
  targetWorkId: { type: String, required: true }
})
const emit = defineEmits(['back'])

// 申请人与目标工作
const applicant = computed(() => USERS.find(u => u.id === props.currentUser.id) || { id: props.currentUser.id, name: '-', department: '-', roleLabel: '-' })
const work = computed(() => worksStore.items.find(w => w.id === props.targetWorkId) || null)

// 申请人档案（演示用，可后续替换为真实接口数据）
const APPLICANT_PROFILE = {
  u_001: { education: '本科', years: 3, currentPositionId: 'p_001' },
  u_002: { education: '大专', years: 8, currentPositionId: 'p_002' },
  u_003: { education: '本科', years: 5, currentPositionId: 'p_001' },
  u_004: { education: '大专', years: 2, currentPositionId: 'p_001' },
  u_005: { education: '大专', years: 2, currentPositionId: 'p_001' },
  u_006: { education: '中专', years: 10, currentPositionId: 'p_002' },
  u_007: { education: '硕士', years: 12, currentPositionId: 'p_002' },
  u_008: { education: '本科', years: 9, currentPositionId: 'p_002' }
}

// 用户课程/实践/MTA
const myCourseScores = computed(() => listMyCourseScores(props.currentUser.id))
const myPractices = computed(() => listMyPractices(props.currentUser.id))
const myPracticeAudits = computed(() => listMyPracticeAudits(props.currentUser.id))

// MTA有效证书集合（与岗位申请一致口径）
function formatYmdDash(dateStr) {
  if (!dateStr) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const da = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${da}`
}
function calcExpireAt(issuedCert) {
  if (!issuedCert) return ''
  if (issuedCert.expireAt) return formatYmdDash(issuedCert.expireAt)
  const issued = issuedCert.issuedAt || issuedCert.obtainedAt
  const years = Number(issuedCert.expireYears) || 1
  if (!issued) return ''
  const d = new Date(issued)
  if (Number.isNaN(d.getTime())) return ''
  d.setFullYear(d.getFullYear() + years)
  return formatYmdDash(d.toISOString().slice(0,10))
}
const myValidMtaIds = computed(() => {
  const now = new Date().toISOString().slice(0,10)
  // 汇总：流程签发记录 + 用户证书仓库
  const fromProcesses = (mtaProcessesStore.processes || [])
    .filter(p => p.userId === props.currentUser.id && p.status === 'approved' && p.issuedCert && p.issuedCert.mtaId)
    .map(p => ({ id: p.issuedCert.mtaId, expireAt: calcExpireAt(p.issuedCert) }))
  const fromCerts = (userMtaCertsStore.items || [])
    .filter(c => c.userId === props.currentUser.id)
    .map(c => ({ id: c.mtaId, expireAt: calcExpireAt(c) }))
  return new Set([...fromProcesses, ...fromCerts].filter(r => !r.expireAt || r.expireAt >= now).map(r => r.id))
})

// 名称帮助
function getMtaName(mtaId) {
  const m = mtaAuthsStore.items.find(i => i.id === mtaId)
  return m ? `${m.techName}（${m.code}）` : mtaId
}
function getCourseName(courseId) {
  const c = coursesStore.courses.find(i => i.id === courseId)
  return c ? `${c.name}` : courseId
}
function getPositionName(positionId) {
  const p = positionsStore.items.find(i => i.id === positionId)
  return p ? p.name : positionId
}

// 明细数据源（逐项比对）
const courseRows = computed(() => {
  const w = work.value
  if (!w || !Array.isArray(w.courses)) return []
  const resultMap = new Map(myCourseScores.value.map(s => [s.courseId, s]))
  return w.courses.map(id => {
    const r = resultMap.get(id)
    return { name: getCourseName(id), score: r?.score ?? '-', result: r?.result || '未完成', isPassed: r?.result === '通过' }
  })
})

const mtaRows = computed(() => {
  const w = work.value
  const ids = (w?.mtaAuthorizations?.items?.map(i => ({ mtaId: i.mtaId, isRequired: !!i.isRequired })).filter(i => i.mtaId)) || (w?.mtaAuths || []).map(id => ({ mtaId: id, isRequired: true }))
  return ids.map(item => ({ name: getMtaName(item.mtaId), mtaId: item.mtaId, isRequired: !!item.isRequired, isCompleted: myValidMtaIds.value.has(item.mtaId) }))
})

const practiceRows = computed(() => {
  const w = work.value
  if (!w || !w.practices) return []
  const counts = new Map()
  // 审核完成次数（优先）
  const assessed = (myPracticeAudits.value || []).filter(a => a.status === 'assessed')
  assessed.forEach(a => counts.set(a.workItemId, (counts.get(a.workItemId) || 0) + 1))
  // 兼容 practiceDone 记录
  myPractices.value.forEach(d => counts.set(d.workItemId, Math.max(counts.get(d.workItemId) || 0, 1)))
  const items = [
    ...(w.practices.skillPractices?.items || []),
    ...(w.practices.operationPractices?.items || [])
  ]
  return items.map(it => ({ workItemId: it.workItemId, name: (workItemsStore.items.find(x => x.id === it.workItemId)?.name) || it.workItemId, isRequired: !!it.isRequired, completedCount: counts.get(it.workItemId) || 0 }))
})

// 资格判定聚合
const qualification = computed(() => {
  const w = work.value
  if (!w) return { courses: true, mta: true, practices: true, conditions: true, positions: true }
  const courses = courseRows.value.every(r => r.isPassed)
  // MTA：要求
  const mtaMin = w.mtaAuthorizations?.minSelect ?? (Array.isArray(w.mtaAuths) ? w.mtaAuths.length : 0)
  const mtaCompletedCount = mtaRows.value.filter(r => r.isCompleted).length
  const mtaRequiredOk = mtaRows.value.filter(r => r.isRequired).every(r => r.isCompleted)
  const mta = (mtaRows.value.length === 0) ? true : (mtaRequiredOk && mtaCompletedCount >= mtaMin)
  // 实践：同时满足 minSelect 和 minTimes（对两类分别校验）
  let practices = true
  const skill = w.practices?.skillPractices
  const op = w.practices?.operationPractices
  if (skill) {
    const done = (skill.items || []).filter(it => (practiceRows.value.find(r => r.workItemId === it.workItemId)?.completedCount || 0) > 0)
    const totalTimes = (skill.items || []).reduce((s, it) => s + (practiceRows.value.find(r => r.workItemId === it.workItemId)?.completedCount || 0), 0)
    practices = practices && (done.length >= (skill.minSelect || 0)) && (totalTimes >= (skill.minTimes || 0))
  }
  if (op) {
    const done = (op.items || []).filter(it => (practiceRows.value.find(r => r.workItemId === it.workItemId)?.completedCount || 0) > 0)
    const totalTimes = (op.items || []).reduce((s, it) => s + (practiceRows.value.find(r => r.workItemId === it.workItemId)?.completedCount || 0), 0)
    practices = practices && (done.length >= (op.minSelect || 0)) && (totalTimes >= (op.minTimes || 0))
  }
  // 工作条件/岗位条件
  let conditions = true
  let positions = true
  if (w.conditions) {
    // 学历：按层级比较（中专 < 大专 < 本科 < 硕士 < 博士）
    const level = { '中专': 1, '大专': 2, '本科': 3, '硕士': 4, '博士': 5 }
    const needEdu = w.conditions.education
    const needYears = Number(w.conditions.minYears) || 0
    const userEdu = applicant.value ? (APPLICANT_PROFILE[applicant.value.id]?.education || '大专') : '大专'
    const userYears = Number(APPLICANT_PROFILE[applicant.value.id]?.years || 0)
    if (needEdu && (level[userEdu] || 0) < (level[needEdu] || 0)) conditions = false
    if (userYears < needYears) conditions = false
  }
  if (Array.isArray(w.positionsAnyOf) && w.positionsAnyOf.length > 0) {
    const currentPos = APPLICANT_PROFILE[applicant.value.id]?.currentPositionId || ''
    positions = w.positionsAnyOf.includes(currentPos)
  }
  return { courses, mta, practices, conditions, positions }
})

const allPassed = computed(() => Object.values(qualification.value).every(Boolean))

// 工作范围：仅展示“顶层根 + 授权中勾选的范围（作为根的直接子项）”，不展示完整子树
function buildSelectedScopesTreeFromTop() {
  const w = work.value
  if (!w || !Array.isArray(w.workScopes) || w.workScopes.length === 0) return []

  function findTopRoot(node) {
    let cur = node
    while (cur && cur.parentId) {
      const parent = getWorkScopeById(cur.parentId)
      if (!parent) break
      cur = parent
    }
    return cur
  }

  function toShallowNode(node) {
    return { id: node.id, name: node.name, code: node.code, description: node.description, children: [] }
  }

  // 新逻辑：对每个被选中的节点，把"根 -> ... -> 该节点"的路径放入结果树；
  // 若选中的是非叶子且其下未单独勾选子项，则补齐其直接子项（常见为末级）
  const selectedIds = new Set(w.workScopes)
  const roots = new Map() // rootId -> builtRoot
  const builtIndexByRoot = new Map() // rootId -> Map(nodeId -> builtNode)

  for (const id of selectedIds) {
    const target = getWorkScopeById(id)
    if (!target) continue
    const top = findTopRoot(target) || target

    if (!roots.has(top.id)) {
      const builtRoot = toShallowNode(top)
      roots.set(top.id, builtRoot)
      const idx = new Map()
      idx.set(top.id, builtRoot)
      builtIndexByRoot.set(top.id, idx)
    }
    const idx = builtIndexByRoot.get(top.id)

    // 构建从根到目标的路径
    const path = []
    let cur = target
    while (cur) {
      path.push(cur)
      if (!cur.parentId) break
      cur = getWorkScopeById(cur.parentId)
    }
    path.reverse()

    // 沿路径逐级建立
    for (let i = 1; i < path.length; i++) {
      const parentId = path[i - 1].id
      const nodeId = path[i].id
      const parentBuilt = idx.get(parentId)
      if (!idx.has(nodeId)) {
        const built = toShallowNode(path[i])
        parentBuilt.children = parentBuilt.children || []
        parentBuilt.children.push(built)
        idx.set(nodeId, built)
      }
    }

    // 补齐直接子项：只有当该目标为非叶子并且没有任何子项被单独勾选时
    const targetBuilt = idx.get(target.id)
    if (targetBuilt && Array.isArray(target.children) && target.children.length > 0) {
      const hasSelectedDescendant = target.children.some(ch => selectedIds.has(ch.id))
      if (!hasSelectedDescendant) {
        const existed = new Set((targetBuilt.children || []).map(c => c.id))
        for (const ch of target.children) {
          if (!existed.has(ch.id)) {
            const built = toShallowNode(ch)
            targetBuilt.children = targetBuilt.children || []
            targetBuilt.children.push(built)
            idx.set(ch.id, built)
          }
        }
      }
    }
  }

  return Array.from(roots.values())
}
const workScopeTree = computed(() => buildSelectedScopesTreeFromTop())

function submit() {
  if (!allPassed.value) { ElMessage.warning('资格认证未全部通过，无法提交'); return }
  addWorkProcess({ userId: props.currentUser.id, type: 'apply', targetWorkId: props.targetWorkId })
  ElMessage.success('流程已提交')
  emit('back')
}

// 提示信息（不满足时显示）
function getProfile() { return APPLICANT_PROFILE[applicant.value.id] || { education: '大专', years: 0, currentPositionId: '' } }
const conditionWarnings = computed(() => {
  const w = work.value
  if (!w || !w.conditions) return []
  const warnings = []
  const level = { '中专': 1, '大专': 2, '本科': 3, '硕士': 4, '博士': 5 }
  const needEdu = w.conditions.education
  const needYears = Number(w.conditions.minYears) || 0
  const prof = getProfile()
  const userEdu = prof.education
  const userYears = Number(prof.years) || 0
  if (needEdu && (level[userEdu] || 0) < (level[needEdu] || 0)) warnings.push(`学历不满足：需 ${needEdu} 及以上，当前为 ${userEdu}`)
  if (userYears < needYears) warnings.push(`工龄不满足：需至少 ${needYears} 年，当前为 ${userYears} 年`)
  return warnings
})

const positionWarnings = computed(() => {
  const w = work.value
  if (!w || !Array.isArray(w.positionsAnyOf) || w.positionsAnyOf.length === 0) return []
  const prof = getProfile()
  const ok = w.positionsAnyOf.includes(prof.currentPositionId)
  return ok ? [] : [ '岗位条件不满足：未匹配到允许的任一岗位' ]
})

const courseWarnings = computed(() => {
  if (qualification.value.courses) return []
  return courseRows.value.filter(r => !r.isPassed).map(r => `课程未通过：${r.name}`)
})

const mtaWarnings = computed(() => {
  const w = work.value
  if (!w) return []
  const warnings = []
  const minSelect = w.mtaAuthorizations?.minSelect ?? (Array.isArray(w.mtaAuths) ? w.mtaAuths.length : 0)
  const completed = mtaRows.value.filter(r => r.isCompleted)
  const requiredMiss = mtaRows.value.filter(r => r.isRequired && !r.isCompleted)
  if (requiredMiss.length > 0) requiredMiss.forEach(r => warnings.push(`缺少必选MTA授权：${r.name}`))
  if (completed.length < minSelect) warnings.push(`MTA授权数量不足：至少 ${minSelect} 项，当前 ${completed.length} 项`)
  return warnings
})

// 实践详情与提示
const practiceWarnings = computed(() => {
  const w = work.value
  if (!w || !w.practices) return []
  const warnings = []
  const skill = w.practices.skillPractices
  const op = w.practices.operationPractices
  if (skill) {
    const doneCount = (skill.items || []).filter(it => (practiceRows.value.find(r => r.workItemId === it.workItemId)?.completedCount || 0) > 0).length
    const totalTimes = (skill.items || []).reduce((s, it) => s + (practiceRows.value.find(r => r.workItemId === it.workItemId)?.completedCount || 0), 0)
    if (doneCount < (skill.minSelect || 0)) warnings.push(`技能实践数量不足：至少 ${skill.minSelect || 0} 项，当前 ${doneCount} 项`)
    if (totalTimes < (skill.minTimes || 0)) warnings.push(`技能实践完成次数不足：至少 ${skill.minTimes || 0} 次，当前 ${totalTimes} 次`)
  }
  if (op) {
    const doneCount = (op.items || []).filter(it => (practiceRows.value.find(r => r.workItemId === it.workItemId)?.completedCount || 0) > 0).length
    const totalTimes = (op.items || []).reduce((s, it) => s + (practiceRows.value.find(r => r.workItemId === it.workItemId)?.completedCount || 0), 0)
    if (doneCount < (op.minSelect || 0)) warnings.push(`操作实践数量不足：至少 ${op.minSelect || 0} 项，当前 ${doneCount} 项`)
    if (totalTimes < (op.minTimes || 0)) warnings.push(`操作实践完成次数不足：至少 ${op.minTimes || 0} 次，当前 ${totalTimes} 次`)
  }
  return warnings
})

// 实践记录详情（沿用岗位申请）
const practiceDetailDialog = ref(false)
const practiceDetailTitle = ref('')
const practiceDetailRows = ref([])
function getAuditStatusText(status) {
  const map = { submitted: '已提交', training_approved: '培训工程师已审核', assessor_assigned: '已安排考核', assessed: '考核完成', rejected: '已驳回' }
  return map[status] || '已提交'
}
function getAuditStatusType(status) {
  if (status === 'assessed') return 'success'
  if (status === 'rejected') return 'danger'
  return 'info'
}
function getWorkItemName(workItemId) {
  return (workItemsStore.items.find(w => w.id === workItemId)?.name) || workItemId
}
function viewPracticeDetail(practice) {
  practiceDetailDialog.value = true
  practiceDetailTitle.value = practice.name
  const audits = myPracticeAudits.value || []
  practiceDetailRows.value = audits
    .filter(a => a.workItemId === practice.workItemId)
    .map(a => ({
      name: getWorkItemName(a.workItemId),
      submittedAt: a.submittedAt,
      statusCode: a.status
    }))
}
</script>

<template>
  <section class="work-apply-detail">
    <div class="header">
      <el-button @click="$emit('back')">返回</el-button>
      <h3 style="margin:0 0 0 12px;">工作授权申请 · {{ work?.name }}（{{ work?.code }}）</h3>
      <el-tag class="ml" type="info">部门：{{ work?.department }}</el-tag>
    </div>

    <!-- 申请人信息 -->
    <el-card class="card" shadow="never">
      <template #header><div class="card-title">申请人信息</div></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="姓名">{{ applicant.name }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ applicant.department }}</el-descriptions-item>
        <el-descriptions-item label="当前岗位">{{ myPositionName }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ new Date().toLocaleDateString() }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 目标工作信息 -->
    <el-card v-if="work" class="card" shadow="never">
      <template #header><div class="card-title">目标工作信息</div></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="工作名称">{{ work.name }}</el-descriptions-item>
        <el-descriptions-item label="代码">{{ work.code }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ work.type }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ work.status }}</el-descriptions-item>
        <el-descriptions-item label="工作描述" :span="2">{{ work.description || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 工作条件认证 -->
    <el-card v-if="work" class="card" shadow="never">
      <template #header>
        <div class="card-title">工作条件认证
          <el-tag :type="qualification.conditions ? 'success' : 'danger'" class="ml-2">{{ qualification.conditions ? '通过' : '未通过' }}</el-tag>
        </div>
      </template>
      <div v-if="conditionWarnings.length" class="warning-message" style="margin-bottom: 12px;">
        <el-icon><Close /></el-icon>
        <div class="warning-content">
          <div class="warning-title">条件不满足</div>
          <div class="warning-details">
            <div v-for="(wmsg, idx) in conditionWarnings" :key="idx" class="warning-detail">{{ wmsg }}</div>
          </div>
        </div>
      </div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="学历">{{ (APPLICANT_PROFILE[applicant.id]?.education) || '未知' }}（要求：{{ work?.conditions?.education || '-' }}）</el-descriptions-item>
        <el-descriptions-item label="工龄">{{ (APPLICANT_PROFILE[applicant.id]?.years ?? '-') }} 年（要求：≥ {{ work?.conditions?.minYears || 0 }} 年）</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 岗位条件认证（任意其一通过） -->
    <el-card v-if="work && Array.isArray(work.positionsAnyOf) && work.positionsAnyOf.length" class="card" shadow="never">
      <template #header>
        <div class="card-title">岗位条件认证
          <el-tag :type="qualification.positions ? 'success' : 'danger'" class="ml-2">{{ qualification.positions ? '通过' : '未通过' }}</el-tag>
        </div>
      </template>
      <div v-if="positionWarnings.length" class="warning-message" style="margin-bottom: 12px;">
        <el-icon><Close /></el-icon>
        <div class="warning-content">
          <div class="warning-title">岗位条件不满足</div>
          <div class="warning-details">
            <div v-for="(wmsg, idx) in positionWarnings" :key="idx" class="warning-detail">{{ wmsg }}</div>
          </div>
        </div>
      </div>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="申请人岗位">{{ getPositionName((APPLICANT_PROFILE[applicant.id]?.currentPositionId) || '-') }}</el-descriptions-item>
        <el-descriptions-item label="可接受岗位（任一）">{{ (work.positionsAnyOf || []).map(getPositionName).join('，') }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 课程明细 -->
    <el-card v-if="work" class="card" shadow="never">
      <template #header>
        <div class="card-title">课程明细
          <el-tag :type="qualification.courses ? 'success' : 'danger'" class="ml-2">{{ qualification.courses ? '通过' : '未通过' }}</el-tag>
        </div>
      </template>
      <div v-if="courseWarnings.length" class="warning-message" style="margin-bottom: 12px;">
        <el-icon><Close /></el-icon>
        <div class="warning-content">
          <div class="warning-title">课程条件不满足要求</div>
          <div class="warning-details">
            <div v-for="(wmsg, idx) in courseWarnings" :key="idx" class="warning-detail">{{ wmsg }}</div>
          </div>
        </div>
      </div>
      <el-table :data="courseRows" stripe>
        <el-table-column prop="name" label="课程名称" min-width="160" />
        <el-table-column prop="score" label="分数" width="100" />
        <el-table-column prop="result" label="结果" width="120" />
        <el-table-column label="是否达标" width="120">
          <template #default="{ row }">
            <el-tag :type="row.isPassed ? 'success' : 'danger'" size="small">{{ row.isPassed ? '达标' : '未达标' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- MTA 授权明细 -->
    <el-card v-if="work" class="card" shadow="never">
      <template #header>
        <div class="card-title">技术授权明细（MTA）
          <el-tag :type="qualification.mta ? 'success' : 'danger'" class="ml-2">{{ qualification.mta ? '通过' : '未通过' }}</el-tag>
        </div>
      </template>
      <div class="info-message" style="margin-bottom: 12px;" v-if="work?.mtaAuthorizations">
        <el-icon><Check /></el-icon>
        <div class="info-content">
          <div class="info-title">岗位要求</div>
          <div class="info-details">至少选择 {{ work?.mtaAuthorizations?.minSelect || 0 }} 项 MTA 授权</div>
        </div>
      </div>
      <div v-if="mtaWarnings.length" class="warning-message" style="margin-bottom: 12px;">
        <el-icon><Close /></el-icon>
        <div class="warning-content">
          <div class="warning-title">MTA授权组合不满足要求</div>
          <div class="warning-details">
            <div v-for="(wmsg, idx) in mtaWarnings" :key="idx" class="warning-detail">{{ wmsg }}</div>
          </div>
        </div>
      </div>
      <el-table :data="mtaRows" stripe>
        <el-table-column prop="name" label="授权名称" min-width="220" />
        <el-table-column label="是否必选" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isRequired ? 'danger' : 'info'" size="small">{{ row.isRequired ? '必选' : '可选' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="是否完成" width="120">
          <template #default="{ row }">
            <el-tag :type="row.isCompleted ? 'success' : 'warning'" size="small">{{ row.isCompleted ? '已获得' : '未获得' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 实践明细 -->
    <el-card v-if="work && (work.practices && ((work.practices.skillPractices?.items?.length||0) + (work.practices.operationPractices?.items?.length||0) > 0))" class="card" shadow="never">
      <template #header><div class="card-title">实践明细</div></template>
      <div v-if="practiceWarnings.length" class="warning-message" style="margin-bottom: 12px;">
        <el-icon><Close /></el-icon>
        <div class="warning-content">
          <div class="warning-title">实践配置不满足要求</div>
          <div class="warning-details">
            <div v-for="(wmsg, idx) in practiceWarnings" :key="idx" class="warning-detail">{{ wmsg }}</div>
          </div>
        </div>
      </div>
      <el-table :data="practiceRows" stripe>
        <el-table-column prop="name" label="实践项目名称" min-width="160" />
        <el-table-column label="是否必选" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isRequired ? 'danger' : 'info'" size="small">{{ row.isRequired ? '必选' : '可选' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="completedCount" label="完成次数" width="120" />
        <el-table-column label="查看详情" width="110">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="viewPracticeDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 工作范围（详细展示已选择范围的完整树） -->
    <el-card class="card" v-if="work">
      <template #header><div class="card-title">工作范围</div></template>
      <template v-if="workScopeTree.length > 0">
        <el-tree :data="workScopeTree" :props="{ children: 'children', label: 'name' }" default-expand-all />
      </template>
      <template v-else>
        <div class="empty-tip">未选择工作范围</div>
      </template>
    </el-card>

    <div style="text-align:right; margin-top: 12px;">
      <el-button @click="$emit('back')">取消</el-button>
      <el-button type="primary" :disabled="!allPassed" @click="submit">提交</el-button>
    </div>
  </section>

  <!-- 实践详情对话框 -->
  <el-dialog v-model="practiceDetailDialog" :title="`实践记录 - ${practiceDetailTitle}`" width="700px">
    <el-table :data="practiceDetailRows" size="small" stripe>
      <el-table-column prop="name" label="实践项目" min-width="160" />
      <el-table-column prop="submittedAt" label="提交时间" width="120" />
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <el-tag :type="getAuditStatusType(row.statusCode)">{{ getAuditStatusText(row.statusCode) }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="practiceDetailDialog=false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.work-apply-detail { padding: 12px; }
.header { display:flex; align-items:center; gap:8px; margin-bottom: 12px; }
.card { margin-bottom: 12px; }
.card-title { font-weight: 600; }
.ml { margin-left: auto; }
.ml-2 { margin-left: 8px; }
.empty-tip { color: #909399; }

/* 对齐岗位申请详情的提示样式 */
.warning-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 6px;
  color: #f56c6c;
  margin-bottom: 16px;
}
.warning-content { flex: 1; }
.warning-title { font-weight: 500; margin-bottom: 8px; }
.warning-details { font-size: 14px; }
.warning-detail { margin-bottom: 4px; line-height: 1.4; }

.info-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 6px;
  color: #409eff;
  margin-bottom: 16px;
}
.info-content { flex: 1; }
.info-title { font-weight: 500; margin-bottom: 8px; }
.info-details { font-size: 14px; }
</style>

