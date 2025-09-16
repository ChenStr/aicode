<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { mtaAuthsStore } from '../mtaAuths'
import { coursesStore } from '../courses'
import { workItemsStore } from '../workItems'
import { listMyCourseScores, listMyPracticeAudits } from '../trainingRecords'
import { addProcess, updateProcess, mtaProcessesStore } from '../mtaProcesses'
import { createAssessment } from '../mtaAssessments'
import { getAssessmentByProcessId } from '../mtaAssessments'
import { listTemplatesByMta } from '../certTemplates'
import { certTemplatesStore } from '../certTemplates'
import { USERS } from '../user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close } from '@element-plus/icons-vue'
import { reactive } from 'vue'

const props = defineProps({ 
  currentUser: { type: Object, required: true }, 
  targetMtaId: { type: String, required: true },
  processInfo: { type: Object, default: null } // 流程信息，如果存在说明是查看流程中的申请
})
const emit = defineEmits(['back', 'audit-complete'])

const target = computed(() => mtaAuthsStore.items.find(m => m.id === props.targetMtaId))

function getCourseName(id) { const c = coursesStore.courses.find(c => c.id === id); return c ? c.name : id }
function getWorkItemName(id) { const w = workItemsStore.items.find(w => w.id === id); return w ? w.name : id }

// 审核状态中文映射
function getAuditStatusText(status) {
  return {
    submitted: '已提交',
    training_approved: '培训工程师已审核',
    assessor_assigned: '待考核',
    assessed: '考核完成',
    rejected: '已驳回'
  }[status] || status
}

// 审核状态标签类型映射（与实践考核记录评价一致）
function getAuditStatusType(status) {
  if (status === 'assessed') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'assessor_assigned') return 'warning'
  return 'info'
}

// 根据流程信息确定查看哪个用户的数据
const targetUserId = computed(() => props.processInfo?.userId || props.currentUser.id)
const isViewingProcess = computed(() => !!props.processInfo)

const myScores = computed(() => listMyCourseScores(targetUserId.value))
function findScore(courseId) { return myScores.value.find(s => s.courseId === courseId) }

const myAudits = computed(() => listMyPracticeAudits(targetUserId.value))
function countAssessed(workItemId) { return myAudits.value.filter(a => a.workItemId === workItemId && a.status === 'assessed').length }

// 实践详情对话框状态与方法（展示发起人该实践的通过审核记录）
const practiceDetailDialog = ref(false)
const practiceDetailWorkItemId = ref('')
const assessedRecords = computed(() => {
  const list = myAudits.value || []
  return list.filter(r => r.status === 'assessed' && r.workItemId === practiceDetailWorkItemId.value)
})
function openPracticeDetail(workItemId) {
  practiceDetailWorkItemId.value = workItemId
  practiceDetailDialog.value = true
}

// 获取申请人姓名
function getUserName(userId) {
  const user = USERS.find(u => u.id === userId)
  return user ? user.name : userId
}

// 获取MTA名称
function getMtaName(mtaId) {
  const m = mtaAuthsStore.items.find(m => m.id === mtaId)
  return m ? `${m.techName}（${m.code}）` : mtaId
}

function formatYmdDash(dateStr) {
  if (!dateStr) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

// 判断是否为培训工程师
const isTrainingEngineer = computed(() => props.currentUser.role === 'training_admin')
// 判断是否为科长
const isSectionChief = computed(() => props.currentUser.role === 'section_chief')
// 判断是否为部门经理
const isDeptManager = computed(() => props.currentUser.role === 'dept_manager')
// 判断是否为培训部经理
const isTrainingDeptManager = computed(() => props.currentUser.role === 'dept_manager' && props.currentUser.department === '培训部')

// 关联的MTA考核（基于流程ID）
const relatedAssessment = computed(() => {
  if (!props.processInfo?.id) return null
  return getAssessmentByProcessId(props.processInfo.id) || null
})

function chiefApprove() {
  if (!relatedAssessment.value) return ElMessage.error('未找到关联的MTA考核')
  ElMessageBox.confirm('确认通过该MTA授权申请并提交至部门经理审核？', '科长审核通过', { type: 'warning' })
    .then(() => {
      updateProcess(props.processInfo.id, { status: 'in_progress', currentNode: '部门经理审核' })
      ElMessage.success('已提交至部门经理审核')
      emit('audit-complete')
    }).catch(()=>{})
}
function chiefReject() {
  ElMessageBox.prompt('请输入驳回原因', '科长驳回', { confirmButtonText: '确认', cancelButtonText: '取消' })
    .then(({ value }) => {
      updateProcess(props.processInfo.id, { status: 'rejected', currentNode: '已驳回', sectionChiefComment: (value||'') })
      ElMessage.success('已驳回')
      emit('audit-complete')
    }).catch(()=>{})
}

// 等效流程科长审批
function equivalentChiefApprove() {
  ElMessageBox.confirm('确认通过该MTA授权等效申请并提交至部门经理审核？', '科长审核通过', { type: 'warning' })
    .then(() => {
      updateProcess(props.processInfo.id, { 
        status: 'in_progress', 
        currentNode: '部门经理审核',
        sectionChiefAuditAt: new Date().toISOString().slice(0,10)
      })
      ElMessage.success('已提交至部门经理审核')
      emit('audit-complete')
    }).catch(()=>{})
}

function equivalentChiefReject() {
  ElMessageBox.prompt('请输入驳回原因', '科长驳回', { confirmButtonText: '确认', cancelButtonText: '取消' })
    .then(({ value }) => {
      updateProcess(props.processInfo.id, { 
        status: 'rejected', 
        currentNode: '已驳回', 
        sectionChiefComment: (value||'') 
      })
      ElMessage.success('已驳回')
      emit('audit-complete')
    }).catch(()=>{})
}

function managerApprove() {
  console.log('managerApprove called')
  console.log('managerCert.value:', managerCert.value)
  console.log('managerCert.value.templateId:', managerCert.value.templateId)
  console.log('typeof managerCert.value.templateId:', typeof managerCert.value.templateId)
  console.log('Boolean(managerCert.value.templateId):', Boolean(managerCert.value.templateId))
  
  if (!managerCert.value.templateId) {
    console.log('No template selected, showing error')
    return ElMessage.error('请选择证书模版')
  }
  
  ElMessageBox.confirm('确认部门经理通过该MTA授权申请并签发证书？', '部门经理审核通过', { type: 'warning' })
    .then(() => {
      updateProcess(props.processInfo.id, {
        status: 'approved',
        currentNode: '已完成',
        issuedCert: {
          templateId: managerCert.value.templateId,
          issuedAt: new Date().toISOString().slice(0,10),
          expireYears: managerCert.value.expireYears,
          mtaId: target.value?.id,
          applicantId: (relatedAssessment.value?.applicantId) || props.processInfo.userId
        }
      })
      ElMessage.success('已通过并签发证书')
      emit('audit-complete')
    }).catch(()=>{})
}
function managerReject() {
  ElMessageBox.prompt('请输入驳回原因', '部门经理驳回', { confirmButtonText: '确认', cancelButtonText: '取消' })
    .then(({ value }) => {
      updateProcess(props.processInfo.id, { status: 'rejected', currentNode: '已驳回', deptManagerComment: (value||'') })
      ElMessage.success('已驳回')
      emit('audit-complete')
    }).catch(()=>{})
}

// 等效流程部门经理审批
function equivalentDeptManagerApprove() {
  if (!managerCert.value.templateId) return ElMessage.error('请选择证书模版')
  ElMessageBox.confirm('确认通过该MTA授权等效申请并提交至培训部经理审核？', '部门经理审核通过', { type: 'warning' })
    .then(() => {
      updateProcess(props.processInfo.id, { 
        status: 'in_progress', 
        currentNode: '培训部经理审核',
        deptManagerAuditAt: new Date().toISOString().slice(0,10),
        selectedTemplateId: managerCert.value.templateId,
        selectedExpireYears: managerCert.value.expireYears
      })
      ElMessage.success('已提交至培训部经理审核')
      emit('audit-complete')
    }).catch(()=>{})
}

function equivalentDeptManagerReject() {
  ElMessageBox.prompt('请输入驳回原因', '部门经理驳回', { confirmButtonText: '确认', cancelButtonText: '取消' })
    .then(({ value }) => {
      updateProcess(props.processInfo.id, { 
        status: 'rejected', 
        currentNode: '已驳回', 
        deptManagerComment: (value||'') 
      })
      ElMessage.success('已驳回')
      emit('audit-complete')
    }).catch(()=>{})
}

// 等效流程培训部经理审批
function equivalentTrainingManagerApprove() {
  if (!props.processInfo.selectedTemplateId) return ElMessage.error('部门经理尚未选择证书模版')
  ElMessageBox.confirm('确认通过该MTA授权等效申请并签发等效授权？', '培训部经理审核通过', { type: 'warning' })
    .then(() => {
      // 获取来源MTA授权的失效时间
      const sourceMtaId = props.processInfo.sourceMtaId
      const sourceProcess = mtaProcessesStore.processes.find(p => 
        p.userId === props.processInfo.userId && 
        p.targetMtaId === sourceMtaId && 
        p.status === 'approved' && 
        p.issuedCert
      )
      
      let expireAt = ''
      if (sourceProcess && sourceProcess.issuedCert) {
        const issued = sourceProcess.issuedCert.issuedAt
        const years = Number(sourceProcess.issuedCert.expireYears) || 1
        if (issued) {
          const d = new Date(issued)
          if (!Number.isNaN(d.getTime())) {
            d.setFullYear(d.getFullYear() + years)
            expireAt = d.toISOString().slice(0,10)
          }
        }
      }
      
      updateProcess(props.processInfo.id, {
        status: 'approved',
        currentNode: '已完成',
        trainingManagerAuditAt: new Date().toISOString().slice(0,10),
        issuedCert: {
          templateId: props.processInfo.selectedTemplateId,
          mtaId: props.processInfo.targetMtaId,
          issuedAt: new Date().toISOString().slice(0,10),
          expireAt: expireAt,
          applicantId: props.processInfo.userId,
          sourceMtaId: sourceMtaId,
          isEquivalent: true
        }
      })
      ElMessage.success('已通过并签发等效授权')
      emit('audit-complete')
    }).catch(()=>{})
}

function equivalentTrainingManagerReject() {
  ElMessageBox.prompt('请输入驳回原因', '培训部经理驳回', { confirmButtonText: '确认', cancelButtonText: '取消' })
    .then(({ value }) => {
      updateProcess(props.processInfo.id, { 
        status: 'rejected', 
        currentNode: '已驳回', 
        trainingManagerComment: (value||'') 
      })
      ElMessage.success('已驳回')
      emit('audit-complete')
    }).catch(()=>{})
}

// 校验是否满足提交条件
const unmetCourse = computed(() => {
  const ids = target.value?.courses || []
  const notPass = []
  for (const cid of ids) {
    const s = findScore(cid)
    if (!s || s.result !== '通过') notPass.push({ id: cid, name: getCourseName(cid), result: s?.result || '-' })
  }
  return notPass
})

const practiceRequirement = computed(() => {
  const sp = target.value?.skillPractices || { minSelect: 0, minTimes: 0, items: [] }
  const op = target.value?.operationPractices || { minSelect: 0, minTimes: 0, items: [] }
  return { sp, op }
})

const practiceStats = computed(() => {
  const { sp, op } = practiceRequirement.value
  function statOf(group) {
    const requiredFail = []
    let finishedItems = 0
    let finishedTimes = 0
    for (const it of (group.items || [])) {
      const times = countAssessed(it.workItemId)
      if (it.isRequired && times === 0) requiredFail.push({ id: it.workItemId, name: getWorkItemName(it.workItemId) })
      if (times > 0) { finishedItems += 1; finishedTimes += times }
    }
    return { requiredFail, finishedItems, finishedTimes }
  }
  return { skill: statOf(sp), operation: statOf(op) }
})

const unmetPractice = computed(() => {
  const { sp, op } = practiceRequirement.value
  const s = practiceStats.value
  const result = []
  if (s.skill.requiredFail.length) result.push(`技能实践必选项未完成：${s.skill.requiredFail.map(i=>i.name).join('、')}`)
  if (s.skill.finishedItems < (sp.minSelect || 0)) result.push(`技能实践完成项目数不足：${s.skill.finishedItems}/${sp.minSelect}`)
  if (s.skill.finishedTimes < (sp.minTimes || 0)) result.push(`技能实践完成次数不足：${s.skill.finishedTimes}/${sp.minTimes}`)
  if (s.operation.requiredFail.length) result.push(`实操实践必选项未完成：${s.operation.requiredFail.map(i=>i.name).join('、')}`)
  if (s.operation.finishedItems < (op.minSelect || 0)) result.push(`实操实践完成项目数不足：${s.operation.finishedItems}/${op.minSelect}`)
  if (s.operation.finishedTimes < (op.minTimes || 0)) result.push(`实操实践完成次数不足：${s.operation.finishedTimes}/${op.minTimes}`)
  return result
})

const canSubmit = computed(() => unmetCourse.value.length === 0 && unmetPractice.value.length === 0)

// 提交按钮：仅在达标时创建流程数据
function submitApply() {
  if (!canSubmit.value) return
  addProcess({ userId: props.currentUser.id, type: 'apply', targetMtaId: props.targetMtaId, reason: '' })
  ElMessage.success('已提交申请，进入流程')
  // 提交后自动返回发起流程列表
  emit('back')
}

// 审核相关状态和函数
const auditForm = ref({
  assessorIds: [],
  trainingEngineerComment: ''
})

// 获取考核组成员选项
const assessorOptions = computed(() => {
  return USERS.filter(u => u.role === 'assessor').map(u => ({
    label: `${u.name}（${u.department}）`,
    value: u.id
  }))
})

// 审核操作
function doApprove() {
  if (auditForm.value.assessorIds.length === 0) {
    ElMessage.error('请选择至少一名考核组成员')
    return
  }

  ElMessageBox.confirm(
    '请确认已检查完课程配置与实践配置，确定通过审核并分配考核组成员？',
    '确认通过审核',
    { type: 'warning', confirmButtonText: '确认通过', cancelButtonText: '取消' }
  ).then(() => {
    updateProcess(props.processInfo.id, {
      status: 'in_progress',
      currentNode: '考核组成员考核',
      trainingEngineerId: props.currentUser.id,
      trainingEngineerComment: auditForm.value.trainingEngineerComment || '',
      assessorIds: auditForm.value.assessorIds,
      trainingEngineerAuditAt: new Date().toISOString().slice(0,10)
    })
    
    // 创建MTA考核记录
    const targetMta = mtaAuthsStore.items.find(m => m.id === props.targetMtaId)
    if (targetMta) {
      createAssessment(props.processInfo, targetMta, auditForm.value.assessorIds)
    }
    
    ElMessage.success('已通过审核并分配考核组成员，已创建考核记录')
    emit('audit-complete')
  }).catch(() => {})
}

// 驳回对话框
const rejectDialog = ref(false)
const rejectComment = ref('')

function doReject() {
  rejectComment.value = auditForm.value.trainingEngineerComment
  rejectDialog.value = true
}

function confirmReject() {
  if (!rejectComment.value.trim()) {
    ElMessage.error('请输入驳回意见')
    return
  }
  
  // 驳回审核
  updateProcess(props.processInfo.id, {
    status: 'rejected',
    currentNode: '已驳回',
    trainingEngineerId: props.currentUser.id,
    trainingEngineerComment: rejectComment.value.trim(),
    trainingEngineerAuditAt: new Date().toISOString().slice(0,10)
  })
  ElMessage.success('已驳回申请')
  rejectDialog.value = false
  emit('audit-complete')
}

// 部门经理审核区域：证书签发设置
const managerCert = ref({
  templateId: '',
  expireYears: 1
})

const availableCertTemplates = computed(() => {
  // 对于等效流程，使用processInfo.targetMtaId；对于普通流程，使用target.value.id
  const mtaId = props.processInfo?.type === 'equivalent' ? props.processInfo.targetMtaId : (target.value?.id)
  
  if (!mtaId) return []
  
  const targetMta = mtaAuthsStore.items.find(m => m.id === mtaId)
  if (!targetMta) return []
  
  const dept = targetMta.department || props.currentUser.department
  const inDept = listTemplatesByMta(dept, mtaId)
  if (inDept.length) return inDept
  // fallback: look across all templates for this MTA (to help diagnose)
  return certTemplatesStore.templates.filter(t => t.mtaId === mtaId)
})

const selectedTemplate = computed(() => {
  return availableCertTemplates.value.find(t => t.id === managerCert.value.templateId)
})

// 获取部门经理选择的模版名称
function getSelectedTemplateName() {
  if (!props.processInfo.selectedTemplateId) return ''
  const template = certTemplatesStore.templates.find(t => t.id === props.processInfo.selectedTemplateId)
  return template ? `${template.name}（${template.description || '无说明'}）` : '未知模版'
}

// 证书模版选择变化处理
function onTemplateChange(value) {
  console.log('Template changed to:', value)
  console.log('managerCert.value before update:', managerCert.value)
  
  // 强制更新managerCert
  managerCert.value.templateId = value
  console.log('managerCert.value after update:', managerCert.value)
  
  // 使用nextTick确保DOM更新
  nextTick(() => {
    console.log('managerCert.value after nextTick:', managerCert.value)
    console.log('selectedTemplate.value:', selectedTemplate.value)
  })
}

const totalTemplatesForMtaCount = computed(() => {
  const mtaId = (target.value && target.value.id) ? target.value.id : ''
  if (!mtaId) return 0
  return certTemplatesStore.templates.filter(t => t.mtaId === mtaId).length
})

// 安全展示辅助，避免模板中的可选链解析问题
const targetName = computed(() => (target.value && target.value.techName) ? target.value.techName : '')
const targetCode = computed(() => (target.value && target.value.code) ? target.value.code : '')
const applicantNameForPreview = computed(() => {
  const id = (relatedAssessment.value && relatedAssessment.value.applicantId) || (props.processInfo && props.processInfo.userId) || ''
  return getUserName(id)
})
const selectedTemplateName = computed(() => (selectedTemplate.value && selectedTemplate.value.name) ? selectedTemplate.value.name : '')
const selectedTemplateDesc = computed(() => (selectedTemplate.value && selectedTemplate.value.description) ? selectedTemplate.value.description : '无说明')

// 证书预览状态

function openCertPreview() {
  // 检查是否选择了证书模版
  if (!managerCert.value.templateId) {
    ElMessage.warning('请先选择证书模版')
    return
  }
  
  // 直接打开证书预览对话框（与授权证书模版定义保持一致）
  certPreviewVisible.value = true
}


// 证书预览对话框
const certPreviewVisible = ref(false)
const renderedCertText = computed(() => {
  if (!selectedTemplate.value) return ''
  const tpl = selectedTemplate.value.contentTemplate || ''
  const years = Number(managerCert.value?.expireYears) || Number(selectedTemplate.value.defaultExpireYears) || 1
  const issued = new Date()
  const expire = new Date(issued)
  expire.setFullYear(issued.getFullYear() + years)
  function fmt(d){
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const da = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${da}`
  }
  const vars = {
    applicantName: applicantNameForPreview.value,
    issuedAt: fmt(issued),
    expireAt: fmt(expire),
    mtaName: `${targetName.value}（${targetCode.value}）`
  }
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
})

// 自动带入默认有效年限
watch(() => selectedTemplate.value, (tpl) => {
  if (tpl && typeof tpl.defaultExpireYears === 'number' && tpl.defaultExpireYears > 0) {
    managerCert.value.expireYears = tpl.defaultExpireYears
  }
})
</script>

<template>
  <section class="mta-apply-detail">
    <!-- 流程信息 -->
    <el-card v-if="isViewingProcess && processInfo" class="block" shadow="never">
      <template #header>
        <div class="card-header"><span>流程信息</span></div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请人">{{ getUserName(processInfo.userId) }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ processInfo.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="processInfo.status === 'in_progress' ? 'warning' : processInfo.status === 'approved' ? 'success' : 'danger'">
            {{ processInfo.status === 'in_progress' ? '流程中' : processInfo.status === 'approved' ? '通过' : '驳回' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前节点">{{ processInfo.currentNode }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="target" class="block" shadow="never">
      <template #header>
        <div class="card-header">
          <span>目标 MTA 基础信息</span>
          <span v-if="isViewingProcess" class="viewer-info">（查看 {{ getUserName(targetUserId) }} 的申请）</span>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="名称">{{ targetName }}（{{ targetCode }}）</el-descriptions-item>
        <el-descriptions-item label="项目">{{ target.projectName }}</el-descriptions-item>
        <el-descriptions-item label="等级">{{ target.level }}</el-descriptions-item>
        <el-descriptions-item label="学时">{{ target.hours }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 课程条件提示 -->
    <el-alert v-if="unmetCourse.length" type="warning" show-icon :title="'课程条件未满足'" :description="unmetCourse.map(c=>`课程未通过：${c.name}`).join('；')" />
    <el-card class="block" shadow="never" :header="isViewingProcess ? `课程配置信息 vs ${getUserName(targetUserId)}的成绩` : '课程配置信息 vs 我的成绩'">
      <el-table :data="(target?.courses||[]).map(cid=>({ id: cid, name: getCourseName(cid), score: findScore(cid)?.score ?? '-', result: findScore(cid)?.result ?? '-' }))" size="small" stripe>
        <el-table-column prop="name" label="课程" min-width="220" />
        <el-table-column prop="score" label="分数" width="120" />
        <el-table-column prop="result" label="结果" width="120" />
        <el-table-column label="是否达标" width="120">
          <template #default="{ row }">
            <el-tag :type="row.result==='通过' ? 'success' : 'danger'">{{ row.result==='通过' ? '达标' : '未达标' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 实践条件提示 -->
    <el-alert v-if="unmetPractice.length" type="warning" show-icon :title="'实践条件未满足'" :description="unmetPractice.join('；')" />
    <el-card class="block" shadow="never" :header="isViewingProcess ? `实践配置信息 vs ${getUserName(targetUserId)}的记录` : '实践配置信息 vs 我的记录'">
      <div class="sub-title">技能实践</div>
      <el-table :data="(target?.skillPractices?.items||[]).map(it=>({ id: it.workItemId, name: getWorkItemName(it.workItemId), isRequired: it.isRequired, times: countAssessed(it.workItemId) }))" size="small" stripe>
        <el-table-column prop="name" label="实践项目" min-width="260" />
        <el-table-column label="是否必选" width="100"><template #default="{ row }">{{ row.isRequired ? '是' : '否' }}</template></el-table-column>
        <el-table-column prop="times" label="考核完成次数" width="140" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openPracticeDetail(row.id)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="hint">至少选择 {{ target?.skillPractices?.minSelect || 0 }} 项，至少完成 {{ target?.skillPractices?.minTimes || 0 }} 次</div>

      <div class="sub-title" style="margin-top:12px">实操实践</div>
      <el-table :data="(target?.operationPractices?.items||[]).map(it=>({ id: it.workItemId, name: getWorkItemName(it.workItemId), isRequired: it.isRequired, times: countAssessed(it.workItemId) }))" size="small" stripe>
        <el-table-column prop="name" label="实践项目" min-width="260" />
        <el-table-column label="是否必选" width="100"><template #default="{ row }">{{ row.isRequired ? '是' : '否' }}</template></el-table-column>
        <el-table-column prop="times" label="考核完成次数" width="140" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openPracticeDetail(row.id)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="hint">至少选择 {{ target?.operationPractices?.minSelect || 0 }} 项，至少完成 {{ target?.operationPractices?.minTimes || 0 }} 次</div>
    </el-card>

    <!-- 培训工程师审核区域：分配考核组成员/驳回 -->
    <el-card v-if="isViewingProcess && isTrainingEngineer && processInfo && processInfo.status==='in_progress' && processInfo.currentNode === '培训工程师审核'" class="audit-section" shadow="never" style="margin-top:12px;">
      <template #header>
        <div class="card-header"><span>培训工程师审核</span></div>
      </template>
      <el-form label-width="120px">
        <el-form-item label="选择考核组成员" required>
          <el-select 
            v-model="auditForm.assessorIds" 
            multiple 
            placeholder="请选择考核组成员" 
            style="width: 100%"
            :multiple-limit="5"
          >
            <el-option 
              v-for="option in assessorOptions" 
              :key="option.value" 
              :label="option.label" 
              :value="option.value" 
            />
          </el-select>
          <div class="hint">可选择多名考核组成员，最多5名</div>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input 
            v-model="auditForm.trainingEngineerComment" 
            type="textarea" 
            :rows="4" 
            placeholder="请输入审核意见（可选）"
          />
        </el-form-item>
      </el-form>
      <div class="audit-buttons" style="margin-top:12px; display:flex; gap:8px;">
        <el-button type="success" :icon="Check" @click="doApprove">通过并分配</el-button>
        <el-button type="danger" :icon="Close" @click="doReject">驳回</el-button>
      </div>
    </el-card>

    <!-- 科长审核区域：显示关联考核信息，并进行通过/驳回 -->
    <el-card v-if="isSectionChief && processInfo && processInfo.currentNode === '科长审核'" class="audit-section" shadow="never" style="margin-top:12px;">
      <template #header>
        <div class="card-header"><span>科长审核</span></div>
      </template>
      <div v-if="relatedAssessment">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请人">{{ getUserName(relatedAssessment.applicantId) }}</el-descriptions-item>
          <el-descriptions-item label="所在部门">{{ relatedAssessment.department }}</el-descriptions-item>
          <el-descriptions-item label="考核日期">{{ relatedAssessment.assessmentDate ? formatYmdDash(relatedAssessment.assessmentDate) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="考核形式">{{ relatedAssessment.assessmentForm }}</el-descriptions-item>
          <el-descriptions-item label="单项技术授权" :span="2">{{ relatedAssessment.targetMtaName }}</el-descriptions-item>
          <el-descriptions-item label="考核小组成员" :span="2">{{ relatedAssessment.assessorIds.map(id=>getUserName(id)).join('、') }}</el-descriptions-item>
        </el-descriptions>
        <!-- 展示考核内容 -->
        <el-descriptions :column="1" border style="margin-top:8px;">
          <el-descriptions-item label="考核内容">{{ relatedAssessment.assessmentContent || '-' }}</el-descriptions-item>
          <el-descriptions-item label="考核评价">{{ relatedAssessment.assessmentEvaluation || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="relatedAssessment.assessmentForm === '面试+笔试'" label="笔试成绩">{{ relatedAssessment.writtenScore || '-' }}</el-descriptions-item>
          <el-descriptions-item label="改进建议">{{ relatedAssessment.improvementSuggestions || '-' }}</el-descriptions-item>
          <el-descriptions-item label="考核结论">{{ relatedAssessment.assessmentConclusion || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="audit-buttons" style="margin-top:12px; display:flex; gap:8px;">
          <el-button type="success" :icon="Check" @click="chiefApprove">通过</el-button>
          <el-button type="danger" :icon="Close" @click="chiefReject">驳回</el-button>
        </div>
      </div>
      <el-alert v-else type="warning" show-icon title="未找到关联的MTA考核记录" />
    </el-card>

    <!-- 等效流程科长审核区域 -->
    <el-card v-if="isSectionChief && processInfo && processInfo.type === 'equivalent' && processInfo.currentNode === '科长审核'" class="audit-section" shadow="never" style="margin-top:12px;">
      <template #header>
        <div class="card-header"><span>科长审核 - MTA授权等效</span></div>
      </template>
      <div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请人">{{ getUserName(processInfo.userId) }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ processInfo.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="来源MTA授权" :span="2">{{ getMtaName(processInfo.sourceMtaId) }}</el-descriptions-item>
          <el-descriptions-item label="目标MTA授权" :span="2">{{ getMtaName(processInfo.targetMtaId) }}</el-descriptions-item>
          <el-descriptions-item label="等效说明" :span="2">{{ processInfo.reason || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="audit-buttons" style="margin-top:12px; display:flex; gap:8px;">
          <el-button type="success" :icon="Check" @click="equivalentChiefApprove">通过</el-button>
          <el-button type="danger" :icon="Close" @click="equivalentChiefReject">驳回</el-button>
        </div>
      </div>
    </el-card>

    <!-- 部门经理审核区域 -->
    <el-card v-if="isDeptManager && processInfo && processInfo.currentNode === '部门经理审核' && processInfo.type !== 'equivalent'" class="audit-section" shadow="never" style="margin-top:12px;">
      <template #header>
        <div class="card-header"><span>部门经理审核</span></div>
      </template>
      <div>
        <el-descriptions v-if="relatedAssessment" :column="2" border>
          <el-descriptions-item label="申请人">{{ getUserName(relatedAssessment.applicantId) }}</el-descriptions-item>
          <el-descriptions-item label="所在部门">{{ relatedAssessment.department }}</el-descriptions-item>
          <el-descriptions-item label="考核日期">{{ relatedAssessment.assessmentDate ? formatYmdDash(relatedAssessment.assessmentDate) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="考核形式">{{ relatedAssessment.assessmentForm }}</el-descriptions-item>
          <el-descriptions-item label="单项技术授权" :span="2">{{ relatedAssessment.targetMtaName }}</el-descriptions-item>
          <el-descriptions-item label="考核小组成员" :span="2">{{ relatedAssessment.assessorIds.map(id=>getUserName(id)).join('、') }}</el-descriptions-item>
        </el-descriptions>
        <el-alert v-else type="warning" show-icon title="未找到关联的MTA考核记录，将仅签发证书并结束流程" />
        <el-descriptions v-if="relatedAssessment" :column="1" border style="margin-top:8px;">
          <el-descriptions-item label="考核内容">{{ relatedAssessment.assessmentContent || '-' }}</el-descriptions-item>
          <el-descriptions-item label="考核评价">{{ relatedAssessment.assessmentEvaluation || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="relatedAssessment?.assessmentForm === '面试+笔试'" label="笔试成绩">{{ relatedAssessment.writtenScore || '-' }}</el-descriptions-item>
          <el-descriptions-item label="改进建议">{{ relatedAssessment.improvementSuggestions || '-' }}</el-descriptions-item>
          <el-descriptions-item label="考核结论">{{ relatedAssessment.assessmentConclusion || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 证书签发设置 -->
        <el-card class="block" shadow="never" style="margin-top:12px;">
          <template #header>
            <div class="card-header"><span>证书签发设置</span></div>
          </template>
          <el-form label-width="120px">
            <el-form-item label="证书模版" required>
              <el-select v-model="managerCert.templateId" placeholder="选择证书模版" filterable style="width:100%" @change="onTemplateChange">
                <el-option v-for="t in availableCertTemplates" :key="t.id" :label="t.name + '｜' + (t.description||'')" :value="t.id" />
              </el-select>
              <div class="hint" v-if="!availableCertTemplates.length">当前部门尚未为该MTA配置证书模版，请先在"授权证书模版定义"中创建。</div>
              <div class="hint" v-if="availableCertTemplates.length > 0 && availableCertTemplates.length < totalTemplatesForMtaCount">
                或从其他部门找到的模版中选择：{{ availableCertTemplates.map(t => `${t.name}（${t.department}）`).join('、') }}
              </div>
            </el-form-item>
            <el-form-item label="有效年限">
              <el-input-number v-model="managerCert.expireYears" :min="1" :max="10" />
              <div class="hint">可在签发前调整有效期限（年）。</div>
            </el-form-item>
          </el-form>
          <div class="preview" v-if="managerCert.templateId" style="margin-top:8px; padding:8px; border:1px dashed #e5e7eb;">
            <div class="hint">选中模版：{{ selectedTemplateName }}（{{ selectedTemplateDesc }}）</div>
            <div class="hint">预览（示意）：
              获取人：{{ applicantNameForPreview }} ｜ 授权：{{ targetName }}（{{ targetCode }}） ｜ 有效年限：{{ managerCert.expireYears }} 年
            </div>
          </div>
        </el-card>

        <div class="audit-buttons" style="margin-top:12px; display:flex; gap:8px;">
          <el-button @click="openCertPreview">预览证书</el-button>
          <el-button type="success" :icon="Check" @click="managerApprove">通过并签发</el-button>
          <el-button type="danger" :icon="Close" @click="managerReject">驳回</el-button>
        </div>
      </div>
    </el-card>

    <!-- 等效流程部门经理审核区域 -->
    <el-card v-if="isDeptManager && processInfo && processInfo.type === 'equivalent' && processInfo.currentNode === '部门经理审核'" class="audit-section" shadow="never" style="margin-top:12px;">
      <template #header>
        <div class="card-header"><span>部门经理审核 - MTA授权等效</span></div>
      </template>
      <div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请人">{{ getUserName(processInfo.userId) }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ processInfo.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="来源MTA授权" :span="2">{{ getMtaName(processInfo.sourceMtaId) }}</el-descriptions-item>
          <el-descriptions-item label="目标MTA授权" :span="2">{{ getMtaName(processInfo.targetMtaId) }}</el-descriptions-item>
          <el-descriptions-item label="等效说明" :span="2">{{ processInfo.reason || '-' }}</el-descriptions-item>
          <el-descriptions-item label="科长审核时间" :span="2">{{ processInfo.sectionChiefAuditAt || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 证书签发设置 -->
        <el-card class="block" shadow="never" style="margin-top:12px;">
          <template #header>
            <div class="card-header"><span>证书签发设置</span></div>
          </template>
          <el-form label-width="120px">
            <el-form-item label="证书模版" required>
              <el-select v-model="managerCert.templateId" placeholder="选择证书模版" filterable style="width:100%" @change="onTemplateChange">
                <el-option v-for="t in availableCertTemplates" :key="t.id" :label="t.name + '｜' + (t.description||'')" :value="t.id" />
              </el-select>
              <div class="hint" v-if="!availableCertTemplates.length">当前部门尚未为该MTA配置证书模版，请先在"授权证书模版定义"中创建。</div>
            </el-form-item>
            <el-form-item label="有效年限">
              <el-input-number v-model="managerCert.expireYears" :min="1" :max="10" />
              <div class="hint">等效授权的实际失效时间将基于来源授权，此处仅用于证书显示。</div>
            </el-form-item>
          </el-form>
          <div class="preview" v-if="managerCert.templateId" style="margin-top:8px; padding:8px; border:1px dashed #e5e7eb;">
            <div class="hint">选中模版：{{ selectedTemplate?.name }}（{{ selectedTemplate?.description || '无说明' }}）</div>
            <div class="hint">预览（示意）：
              获取人：{{ getUserName(processInfo.userId) }} ｜ 授权：{{ getMtaName(processInfo.targetMtaId) }} ｜ 有效年限：{{ managerCert.expireYears }} 年
            </div>
          </div>
        </el-card>

        <div class="audit-buttons" style="margin-top:12px; display:flex; gap:8px;">
          <el-button @click="openCertPreview">预览证书</el-button>
          <el-button type="success" :icon="Check" @click="equivalentDeptManagerApprove">通过</el-button>
          <el-button type="danger" :icon="Close" @click="equivalentDeptManagerReject">驳回</el-button>
        </div>
      </div>
    </el-card>

    <!-- 等效流程培训部经理审核区域 -->
    <el-card v-if="isTrainingDeptManager && processInfo && processInfo.type === 'equivalent' && processInfo.currentNode === '培训部经理审核'" class="audit-section" shadow="never" style="margin-top:12px;">
      <template #header>
        <div class="card-header"><span>培训部经理审核 - MTA授权等效</span></div>
      </template>
      <div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请人">{{ getUserName(processInfo.userId) }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ processInfo.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="来源MTA授权" :span="2">{{ getMtaName(processInfo.sourceMtaId) }}</el-descriptions-item>
          <el-descriptions-item label="目标MTA授权" :span="2">{{ getMtaName(processInfo.targetMtaId) }}</el-descriptions-item>
          <el-descriptions-item label="等效说明" :span="2">{{ processInfo.reason || '-' }}</el-descriptions-item>
          <el-descriptions-item label="科长审核时间" :span="2">{{ processInfo.sectionChiefAuditAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="部门经理审核时间" :span="2">{{ processInfo.deptManagerAuditAt || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 显示部门经理选择的证书模版信息 -->
        <div v-if="processInfo.selectedTemplateId" class="template-info" style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px;">
          <div class="hint">部门经理已选择证书模版：{{ getSelectedTemplateName() }}</div>
          <div class="hint">有效年限：{{ processInfo.selectedExpireYears || 1 }} 年</div>
        </div>

        <div class="audit-buttons" style="margin-top:12px; display:flex; gap:8px;">
          <el-button type="success" :icon="Check" @click="equivalentTrainingManagerApprove">通过并签发等效授权</el-button>
          <el-button type="danger" :icon="Close" @click="equivalentTrainingManagerReject">驳回</el-button>
        </div>
      </div>
    </el-card>

    <!-- 实践详情对话框：仅展示所需列 -->
    <el-dialog v-model="practiceDetailDialog" title="实践通过记录详情" width="760px">
      <el-table :data="assessedRecords" size="small" stripe>
        <el-table-column label="实践项目" min-width="220">
          <template #default="{ row }">{{ getWorkItemName(row.workItemId) }}</template>
        </el-table-column>
        <el-table-column prop="submittedAt" label="提交时间" width="140" />
        <el-table-column label="提交人" width="140">
          <template #default="{ row }">{{ getUserName(row.userId) }}</template>
        </el-table-column>
        <el-table-column label="考核人" width="140">
          <template #default="{ row }">{{ row.assessorId ? getUserName(row.assessorId) : '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="getAuditStatusType(row.status)">{{ getAuditStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button type="primary" @click="practiceDetailDialog=false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 证书预览对话框（与授权证书模版定义保持一致） -->
    <el-dialog v-model="certPreviewVisible" title="证书预览" width="820px">
      <div class="preview" :style="{ backgroundImage: (selectedTemplate && selectedTemplate.backgroundUrl) ? `url(${selectedTemplate.backgroundUrl})` : 'none' }">
        <pre class="content">{{ renderedCertText }}</pre>
      </div>
      <template #footer>
        <el-button @click="certPreviewVisible=false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 返回按钮移至页面底部 -->
    <div class="btns" style="margin-top:12px;">
      <el-button type="default" @click="emit('back')">返回</el-button>
      <el-button v-if="!isViewingProcess && canSubmit" type="primary" @click="submitApply">提交申请</el-button>
    </div>
  </section>
</template>

<style scoped>
.block { margin-bottom: 12px; }
.card-header { font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
.viewer-info { font-size: 14px; color: #64748b; font-weight: normal; }
.sub-title { font-weight: 600; margin-bottom: 6px; }
.hint { color: #64748b; font-size: 12px; margin-top: 6px; }
.actions { margin-top: 10px; }
.btns { margin-top: 8px; display: flex; gap: 8px; }
.audit-section { margin-top: 16px; }
.audit-buttons { margin-top: 16px; display: flex; gap: 12px; justify-content: center; }
.preview { min-height: 200px; background-size: cover; background-position: center; padding: 12px; border: 1px dashed #e5e7eb; }
.content { white-space: pre-wrap; background: #f8fafc; padding: 8px; border-radius: 6px; }
</style>


