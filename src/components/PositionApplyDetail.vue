<script setup>
import { ref, computed, watch } from 'vue'
import { positionsStore } from '../positions'
import { mtaAuthsStore } from '../mtaAuths'
import { listMyMtaCerts } from '../mtaProcesses'
import { listMyCourseScores, listMyPractices, listMyPracticeAudits } from '../trainingRecords'
import { addPositionProcess, setProcessApplicantSigned, updatePositionProcess } from '../positionProcesses'
import { createAssessment, createSummaryPlan, positionAssessmentsStore, findSummaryPlanByProcess, updateSummaryPlan } from '../positionAssessments'
import { coursesStore } from '../courses'
import { workItemsStore } from '../workItems'
import { mtaProcessesStore, userMtaCertsStore } from '../mtaProcesses'
import { USERS } from '../user'
import { listTemplatesByPosition as listPositionCertTemplatesByPosition } from '../positionCertTemplates'
import { createRevocation } from '../positionRevocations'
import { listMyPositionProcesses } from '../positionProcesses'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close, ArrowRight, User, House, Briefcase, Star, Reading, Tools, Document, Edit, Lock } from '@element-plus/icons-vue'

const props = defineProps({
  currentUser: { type: Object, required: true },
  targetPositionId: { type: String, required: true },
  processInfo: { type: Object, required: false, default: null }
})

const emit = defineEmits(['back', 'audit-complete'])

// 获取目标岗位信息
const targetPosition = computed(() => {
  return positionsStore.items.find(p => p.id === props.targetPositionId)
})

// 申请人ID（优先用流程发起人）
const applicantId = computed(() => (props.processInfo && props.processInfo.userId) ? props.processInfo.userId : props.currentUser.id)

// 获取申请人信息（基于流程发起人）
const applicant = computed(() => {
  const u = USERS.find(u => u.id === applicantId.value)
  return u || { id: applicantId.value, name: applicantId.value, department: '-', roleLabel: '-' }
})

// 获取申请人的当前岗位名称（从我的岗位中获取）
const applicantCurrentPosition = computed(() => {
  if (!applicant.value) return '-'
  
  // 优先获取申请人已批准的最新岗位流程
  const processes = listMyPositionProcesses(applicantId.value).filter(p => p.status === 'approved')
  if (processes.length > 0) {
    // 取最新的岗位
    const latestProcess = [...processes].sort((a,b) => (a.createdAt < b.createdAt ? 1 : -1))[0]
    const position = positionsStore.items.find(p => p.id === latestProcess.targetPositionId)
    if (position) return position.name
  }
  
  // 如果没有已批准的岗位流程，则采用"我的岗位"页面的逻辑：取部门下第一个岗位
  const deptPositions = positionsStore.items.filter(p => p.department === applicant.value.department)
  if (deptPositions.length > 0) {
    return deptPositions[0].name
  }
  
  // 最后回退到角色标签
  return applicant.value.roleLabel
})

// 流程节点与签名权限
const currentNode = computed(() => (props.processInfo && props.processInfo.currentNode) ? props.processInfo.currentNode : '')
const isAuditMode = computed(() => !!(props.processInfo && props.processInfo.id))
const isAssessmentType = computed(() => (props.processInfo && props.processInfo.type) === 'assessment')
const isApplicant = computed(() => props.currentUser.id === applicantId.value)
const canApplicantSign = computed(() => isApplicant.value)
const canTrainingEngineerSign = computed(() => props.currentUser.role === 'training_admin' && currentNode.value === '培训工程师审核')
const canSectionChiefSign = computed(() => props.currentUser.role === 'section_chief' && currentNode.value === '科长审核')
const canDeptManagerSign = computed(() => props.currentUser.role === 'dept_manager' && currentNode.value === '部门经理签字')

// 培训工程师签名状态（供后续节点查看）
const trainingEngineerSignedStatus = computed(() => {
  return !!((props.processInfo && props.processInfo.trainingEngineerSigned) || trainingEngineerSigned.value)
})

// 关联考核与总结（供审核材料查看）
const relatedAssessment = computed(() => {
  const pid = props.processInfo?.id
  if (!pid) return null
  return (positionAssessmentsStore.assessments || []).find(a => a.processId === pid) || null
})
const relatedSummaryPlan = computed(() => {
  const pid = props.processInfo?.id
  if (!pid) return null
  return findSummaryPlanByProcess(pid)
})

// 获取申请人的MTA证书
const myMtaCerts = computed(() => {
  return userMtaCertsStore.items.filter(cert => cert.userId === applicantId.value)
})

// 统一从流程签发记录中获取“我的MTA授权”，并校验有效期（与“我的MTA授权”页面一致口径）
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
  const issued = issuedCert.issuedAt
  const years = Number(issuedCert.expireYears) || 1
  if (!issued) return ''
  const d = new Date(issued)
  if (Number.isNaN(d.getTime())) return ''
  d.setFullYear(d.getFullYear() + years)
  return formatYmdDash(d.toISOString().slice(0,10))
}

// 检查MTA证书是否过期
function isMtaExpired(cert) {
  if (!cert) return true
  const now = new Date().toISOString().slice(0, 10)
  const expireAt = calcExpireAt(cert)
  return !expireAt || expireAt < now
}
const myValidMtaIds = computed(() => {
  const now = new Date().toISOString().slice(0,10)
  const rows = (mtaProcessesStore.processes || []).filter(p => p.userId === applicantId.value && p.status === 'approved' && p.issuedCert && p.issuedCert.mtaId)
  return new Set(rows.map(p => ({ id: p.issuedCert.mtaId, expireAt: calcExpireAt(p.issuedCert) }))
    .filter(r => !r.expireAt || r.expireAt >= now)
    .map(r => r.id))
})

// 获取申请人的课程成绩
const myCourseScores = computed(() => {
  return listMyCourseScores(applicantId.value)
})

// 获取申请人的实践记录
const myPractices = computed(() => {
  return listMyPractices(applicantId.value)
})

// 获取MTA授权名称
function getMtaName(mtaId) {
  const mta = mtaAuthsStore.items.find(m => m.id === mtaId)
  return mta ? `${mta.techName}（${mta.code}）` : mtaId
}

// 获取课程名称
function getCourseName(courseId) {
  const course = coursesStore.courses.find(c => c.id === courseId)
  return course ? course.name : courseId
}

// 获取工作项名称
function getWorkItemName(workItemId) {
  const workItem = workItemsStore.items.find(w => w.id === workItemId)
  return workItem ? workItem.name : workItemId
}

// 获取特种作业证书展示名称：使用内置字典（与MTA无关）。若无匹配则回退原ID
const SPECIAL_CERT_DICT = {
  spc_001: '高压电工证',
  spc_002: '低压电工证',
  spc_003: '高处作业证',
  spc_004: '焊工特种作业证'
}
function getSpecialCertLabel(certId) {
  return SPECIAL_CERT_DICT[certId] || certId
}

// 仅提取未达标/未通过的提示信息（过滤掉以“✓ ”开头的达标项）
function getFailureDetails(details) {
  if (!Array.isArray(details)) return []
  return details.filter(d => (typeof d === 'string') ? !/^✓\s/.test(d) : true)
}

// 获取MTA授权列表
function getMtaAuthList() {
  if (!targetPosition.value) return []
  
  const userMtaIds = myValidMtaIds.value
  return targetPosition.value.mtaAuthorizations.items.map(item => ({
    name: getMtaName(item.mtaId),
    isRequired: item.isRequired,
    isCompleted: userMtaIds.has(item.mtaId)
  }))
}

// 获取特种作业证书列表
function getSpecialCertList() {
  if (!targetPosition.value || !targetPosition.value.specialCertificates || !Array.isArray(targetPosition.value.specialCertificates.items)) return []
  
  const userCertIds = myValidMtaIds.value
  return targetPosition.value.specialCertificates.items.map(item => ({
    name: getSpecialCertLabel(item.certId),
    isObtained: userCertIds.has(item.certId)
  }))
}

// 获取课程列表
function getCourseList() {
  if (!targetPosition.value) return []
  
  const userCourseResults = new Map()
  myCourseScores.value.forEach(score => {
    userCourseResults.set(score.courseId, { score: score.score, result: score.result })
  })
  
  return targetPosition.value.courses.map(courseId => {
    const courseResult = userCourseResults.get(courseId)
    return {
      name: getCourseName(courseId),
      score: courseResult ? courseResult.score : '-',
      result: courseResult ? courseResult.result : '未完成',
      isPassed: courseResult ? courseResult.result === '通过' : false
    }
  })
}

// 获取实践项目列表
function getPracticeList() {
  if (!targetPosition.value) return []
  
  // 1) 使用实践审核记录中“考核完成(assessed)”次数
  const audits = listMyPracticeAudits(applicantId.value) || []
  const assessed = audits.filter(a => a.status === 'assessed')
  const assessedCounts = new Map()
  assessed.forEach(a => {
    const n = assessedCounts.get(a.workItemId) || 0
    assessedCounts.set(a.workItemId, n + 1)
  })
  // 2) 兼容早期“实践完成记录(practiceDone)”作为完成次数来源的情况（取两者最大值）
  const done = (listMyPractices(props.currentUser.id) || [])
  const doneCounts = new Map()
  done.forEach(d => {
    const n = doneCounts.get(d.workItemId) || 0
    doneCounts.set(d.workItemId, n + 1)
  })
  
  return targetPosition.value.skillPractices.items.map(item => ({
    workItemId: item.workItemId,
    name: getWorkItemName(item.workItemId),
    isRequired: item.isRequired,
    completedCount: Math.max(
      assessedCounts.get(item.workItemId) || 0,
      doneCounts.get(item.workItemId) || 0
    )
  }))
}

// 资格判定结果
const qualificationResults = ref({
  mtaAuth: { passed: false, details: [] },
  specialCerts: { passed: false, details: [] },
  courses: { passed: false, details: [] },
  practices: { passed: false, details: [] },
  positionDesc: { passed: true, details: [] }
})

// 整体资格判定
const overallQualification = computed(() => {
  return qualificationResults.value.mtaAuth.passed && 
         qualificationResults.value.specialCerts.passed && 
         qualificationResults.value.courses.passed && 
         qualificationResults.value.practices.passed &&
         qualificationResults.value.positionDesc.passed
})

// 执行资格判定
function performQualificationCheck() {
  if (!targetPosition.value) return

  // 1. MTA授权判定
  checkMtaAuthorization()
  
  // 2. 特种作业证书判定
  checkSpecialCertificates()
  
  // 3. 课程配置判定
  checkCourseRequirements()
  
  // 4. 实践配置判定
  checkPracticeRequirements()
  
  // 5. 岗位说明要求（人为判断，系统只显示）
  checkPositionDescription()
}

// MTA授权判定
function checkMtaAuthorization() {
  const position = targetPosition.value
  const mtaConfig = position.mtaAuthorizations
  const userMtaIds = new Set(myValidMtaIds.value)
  
  const details = []
  let passed = true
  
  // 检查必选项
  const requiredMtas = mtaConfig.items.filter(item => item.isRequired)
  for (const item of requiredMtas) {
    if (!userMtaIds.has(item.mtaId)) {
      details.push(`缺少必选MTA授权：${getMtaName(item.mtaId)}`)
      passed = false
    } else {
      details.push(`✓ 已获得必选MTA授权：${getMtaName(item.mtaId)}`)
    }
  }
  
  // 检查至少选择项数量
  const availableMtas = mtaConfig.items.filter(item => userMtaIds.has(item.mtaId))
  if (availableMtas.length < mtaConfig.minSelect) {
    details.push(`MTA授权数量不足：需要至少${mtaConfig.minSelect}项，当前${availableMtas.length}项`)
    passed = false
  } else {
    details.push(`✓ MTA授权数量满足：需要至少${mtaConfig.minSelect}项，当前${availableMtas.length}项`)
  }
  
  qualificationResults.value.mtaAuth = { passed, details }
}

// 特种作业证书判定
function checkSpecialCertificates() {
  const position = targetPosition.value
  const userCertIds = myValidMtaIds.value
  const certConfig = position.specialCertificates
  
  const details = []
  let passed = true
  if (!certConfig || !Array.isArray(certConfig.items) || certConfig.items.length === 0) {
    qualificationResults.value.specialCerts = { passed: true, details: [] }
    return
  }
  
  // 检查所有特种作业证书（全部必须满足）
  for (const cert of certConfig.items) {
    if (!userCertIds.has(cert.certId)) {
      details.push(`缺少特种作业证书：${getSpecialCertLabel(cert.certId)}`)
      passed = false
    } else {
      details.push(`✓ 已获得特种作业证书：${getSpecialCertLabel(cert.certId)}`)
    }
  }
  
  qualificationResults.value.specialCerts = { passed, details }
}

// 课程配置判定
function checkCourseRequirements() {
  const position = targetPosition.value
  const userCourseResults = new Map()
  
  // 构建用户课程结果映射
  myCourseScores.value.forEach(score => {
    userCourseResults.set(score.courseId, score.result)
  })
  
  const details = []
  let passed = true
  
  for (const courseId of position.courses) {
    const result = userCourseResults.get(courseId)
    if (!result || result !== '通过') {
      details.push(`课程未通过：${getCourseName(courseId)}`)
      passed = false
    } else {
      details.push(`✓ 课程已通过：${getCourseName(courseId)}`)
    }
  }
  
  qualificationResults.value.courses = { passed, details }
}

// 实践配置判定
function checkPracticeRequirements() {
  const position = targetPosition.value
  const practiceConfig = position.skillPractices
  const userPracticeCounts = new Map()
  // 使用实践审核记录“通过”的次数
  const audits = listMyPracticeAudits(applicantId.value) || []
  const approved = audits.filter(a => a.status === 'assessed')
  approved.forEach(a => {
    const count = userPracticeCounts.get(a.workItemId) || 0
    userPracticeCounts.set(a.workItemId, count + 1)
  })
  
  const details = []
  let passed = true
  
  // 检查必选项
  const requiredPractices = practiceConfig.items.filter(item => item.isRequired)
  for (const item of requiredPractices) {
    const count = userPracticeCounts.get(item.workItemId) || 0
    if (count === 0) {
      details.push(`必选实践项目未完成：${getWorkItemName(item.workItemId)}`)
      passed = false
    } else {
      details.push(`✓ 必选实践项目已完成：${getWorkItemName(item.workItemId)}（${count}次）`)
    }
  }
  
  // 检查至少选择项数量
  const completedPractices = practiceConfig.items.filter(item => 
    (userPracticeCounts.get(item.workItemId) || 0) > 0
  )
  if (completedPractices.length < practiceConfig.minSelect) {
    details.push(`实践项目数量不足：需要至少${practiceConfig.minSelect}项，当前${completedPractices.length}项`)
    passed = false
  } else {
    details.push(`✓ 实践项目数量满足：需要至少${practiceConfig.minSelect}项，当前${completedPractices.length}项`)
  }
  
  // 检查至少完成次数
  const totalTimes = Array.from(userPracticeCounts.values()).reduce((sum, count) => sum + count, 0)
  if (totalTimes < practiceConfig.minTimes) {
    details.push(`实践完成次数不足：需要至少${practiceConfig.minTimes}次，当前${totalTimes}次`)
    passed = false
  } else {
    details.push(`✓ 实践完成次数满足：需要至少${practiceConfig.minTimes}次，当前${totalTimes}次`)
  }
  
  qualificationResults.value.practices = { passed, details }
}

// 岗位说明要求判定（人为判断）
function checkPositionDescription() {
  const position = targetPosition.value
  const details = []
  
  details.push(`岗位描述：${position.description}`)
  details.push(`注意：岗位说明要求需要人工判断，请仔细阅读岗位描述`)
  
  qualificationResults.value.positionDesc = { passed: true, details }
}

// 申请表单（带回显）
const applicationForm = ref({
  reason: (props.processInfo && props.processInfo.reason) ? props.processInfo.reason : '',
  additionalInfo: (props.processInfo && props.processInfo.additionalInfo) ? props.processInfo.additionalInfo : ''
})

// 提交申请
async function submitApplication() {
  if (!props.targetPositionId) {
    ElMessage.warning('未选择目标岗位')
    return
  }
  
  if (!overallQualification.value) {
    ElMessage.error('资格判定未通过，无法提交申请')
    return
  }
  
  if (!applicationForm.value.reason.trim()) {
    ElMessage.warning('请填写申请原因')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      isAssessmentType.value ? '确认提交社聘/转岗人员考核申请？提交后将进入审核流程。' : '确认提交岗位申请？提交后将进入审核流程。',
      '确认提交',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 创建岗位申请流程（assessment 与 apply 共用）
    const payload = {
      userId: props.currentUser.id,
      type: isAssessmentType.value ? 'assessment' : 'apply',
      targetPositionId: props.targetPositionId,
      reason: applicationForm.value.reason.trim(),
      additionalInfo: applicationForm.value.additionalInfo.trim(),
      applicantSigned: !!applicantSigned.value
    }
    
    const processId = addPositionProcess(payload)
    ElMessage.success('申请提交成功')
    emit('audit-complete')
  } catch {
    // 用户取消
  }
}

// 查看实践详情
function viewPracticeDetail(practice) {
  practiceDetailDialog.value = true
  practiceDetailTitle.value = practice.name
  const audits = listMyPracticeAudits(applicantId.value) || []
  practiceDetailRows.value = audits
    .filter(a => a.workItemId === practice.workItemId)
    .map(a => ({
      name: getWorkItemName(a.workItemId),
      submittedAt: a.submittedAt,
      statusCode: a.status,
      trainingEngineer: USERS.find(u => u.id === a.trainingEngineerId)?.name || '-',
      assessor: USERS.find(u => u.id === a.assessorId)?.name || '-'
    }))
}

// 实践详情对话框
const practiceDetailDialog = ref(false)
const practiceDetailTitle = ref('')
const practiceDetailRows = ref([])

// 与“实践考核记录”页面一致的状态文案与类型
function getAuditStatusText(status) {
  const map = {
    submitted: '已提交',
    training_approved: '培训工程师已审核',
    assessor_assigned: '已安排考核',
    assessed: '考核完成',
    rejected: '已驳回'
  }
  return map[status] || '已提交'
}
function getAuditStatusType(status) {
  if (status === 'assessed') return 'success'
  if (status === 'rejected') return 'danger'
  return 'info'
}

// 页面状态管理
const currentStep = ref(1) // 1: 资格审查, 2: 考核申请, 3: 审核材料

// 下一页按钮是否可用
const canGoNext = computed(() => {
  return qualificationResults.value.mtaAuth.passed &&
         qualificationResults.value.specialCerts.passed &&
         qualificationResults.value.courses.passed &&
         qualificationResults.value.practices.passed
})

// 培训工程师电子签名状态
const trainingEngineerSigned = ref(false)
// 培训工程师选择考核组成员（同部门且为考核组成员）
const assessorSelection = ref((props.processInfo && Array.isArray(props.processInfo.assessorIds)) ? [...props.processInfo.assessorIds] : [])
const assessorOptions = computed(() => USERS.filter(u => u.role === 'assessor' && u.department === applicant.value.department))
// 重复定义清理：assessorSelection/assessorOptions 已在上方声明

// 签名状态（回显）
const applicantSigned = ref(!!(props.processInfo && props.processInfo.applicantSigned))
const sectionChiefSigned = ref(false)
const deptManagerSigned = ref(false)

// 页面切换
function goToNextPage() {
  if (canGoNext.value) {
    currentStep.value = 2
  }
}

function goToPreviousPage() {
  currentStep.value = 1
}

function goToReviewPage() {
  // 审核节点可打开“审核材料”页
  if (isAuditMode.value && (currentNode.value === '科长审核' || currentNode.value === '项目经理审核' || currentNode.value === '部门经理签字')) {
    currentStep.value = 3
  }
}

// 默认进入“资格审查”页（点击详情先看资格审查）
watch(currentNode, (v) => {
  currentStep.value = 1
}, { immediate: true })

// 执行电子签名
function performElectronicSignature() {
  ElMessageBox.confirm(
    '确认进行电子签名？签名后将无法撤销。',
    '电子签名确认',
    {
      confirmButtonText: '确认签名',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    trainingEngineerSigned.value = true
    ElMessage.success('电子签名成功')
  }).catch(() => {
    // 用户取消签名
  })
}

// 申请人电子签名
function performApplicantSignature() {
  ElMessageBox.confirm(
    '确认进行电子签名？签名后将无法撤销。',
    '申请人电子签名确认',
    {
      confirmButtonText: '确认签名',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    applicantSigned.value = true
    if (props.processInfo && props.processInfo.id) {
      setProcessApplicantSigned(props.processInfo.id, true)
    }
    ElMessage.success('申请人电子签名成功')
  }).catch(() => {
    // 用户取消签名
  })
}

// 审批通过
async function approveProcess() {
  if (!(props.processInfo && props.processInfo.id)) return
  const pid = props.processInfo.id
  const node = currentNode.value
  if (node === '培训工程师审核') {
    if (!trainingEngineerSigned.value) {
      ElMessage.warning('请先完成培训工程师电子签名')
      return
    }
    if (!assessorSelection.value || assessorSelection.value.length === 0) {
      ElMessage.warning('请至少选择一名考核组成员')
      return
    }
    // 创建岗位考核与（可选）工作总结/设想
    const applicant = USERS.find(u => u.id === applicantId.value) || {}
    const pos = targetPosition.value
    const currentPositionLabel = (USERS.find(u => u.id === applicantId.value)?.roleLabel) || '-'
    const assessmentId = createAssessment({
      processId: pid,
      applicantId: applicantId.value,
      department: applicant.department,
      targetPositionId: pos?.id,
      currentPositionLabel,
      assessorIds: [...assessorSelection.value]
    })
    if (pos?.requireWorkPlan) {
      createSummaryPlan({ processId: pid, applicantId: applicantId.value, department: applicant.department, targetPositionId: pos.id })
    }
    updatePositionProcess(pid, {
      trainingEngineerSigned: true,
      assessorIds: [...assessorSelection.value],
      currentNode: '岗位考核'
    })
    ElMessage.success('已通过，已创建岗位考核记录并流转至“岗位考核”')
    emit('audit-complete')
    return
  }
  if (node === '科长审核') {
    if (!sectionChiefSigned.value) {
      ElMessage.warning('请先完成科长电子签名')
      return
    }
    updatePositionProcess(pid, {
      sectionChiefSigned: true,
      currentNode: '项目经理审核'
    })
    ElMessage.success('已通过，流转至“项目经理审核”')
    emit('audit-complete')
    return
  }
  if (node === '项目经理审核') {
    if (!pmCert.value.templateId) { ElMessage.warning('请选择岗位证书模版'); return }
    updatePositionProcess(pid, {
      selectedPositionTemplateId: pmCert.value.templateId,
      selectedPositionExpireYears: pmCert.value.expireYears,
      currentNode: '部门经理签字'
    })
    ElMessage.success('已通过，流转至“部门经理签字”')
    emit('audit-complete')
    return
  }
  if (node === '部门经理签字') {
    if (!deptManagerSigned.value) {
      ElMessage.warning('请先完成部门经理电子签名')
      return
    }
    const issuedAt = new Date().toISOString().slice(0,10)
    const expireYears = Number(props.processInfo?.selectedPositionExpireYears || pmCert.value.expireYears || 3)
    updatePositionProcess(pid, {
      deptManagerSigned: true,
      status: 'approved',
      currentNode: '已完成',
      issuedAt,
      expireYears
    })
    try {
      const userId = applicantId.value
      const user = USERS.find(u => u.id === userId) || { id: userId, name: userId, department: props.currentUser.department }
      const processes = listMyPositionProcesses(userId).filter(p => p.status === 'approved')
      const previous = processes.sort((a,b)=> (a.createdAt < b.createdAt ? 1 : -1))[0]
      if (previous && previous.targetPositionId) {
        createRevocation({
          userId: user.id,
          userName: user.name,
          department: user.department,
          revokedPositionId: previous.targetPositionId,
          authorizedAt: previous.issuedAt || '',
          revokedAt: issuedAt,
          status: 'pending'
        })
      }
    } catch {}
    ElMessage.success('流程已批准完成，已更新岗位并创建撤销记录')
    emit('audit-complete')
  }
}

// 审批驳回
async function rejectProcess() {
  if (!(props.processInfo && props.processInfo.id)) return
  try {
    await ElMessageBox.confirm('确定要驳回该申请吗？将退回申请人重新发起。', '驳回确认', {
      confirmButtonText: '驳回',
      cancelButtonText: '取消',
      type: 'warning'
    })
    updatePositionProcess(props.processInfo.id, { status: 'rejected', currentNode: '已驳回' })
    ElMessage.success('已驳回申请')
    emit('audit-complete')
  } catch {}
}

// 科长电子签名
function performSectionChiefSignature() {
  ElMessageBox.confirm(
    '确认进行电子签名？签名后将无法撤销。',
    '科长电子签名确认',
    {
      confirmButtonText: '确认签名',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    sectionChiefSigned.value = true
    ElMessage.success('科长电子签名成功')
  }).catch(() => {
    // 用户取消签名
  })
}

// 部门经理电子签名
function performDeptManagerSignature() {
  ElMessageBox.confirm(
    '确认进行电子签名？签名后将无法撤销。',
    '部门经理电子签名确认',
    {
      confirmButtonText: '确认签名',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    deptManagerSigned.value = true
    ElMessage.success('部门经理电子签名成功')
  }).catch(() => {
    // 用户取消签名
  })
}

// 工作主要经历列表（模拟数据，来源于其他系统）
const workExperienceList = computed(() => {
  // 这里应该从其他系统获取，现在使用模拟数据
  return [
    {
      startDate: '2020-01 - 2023-12',
      department: '电气维护部 - 电气维护技师',
      technicalWork: '负责高压设备维护、配电系统检修',
      position: '技师'
    },
    {
      startDate: '2018-06 - 2019-12',
      department: '电气维护部 - 电气维护员',
      technicalWork: '低压设备维护、日常巡检',
      position: '维护员'
    }
  ]
})

// 培训项目完成情况列表
const trainingCompletionList = computed(() => {
  if (!targetPosition.value || !targetPosition.value.courses || !Array.isArray(targetPosition.value.courses)) return []
  
  const userCourseResults = new Map()
  myCourseScores.value.forEach(score => {
    userCourseResults.set(score.courseId, score)
  })
  
  return targetPosition.value.courses.map(courseId => {
    const course = coursesStore.courses?.find(c => c.id === courseId)
    const userResult = userCourseResults.get(courseId)
    
    return {
      courseName: course?.name || '未知课程',
      courseCode: course?.code || '未知代码',
      result: userResult?.result || '未完成'
    }
  })
})

// 单项技术授权情况列表
const authorizationStatusList = computed(() => {
  if (!targetPosition.value || !targetPosition.value.mtaAuthorizations || !targetPosition.value.mtaAuthorizations.items) return []
  
  const userMtaIds = new Set(myMtaCerts.value.filter(cert => !isMtaExpired(cert)).map(cert => cert.mtaId))
  const completedAuths = targetPosition.value.mtaAuthorizations.items
    .filter(item => userMtaIds.has(item.mtaId))
    .map(item => {
      const mta = mtaAuthsStore.items?.find(auth => auth.id === item.mtaId)
      const userCert = myMtaCerts.value.find(cert => cert.mtaId === item.mtaId && !isMtaExpired(cert))
      
      return {
        authName: mta?.name || item.mtaId,
        issueDate: userCert?.issueDate || '-',
        level: mta?.level || '-'
      }
    })
  
  return completedAuths
})

// 页面加载时执行资格判定
watch(() => props.targetPositionId, () => {
  if (props.targetPositionId) {
    performQualificationCheck()
  }
}, { immediate: true })

// 若用户在"岗位定义"中动态修改了目标岗位配置（如特种作业证书、课程、实践等），
// 需要在详情页实时重新判定资格
watch(targetPosition, (v) => {
  if (v) performQualificationCheck()
}, { deep: true })
</script>

<template>
  <section class="position-apply-detail">
    <div class="page-header">
      <h2>{{ isAssessmentType ? '社聘/转岗人员考核' : '岗位申请详情' }}</h2>
      <div class="step-indicator">
        <el-steps :active="currentStep - 1" simple>
          <el-step title="资格审查" />
          <el-step title="考核申请" />
          <el-step title="审核材料" />
        </el-steps>
      </div>
    </div>

    <!-- 步骤1：资格审查页面 -->
    <div v-if="currentStep === 1">
      <!-- 申请人信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>申请人信息</span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ applicant.name }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ applicant.department }}</el-descriptions-item>
          <el-descriptions-item label="当前岗位">{{ applicantCurrentPosition }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ new Date().toLocaleDateString() }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

    <!-- 目标岗位信息 -->
    <el-card v-if="targetPosition" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Briefcase /></el-icon>
          <span>目标岗位信息</span>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="岗位名称">{{ targetPosition.name }}</el-descriptions-item>
        <el-descriptions-item label="岗位等级">{{ targetPosition.level }}</el-descriptions-item>
        <el-descriptions-item label="上级岗位">{{ targetPosition.parentPosition || '-' }}</el-descriptions-item>
        <el-descriptions-item label="所属部门">{{ targetPosition.department }}</el-descriptions-item>
        <el-descriptions-item label="岗位描述" :span="2">{{ targetPosition.description }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- MTA授权组合 -->
    <el-card v-if="targetPosition" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Star /></el-icon>
          <span>MTA授权组合</span>
          <el-tag :type="qualificationResults.mtaAuth.passed ? 'success' : 'danger'" class="ml-2">
            {{ qualificationResults.mtaAuth.passed ? '通过' : '未通过' }}
          </el-tag>
        </div>
      </template>
      
      <!-- 要求说明：岗位定义中的最少选择项 -->
      <div v-if="targetPosition?.mtaAuthorizations" class="info-message" style="margin-top: 8px;">
        <el-icon><Check /></el-icon>
        <div class="info-content">
          <div class="info-title">岗位要求</div>
          <div class="info-details">至少选择 {{ targetPosition.mtaAuthorizations.minSelect || 0 }} 项 MTA 授权</div>
        </div>
      </div>
      
      <!-- 未通过提示 -->
      <div v-if="!qualificationResults.mtaAuth.passed" class="warning-message">
        <el-icon><Close /></el-icon>
        <div class="warning-content">
          <div class="warning-title">MTA授权组合不满足要求</div>
          <div class="warning-details">
            <div v-for="(detail, index) in getFailureDetails(qualificationResults.mtaAuth.details)" :key="index" class="warning-detail">
              {{ detail }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- MTA授权列表 -->
      <el-table :data="getMtaAuthList()" stripe>
        <el-table-column prop="name" label="MTA授权名称" min-width="200" />
        <el-table-column label="是否必选" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isRequired ? 'danger' : 'info'" size="small">
              {{ row.isRequired ? '必选' : '可选' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="是否完成" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isCompleted ? 'success' : 'warning'" size="small">
              {{ row.isCompleted ? '已完成' : '未完成' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 特种作业证书 -->
    <el-card v-if="targetPosition" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Star /></el-icon>
          <span>特种作业证书</span>
          <el-tag :type="qualificationResults.specialCerts.passed ? 'success' : 'danger'" class="ml-2">
            {{ qualificationResults.specialCerts.passed ? '通过' : '未通过' }}
          </el-tag>
        </div>
      </template>
      
      <!-- 未通过提示 -->
      <div v-if="!qualificationResults.specialCerts.passed" class="warning-message">
        <el-icon><Close /></el-icon>
        <div class="warning-content">
          <div class="warning-title">特种作业证书不满足要求</div>
          <div class="warning-details">
            <div v-for="(detail, index) in getFailureDetails(qualificationResults.specialCerts.details)" :key="index" class="warning-detail">
              {{ detail }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 特种作业证书列表（无要求时仅展示提示，不渲染数据） -->
      <template v-if="targetPosition.specialCertificates && Array.isArray(targetPosition.specialCertificates.items) && targetPosition.specialCertificates.items.length > 0">
        <el-table :data="getSpecialCertList()" stripe>
          <el-table-column prop="name" label="特种作业证书名称" min-width="220" />
          <el-table-column label="是否获得" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isObtained ? 'success' : 'warning'" size="small">
                {{ row.isObtained ? '已获得' : '未获得' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <template v-else>
        <div class="info-message">
          <el-icon><Check /></el-icon>
          <div class="info-content">
            <div class="info-title">本岗位当前无特种作业证书要求</div>
            <div class="info-details">如后续岗位定义新增证书要求，此处将自动展示并进行判定</div>
          </div>
        </div>
      </template>
    </el-card>

    <!-- 课程条件 -->
    <el-card v-if="targetPosition" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Reading /></el-icon>
          <span>课程条件</span>
          <el-tag :type="qualificationResults.courses.passed ? 'success' : 'danger'" class="ml-2">
            {{ qualificationResults.courses.passed ? '通过' : '未通过' }}
          </el-tag>
        </div>
      </template>
      
      <!-- 未通过提示 -->
      <div v-if="!qualificationResults.courses.passed" class="warning-message">
        <el-icon><Close /></el-icon>
        <div class="warning-content">
          <div class="warning-title">课程条件不满足要求</div>
          <div class="warning-details">
            <div v-for="(detail, index) in getFailureDetails(qualificationResults.courses.details)" :key="index" class="warning-detail">
              {{ detail }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 课程列表 -->
      <el-table :data="getCourseList()" stripe>
        <el-table-column prop="name" label="课程名称" min-width="150" />
        <el-table-column prop="score" label="分数" width="80" />
        <el-table-column prop="result" label="结果" width="100" />
        <el-table-column label="是否达标" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isPassed ? 'success' : 'danger'" size="small">
              {{ row.isPassed ? '达标' : '未达标' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 实践配置 -->
    <el-card v-if="targetPosition" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Tools /></el-icon>
          <span>实践配置</span>
          <el-tag :type="qualificationResults.practices.passed ? 'success' : 'danger'" class="ml-2">
            {{ qualificationResults.practices.passed ? '通过' : '未通过' }}
          </el-tag>
        </div>
      </template>
      
      <!-- 要求说明：岗位定义中的最少选择项与最少完成次数 -->
      <div v-if="targetPosition?.skillPractices" class="info-message" style="margin-top: 8px;">
        <el-icon><Check /></el-icon>
        <div class="info-content">
          <div class="info-title">岗位要求</div>
          <div class="info-details">
            至少选择 {{ targetPosition.skillPractices.minSelect || 0 }} 项实践项目，且至少完成 {{ targetPosition.skillPractices.minTimes || 0 }} 次
          </div>
        </div>
      </div>
      
      <!-- 未通过提示 -->
      <div v-if="!qualificationResults.practices.passed" class="warning-message">
        <el-icon><Close /></el-icon>
        <div class="warning-content">
          <div class="warning-title">实践配置不满足要求</div>
          <div class="warning-details">
            <div v-for="(detail, index) in getFailureDetails(qualificationResults.practices.details)" :key="index" class="warning-detail">
              {{ detail }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 实践项目列表 -->
      <el-table :data="getPracticeList()" stripe>
        <el-table-column prop="name" label="实践项目名称" min-width="150" />
        <el-table-column label="是否必选" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isRequired ? 'danger' : 'info'" size="small">
              {{ row.isRequired ? '必选' : '可选' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="completedCount" label="考核完成次数" width="120" />
        <el-table-column label="查看详情" width="100">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="viewPracticeDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 岗位说明要求 -->
    <el-card v-if="targetPosition" class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Document /></el-icon>
          <span>岗位说明要求</span>
          <el-tag type="info" class="ml-2">人工判断</el-tag>
        </div>
      </template>
      
      <!-- 注意信息 -->
      <div class="info-message">
        <el-icon><Check /></el-icon>
        <div class="info-content">
          <div class="info-title">注意：岗位说明要求需要人工判断</div>
          <div class="info-details">
            <div>请仔细阅读岗位描述，确认是否符合岗位要求</div>
          </div>
        </div>
      </div>
      
      <div class="position-description">
        <h4>岗位描述：</h4>
        <p>{{ targetPosition.description }}</p>
      </div>
    </el-card>

      <!-- 培训工程师电子签名 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Edit /></el-icon>
            <span>培训工程师电子签名</span>
          </div>
        </template>
        
        <div class="signature-section">
          <div v-if="canTrainingEngineerSign" class="signature-area">
            <div v-if="!trainingEngineerSigned" class="signature-prompt">
              <el-icon><Edit /></el-icon>
              <span>请进行电子签名确认</span>
            </div>
            <div v-else class="signature-completed">
              <el-icon><Check /></el-icon>
              <span>已签名：{{ props.currentUser.name }}</span>
              <el-tag type="success" size="small">已确认</el-tag>
            </div>
            <el-button 
              v-if="!trainingEngineerSigned"
              type="primary" 
              @click="performElectronicSignature"
              class="signature-button"
            >
              电子签名
            </el-button>
            <el-button 
              v-else
              type="warning" 
              @click="trainingEngineerSigned = false"
              class="signature-button"
            >
              重新签名
            </el-button>
          </div>
          <div v-else class="signature-disabled">
            <div v-if="isAuditMode && (currentNode === '科长审核' || currentNode === '项目经理审核' || currentNode === '部门经理签字')" style="display:flex; align-items:center; gap:8px;">
              <el-tag :type="trainingEngineerSignedStatus ? 'success' : 'info'" size="small">培训工程师签名：{{ trainingEngineerSignedStatus ? '已签' : '未签' }}</el-tag>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <el-icon><Lock /></el-icon>
              <span>仅在“培训工程师审核”节点且为培训工程师时可签名</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button @click="emit('back')">取消</el-button>
        <el-button 
          type="primary" 
          :disabled="!canGoNext"
          @click="goToNextPage"
        >
          下一页
        </el-button>
        <el-button v-if="isAuditMode && (currentNode === '科长审核' || currentNode === '项目经理审核' || currentNode === '部门经理签字')" @click="goToReviewPage">审核材料</el-button>
      </div>
    </div>

    <!-- 步骤2：考核申请页面 -->
    <div v-if="currentStep === 2">
      <!-- 申请人基本情况 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>申请人基本情况</span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ applicant.name }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ applicant.department }}</el-descriptions-item>
          <el-descriptions-item label="申请日期">{{ new Date().toLocaleDateString() }}</el-descriptions-item>
          <el-descriptions-item label="现工作岗位">{{ applicantCurrentPosition }}</el-descriptions-item>
          <el-descriptions-item label="拟申请授权岗位" :span="2">{{ targetPosition?.name || '-' }}</el-descriptions-item>
        </el-descriptions>
        
        <!-- 工作主要经历 -->
        <div class="work-experience-section">
          <h4>工作主要经历</h4>
          <el-table :data="workExperienceList" stripe>
            <el-table-column prop="startDate" label="起止时间" width="200" />
            <el-table-column prop="department" label="部门及岗位名称" min-width="200" />
            <el-table-column prop="technicalWork" label="从事专业技术工作" min-width="200" />
            <el-table-column prop="position" label="职务" width="120" />
          </el-table>
        </div>
      </el-card>

      <!-- 任现职期间培训项目、实操及实践项目完成情况 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Reading /></el-icon>
            <span>任现职期间培训项目、实操及实践项目完成情况</span>
          </div>
        </template>
        
        <el-table :data="trainingCompletionList" stripe>
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="courseName" label="培训课程/项目" min-width="200" />
          <el-table-column prop="courseCode" label="课程代码" width="120" />
          <el-table-column prop="result" label="考核成绩/结果" width="120">
            <template #default="{ row }">
              <el-tag :type="row.result === '通过' ? 'success' : 'warning'">
                {{ row.result }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 在职期间获得单项技术授权情况 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Star /></el-icon>
            <span>在职期间获得单项技术授权情况</span>
          </div>
        </template>
        
        <el-table :data="authorizationStatusList" stripe>
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="authName" label="单项技术授权名称" min-width="200" />
          <el-table-column prop="issueDate" label="授权日期" width="120" />
          <el-table-column prop="level" label="授权级别" width="120" />
        </el-table>
      </el-card>

      <!-- 申请表单 -->
      <el-card v-if="targetPosition" class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>申请信息</span>
          </div>
        </template>
        <el-form :model="applicationForm" label-width="100px">
          <el-form-item label="申请原因" required>
            <el-input 
              v-model="applicationForm.reason" 
              type="textarea" 
              :rows="4" 
              placeholder="请详细说明申请该岗位的原因"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 培训工程师：安排考核组成员（仅在培训工程师审核节点显示） -->
      <el-card v-if="isAuditMode && canTrainingEngineerSign && currentNode === '培训工程师审核'" class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>安排考核组成员</span>
          </div>
        </template>
        <el-form label-width="120px">
          <el-form-item label="考核组成员" required>
            <el-select v-model="assessorSelection" multiple filterable placeholder="请选择考核组成员" style="width: 100%">
              <el-option v-for="u in assessorOptions" :key="u.id" :label="`${u.name}（${u.department}）`" :value="u.id" />
            </el-select>
          </el-form-item>
          <div class="form-tip">需至少选择一名考核组成员</div>
        </el-form>
      </el-card>

      <!-- 签名信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Edit /></el-icon>
            <span>签名信息</span>
          </div>
        </template>
        
        <div class="signature-info-section">
          <!-- 申请人签名 -->
          <div class="signature-item">
            <div class="signature-label">申请人签名：</div>
            <div class="signature-content">
              <div v-if="!applicantSigned" class="signature-prompt">
                <el-icon><Edit /></el-icon>
                <span>请进行电子签名确认</span>
              </div>
              <div v-else class="signature-completed">
                <el-icon><Check /></el-icon>
                <span>已签名：{{ applicant.name }}</span>
                <el-tag type="success" size="small">已确认</el-tag>
              </div>
              <el-button 
                v-if="!applicantSigned && canApplicantSign"
                type="primary" 
                @click="performApplicantSignature"
                class="signature-button"
              >
                电子签名
              </el-button>
              <el-button 
                v-else-if="applicantSigned && canApplicantSign"
                type="warning" 
                @click="applicantSigned = false"
                class="signature-button"
              >
                重新签名
              </el-button>
              <div v-if="!canApplicantSign" class="signature-disabled">
                <el-icon><Lock /></el-icon>
                <span>只有申请人本人才能进行此处签名</span>
              </div>
            </div>
          </div>

          <!-- 科长签名 -->
          <div class="signature-item">
            <div class="signature-label">审查（科长）签名：</div>
            <div class="signature-content">
              <div v-if="canSectionChiefSign" class="signature-area">
                <div v-if="!sectionChiefSigned" class="signature-prompt">
                  <el-icon><Edit /></el-icon>
                  <span>请进行电子签名确认</span>
                </div>
                <div v-else class="signature-completed">
                  <el-icon><Check /></el-icon>
                  <span>已签名：{{ props.currentUser.name }}</span>
                  <el-tag type="success" size="small">已确认</el-tag>
                </div>
                <el-button 
                  v-if="!sectionChiefSigned"
                  type="primary" 
                  @click="performSectionChiefSignature"
                  class="signature-button"
                >
                  电子签名
                </el-button>
                <el-button 
                  v-else
                  type="warning" 
                  @click="sectionChiefSigned = false"
                  class="signature-button"
                >
                  重新签名
                </el-button>
              </div>
              <div v-else class="signature-disabled">
                <el-icon><Lock /></el-icon>
                <span>仅在“科长审核”节点，且由科长进行审查签名</span>
              </div>
            </div>
          </div>

          <!-- 部门经理签名 -->
          <div class="signature-item">
            <div class="signature-label">批准（部门经理）签名：</div>
            <div class="signature-content">
              <div v-if="canDeptManagerSign" class="signature-area">
                <div v-if="!deptManagerSigned" class="signature-prompt">
                  <el-icon><Edit /></el-icon>
                  <span>请进行电子签名确认</span>
                </div>
                <div v-else class="signature-completed">
                  <el-icon><Check /></el-icon>
                  <span>已签名：{{ props.currentUser.name }}</span>
                  <el-tag type="success" size="small">已确认</el-tag>
                </div>
                <el-button 
                  v-if="!deptManagerSigned"
                  type="primary" 
                  @click="performDeptManagerSignature"
                  class="signature-button"
                >
                  电子签名
                </el-button>
                <el-button 
                  v-else
                  type="warning" 
                  @click="deptManagerSigned = false"
                  class="signature-button"
                >
                  重新签名
                </el-button>
              </div>
              <div v-else class="signature-disabled">
                <el-icon><Lock /></el-icon>
                <span>仅在“部门经理审核/签字”节点，且由部门经理进行批准签名</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <template v-if="isAuditMode && currentNode === '培训工程师审核' && canTrainingEngineerSign">
          <el-button @click="goToPreviousPage">上一步</el-button>
          <el-button @click="emit('back')">取消</el-button>
          <el-button type="danger" @click="rejectProcess">驳回</el-button>
          <el-button type="primary" :disabled="!trainingEngineerSigned || !assessorSelection || assessorSelection.length === 0" @click="approveProcess">通过</el-button>
        </template>
        <template v-else-if="isAuditMode && currentNode === '科长审核' && canSectionChiefSign">
          <el-button @click="goToPreviousPage">上一步</el-button>
          <el-button @click="emit('back')">取消</el-button>
          <el-button @click="goToReviewPage">审核材料</el-button>
          <el-button type="danger" @click="rejectProcess">驳回</el-button>
          <el-button type="primary" :disabled="!sectionChiefSigned" @click="approveProcess">通过</el-button>
        </template>
        <template v-else-if="isAuditMode && currentNode === '部门经理签字' && canDeptManagerSign">
          <el-button @click="goToPreviousPage">上一步</el-button>
          <el-button @click="emit('back')">取消</el-button>
          <el-button @click="goToReviewPage">审核材料</el-button>
          <el-button type="danger" @click="rejectProcess">驳回</el-button>
          <el-button type="primary" :disabled="!deptManagerSigned" @click="approveProcess">通过</el-button>
        </template>
        <template v-else>
          <el-button @click="goToPreviousPage">上一步</el-button>
          <el-button @click="emit('back')">取消</el-button>
          <el-button 
            type="primary" 
            :disabled="!targetPosition || !overallQualification || !applicationForm.reason.trim() || !applicantSigned"
            @click="submitApplication"
          >
            提交申请
          </el-button>
          <el按钮 v-if="isAuditMode && (currentNode === '科长审核' || currentNode === '项目经理审核' || currentNode === '部门经理签字')" @click="goToReviewPage">审核材料</el按钮>
        </template>
      </div>
    </div>

    <!-- 步骤3：审核材料（显示岗位考核与工作总结/设想） -->
    <div v-if="currentStep === 3">
      <el-card v-if="relatedAssessment" class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Star /></el-icon>
            <span>岗位考核（审阅）</span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="考核结果">
            <el-tag :type="relatedAssessment.finalResult === 'suggest_authorize' ? 'success' : (relatedAssessment.finalResult === 'failed' ? 'danger' : 'info')">
              {{ relatedAssessment.finalResult === 'suggest_authorize' ? '建议给予岗位技术授权' : (relatedAssessment.finalResult === 'failed' ? '答辩不合格不予授权' : '待评定') }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="relatedAssessment.status === 'completed' ? 'success' : 'warning'">{{ relatedAssessment.status === 'completed' ? '已完成' : '进行中' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="汇报内容" :span="2">{{ relatedAssessment.reportContent || '-' }}</el-descriptions-item>
          <el-descriptions-item label="提问及回答情况" :span="2">{{ relatedAssessment.qaContent || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-table :data="relatedAssessment.records || []" style="margin-top: 12px;" size="small" stripe>
          <el-table-column label="考核组成员" min-width="180">
            <template #default="{ row }">{{ USERS.find(u => u.id === row.assessorId)?.name || row.assessorId }}</template>
          </el-table-column>
          <el-table-column label="签名/日期" min-width="200">
            <template #default="{ row }">
              <div v-if="row.signed">已签名（{{ row.signedAt }}）</div>
              <div v-else>未签名</div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card v-if="relatedSummaryPlan" class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>岗位工作总结与设想（审阅）</span>
          </div>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="岗位培训期间工作总结">{{ relatedSummaryPlan.summaryText || '-' }}</el-descriptions-item>
          <el-descriptions-item label="任新职后工作思路及设想">{{ relatedSummaryPlan.planText || '-' }}</el-descriptions-item>
          <el-descriptions-item label="部门经理签字/日期">
            <span v-if="relatedSummaryPlan.managerSigned">已签名（{{ relatedSummaryPlan.managerSignedAt || '-' }}）</span>
            <span v-else>未签名</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <div class="action-buttons">
        <el-button @click="currentStep = 2">返回考核申请</el-button>
        <template v-if="isAuditMode && currentNode === '科长审核' && canSectionChiefSign">
          <el-button @click="emit('back')">取消</el-button>
          <el-button type="danger" @click="rejectProcess">驳回</el-button>
          <el-button type="primary" :disabled="!sectionChiefSigned" @click="approveProcess">通过</el-button>
        </template>
        <template v-else-if="isAuditMode && (currentNode === '部门经理审核' || currentNode === '部门经理签字') && canDeptManagerSign">
          <el-button @click="emit('back')">取消</el-button>
          <el-button type="danger" @click="rejectProcess">驳回</el-button>
          <el-button type="primary" :disabled="!deptManagerSigned" @click="approveProcess">通过</el-button>
        </template>
      </div>
    </div>
  </section>

    <!-- 实践详情对话框 -->
    <el-dialog v-model="practiceDetailDialog" :title="`实践记录`" width="700px">
      <el-table :data="practiceDetailRows" size="small" stripe>
        <el-table-column prop="name" label="实践项目" min-width="160" />
        <el-table-column prop="submittedAt" label="提交时间" width="120" />
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="getAuditStatusType(row.statusCode)">{{ getAuditStatusText(row.statusCode) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="trainingEngineer" label="培训工程师" width="120" />
        <el-table-column prop="assessor" label="考核人" width="120" />
      </el-table>
      <template #footer>
        <el-button @click="practiceDetailDialog=false">关闭</el-button>
      </template>
    </el-dialog>
</template>

<style scoped>
.position-apply-detail {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.step-indicator {
  margin-top: 16px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.signature-section {
  padding: 16px 0;
}

.signature-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.signature-prompt {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
}

.signature-completed {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #67c23a;
  font-size: 14px;
}

.signature-button {
  min-width: 120px;
}

.signature-disabled {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
  font-size: 14px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
}

.work-experience-section {
  margin-top: 20px;
}

.work-experience-section h4 {
  margin: 0 0 16px 0;
  color: #213547;
  font-size: 16px;
  font-weight: 600;
}

.signature-info-section {
  padding: 16px 0;
}

.signature-item {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
}

.signature-item:last-child {
  margin-bottom: 0;
}

.signature-label {
  min-width: 150px;
  font-weight: 600;
  color: #213547;
  margin-right: 16px;
}

.signature-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.signature-content .signature-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-header h2 {
  margin: 0;
  color: #213547;
}

.info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #213547;
}

.qualification-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #213547;
}

.section-content {
  padding-left: 24px;
}

.detail-item {
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding: 20px;
}

.ml-2 {
  margin-left: 8px;
}

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

.warning-content {
  flex: 1;
}

.warning-title {
  font-weight: 500;
  margin-bottom: 8px;
}

.warning-details {
  font-size: 14px;
}

.warning-detail {
  margin-bottom: 4px;
  line-height: 1.4;
}

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

.info-content {
  flex: 1;
}

.info-title {
  font-weight: 500;
  margin-bottom: 8px;
}

.info-details {
  font-size: 14px;
}

.position-description {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.position-description h4 {
  margin: 0 0 8px 0;
  color: #213547;
  font-size: 14px;
}

.position-description p {
  margin: 0;
  color: #666;
  line-height: 1.6;
}
</style>
