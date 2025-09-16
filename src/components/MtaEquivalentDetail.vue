<script setup>
import { computed, ref, nextTick, watch } from 'vue'
import { mtaAuthsStore } from '../mtaAuths'
import { updateProcess, mtaProcessesStore } from '../mtaProcesses'
import { listTemplatesByMta } from '../certTemplates'
import { certTemplatesStore } from '../certTemplates'
import { USERS } from '../user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close } from '@element-plus/icons-vue'

const props = defineProps({ 
  currentUser: { type: Object, required: true }, 
  processInfo: { type: Object, required: true }
})
const emit = defineEmits(['back', 'audit-complete'])

// 获取MTA名称
function getMtaName(mtaId) {
  const m = mtaAuthsStore.items.find(m => m.id === mtaId)
  return m ? `${m.techName}（${m.code}）` : mtaId
}

// 获取用户姓名
function getUserName(userId) {
  const user = USERS.find(u => u.id === userId)
  return user ? user.name : userId
}

// 获取用户部门
function getUserDepartment(userId) {
  const user = USERS.find(u => u.id === userId)
  return user ? user.department : ''
}

// 判断是否为培训工程师
const isTrainingEngineer = computed(() => props.currentUser.role === 'training_admin')
// 判断是否为部门经理
const isDeptManager = computed(() => props.currentUser.role === 'dept_manager')
// 判断是否为培训部经理
const isTrainingDeptManager = computed(() => props.currentUser.role === 'dept_manager' && props.currentUser.department === '培训部')

// 证书模版相关状态
const managerCert = ref({
  templateId: '',
  expireYears: 1
})

const availableCertTemplates = computed(() => {
  if (!props.processInfo?.targetMtaId) return []
  const targetMta = mtaAuthsStore.items.find(m => m.id === props.processInfo.targetMtaId)
  if (!targetMta) return []
  const dept = targetMta.department || props.currentUser.department
  const inDept = listTemplatesByMta(dept, targetMta.id)
  if (inDept.length) return inDept
  // fallback: look across all templates for this MTA
  return certTemplatesStore.templates.filter(t => t.mtaId === targetMta.id)
})

const selectedTemplate = computed(() => {
  return availableCertTemplates.value.find(t => t.id === managerCert.value.templateId)
})

// 处理证书模版选择变化
function handleTemplateChange(value) {
  console.log('=== 证书模版选择变化 ===')
  console.log('选择的值:', value)
  console.log('选择前的状态:', managerCert.value)
  
  // 强制更新响应式数据
  managerCert.value = {
    ...managerCert.value,
    templateId: value
  }
  
  console.log('选择后的状态:', managerCert.value)
  console.log('selectedTemplate:', selectedTemplate.value)
  
  // 使用 nextTick 确保 DOM 更新
  nextTick(() => {
    console.log('nextTick 后的状态:', managerCert.value)
    console.log('nextTick 后的 selectedTemplate:', selectedTemplate.value)
    
    // 验证选择框的显示状态
    const selectElement = document.querySelector('.el-select .el-input__inner')
    if (selectElement) {
      console.log('选择框显示值:', selectElement.value)
      console.log('选择框显示文本:', selectElement.textContent)
    }
  })
}

// 预览证书功能
function openCertPreview() {
  // 检查是否选择了证书模版
  if (!managerCert.value.templateId) {
    ElMessage.warning('请先选择证书模版')
    return
  }
  
  // 直接打开证书预览对话框
  certPreviewVisible.value = true
}

// 证书预览状态
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
    applicantName: getUserName(props.processInfo.userId),
    issuedAt: fmt(issued),
    expireAt: fmt(expire),
    mtaName: getMtaName(props.processInfo.targetMtaId)
  }
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
})

// 监听证书模版选择变化（用于调试）
watch(() => managerCert.value.templateId, (newValue, oldValue) => {
  console.log('=== Watch 监听器触发 ===')
  console.log('从', oldValue, '变化到', newValue)
  console.log('managerCert.value:', managerCert.value)
  console.log('selectedTemplate.value:', selectedTemplate.value)
})

// 自动带入默认有效年限
watch(() => selectedTemplate.value, (tpl) => {
  if (tpl && typeof tpl.defaultExpireYears === 'number' && tpl.defaultExpireYears > 0) {
    managerCert.value.expireYears = tpl.defaultExpireYears
  }
})

// 获取部门经理选择的模版名称
function getSelectedTemplateName() {
  if (!props.processInfo.selectedTemplateId) return ''
  const template = certTemplatesStore.templates.find(t => t.id === props.processInfo.selectedTemplateId)
  return template ? `${template.name}（${template.description || '无说明'}）` : '未知模版'
}

// 培训工程师审批
function trainingEngineerApprove() {
  ElMessageBox.confirm('确认通过该MTA授权等效申请并提交至部门经理审核？', '培训工程师审核通过', { type: 'warning' })
    .then(() => {
      console.log('培训工程师审批通过，流程ID:', props.processInfo.id)
      const result = updateProcess(props.processInfo.id, { 
        status: 'in_progress', 
        currentNode: '部门经理审核',
        trainingEngineerAuditAt: new Date().toISOString().slice(0,10),
        trainingEngineerId: props.currentUser.id
      })
      console.log('更新流程结果:', result)
      ElMessage.success('已提交至部门经理审核')
      emit('audit-complete')
    }).catch(()=>{})
}

function trainingEngineerReject() {
  ElMessageBox.prompt('请输入驳回原因', '培训工程师驳回', { confirmButtonText: '确认', cancelButtonText: '取消' })
    .then(({ value }) => {
      updateProcess(props.processInfo.id, { 
        status: 'rejected', 
        currentNode: '已驳回', 
        trainingEngineerComment: (value||'') 
      })
      ElMessage.success('已驳回')
      emit('audit-complete')
    }).catch(()=>{})
}

// 部门经理审批
function deptManagerApprove() {
  console.log('=== 部门经理审批调试 ===')
  console.log('deptManagerApprove called')
  console.log('managerCert.value:', managerCert.value)
  console.log('managerCert.value.templateId:', managerCert.value.templateId)
  console.log('typeof managerCert.value.templateId:', typeof managerCert.value.templateId)
  console.log('Boolean(managerCert.value.templateId):', Boolean(managerCert.value.templateId))
  console.log('selectedTemplate.value:', selectedTemplate.value)
  console.log('availableCertTemplates.value:', availableCertTemplates.value)
  
  // 检查选择框的DOM状态
  const selectElement = document.querySelector('.el-select .el-input__inner')
  if (selectElement) {
    console.log('Select element value:', selectElement.value)
    console.log('Select element text:', selectElement.textContent)
  }
  
  if (!managerCert.value.templateId) {
    console.log('No template selected, showing error')
    return ElMessage.error('请选择证书模版')
  }
  
  ElMessageBox.confirm('确认通过该MTA授权等效申请并提交至培训部经理审核？', '部门经理审核通过', { type: 'warning' })
    .then(() => {
      updateProcess(props.processInfo.id, { 
        status: 'in_progress', 
        currentNode: '培训部经理审核',
        deptManagerAuditAt: new Date().toISOString().slice(0,10),
        deptManagerId: props.currentUser.id,
        selectedTemplateId: managerCert.value.templateId,
        selectedExpireYears: managerCert.value.expireYears
      })
      ElMessage.success('已提交至培训部经理审核')
      emit('audit-complete')
    }).catch(()=>{})
}

function deptManagerReject() {
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

// 培训部经理审批
function trainingManagerApprove() {
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
        // 优先使用存储的失效时间
        if (sourceProcess.issuedCert.expireAt) {
          expireAt = sourceProcess.issuedCert.expireAt
        } else {
          // 如果没有存储失效时间，则按年限计算
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
      }
      
      updateProcess(props.processInfo.id, {
        status: 'approved',
        currentNode: '已完成',
        trainingManagerAuditAt: new Date().toISOString().slice(0,10),
        trainingManagerId: props.currentUser.id,
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

function trainingManagerReject() {
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
</script>

<template>
  <section class="equivalent-detail">
    <!-- 流程信息 -->
    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header"><span>MTA授权等效流程信息</span></div>
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

    <!-- 等效申请信息 -->
    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header"><span>等效申请信息</span></div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="发起人">{{ getUserName(processInfo.userId) }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ getUserDepartment(processInfo.userId) }}</el-descriptions-item>
        <el-descriptions-item label="来源MTA授权" :span="2">{{ getMtaName(processInfo.sourceMtaId) }}</el-descriptions-item>
        <el-descriptions-item label="目标MTA授权" :span="2">{{ getMtaName(processInfo.targetMtaId) }}</el-descriptions-item>
        <el-descriptions-item label="等效说明" :span="2">{{ processInfo.reason || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 审批记录 -->
    <el-card class="block" shadow="never">
      <template #header>
        <div class="card-header"><span>审批记录</span></div>
      </template>
      <div class="approval-records">
        <div class="approval-item">
          <div class="approval-label">申请人签名：</div>
          <div class="approval-value">{{ getUserName(processInfo.userId) }}</div>
        </div>
        <div class="approval-item">
          <div class="approval-label">日期：</div>
          <div class="approval-value">{{ processInfo.createdAt }}</div>
        </div>
        
        <div class="approval-item">
          <div class="approval-label">审查（培训工程师签名）：</div>
          <div class="approval-value">{{ processInfo.trainingEngineerId ? getUserName(processInfo.trainingEngineerId) : '-' }}</div>
        </div>
        <div class="approval-item">
          <div class="approval-label">日期：</div>
          <div class="approval-value">{{ processInfo.trainingEngineerAuditAt || '-' }}</div>
        </div>
        
        <div class="approval-item">
          <div class="approval-label">批准（部门经理签名）：</div>
          <div class="approval-value">{{ processInfo.deptManagerId ? getUserName(processInfo.deptManagerId) : '-' }}</div>
        </div>
        <div class="approval-item">
          <div class="approval-label">日期：</div>
          <div class="approval-value">{{ processInfo.deptManagerAuditAt || '-' }}</div>
        </div>
        
        <div class="approval-item">
          <div class="approval-label">批准（培训部部门经理签名）：</div>
          <div class="approval-value">{{ processInfo.trainingManagerId ? getUserName(processInfo.trainingManagerId) : '-' }}</div>
        </div>
        <div class="approval-item">
          <div class="approval-label">日期：</div>
          <div class="approval-value">{{ processInfo.trainingManagerAuditAt || '-' }}</div>
        </div>
      </div>
    </el-card>

    <!-- 培训工程师审核区域 -->
    <el-card v-if="isTrainingEngineer && processInfo.currentNode === '培训工程师审核'" class="audit-section" shadow="never">
      <template #header>
        <div class="card-header"><span>培训工程师审核</span></div>
      </template>
      <div class="audit-buttons">
        <el-button type="success" :icon="Check" @click="trainingEngineerApprove">通过</el-button>
        <el-button type="danger" :icon="Close" @click="trainingEngineerReject">驳回</el-button>
      </div>
    </el-card>

    <!-- 部门经理审核区域 -->
    <el-card v-if="isDeptManager && processInfo.currentNode === '部门经理审核'" class="audit-section" shadow="never">
      <template #header>
        <div class="card-header"><span>部门经理审核</span></div>
      </template>
      
      <!-- 证书签发设置 -->
      <div class="block" style="margin-top:12px;">
        <el-form label-width="120px">
          <el-form-item label="证书模版" required>
            <el-select 
              v-model="managerCert.templateId" 
              placeholder="选择证书模版" 
              filterable 
              style="width:100%" 
              clearable
              @change="handleTemplateChange"
            >
              <el-option 
                v-for="t in availableCertTemplates" 
                :key="t.id" 
                :label="t.name + '｜' + (t.description||'')" 
                :value="t.id" 
              />
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
      </div>

      <div class="audit-buttons">
        <el-button @click="openCertPreview">预览证书</el-button>
        <el-button type="success" :icon="Check" @click="deptManagerApprove">通过</el-button>
        <el-button type="danger" :icon="Close" @click="deptManagerReject">驳回</el-button>
      </div>
    </el-card>

    <!-- 培训部经理审核区域 -->
    <el-card v-if="isTrainingDeptManager && processInfo.currentNode === '培训部经理审核'" class="audit-section" shadow="never">
      <template #header>
        <div class="card-header"><span>培训部经理审核</span></div>
      </template>
      
      <!-- 显示部门经理选择的证书模版信息 -->
      <div v-if="processInfo.selectedTemplateId" class="template-info" style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px;">
        <div class="hint">部门经理已选择证书模版：{{ getSelectedTemplateName() }}</div>
        <div class="hint">有效年限：{{ processInfo.selectedExpireYears || 1 }} 年</div>
      </div>

      <div class="audit-buttons">
        <el-button type="success" :icon="Check" @click="trainingManagerApprove">通过并签发等效授权</el-button>
        <el-button type="danger" :icon="Close" @click="trainingManagerReject">驳回</el-button>
      </div>
    </el-card>

    <!-- 证书预览对话框（与授权证书模版定义保持一致） -->
    <el-dialog v-model="certPreviewVisible" title="证书预览" width="820px">
      <div class="preview" :style="{ backgroundImage: (selectedTemplate && selectedTemplate.backgroundUrl) ? `url(${selectedTemplate.backgroundUrl})` : 'none' }">
        <pre class="content">{{ renderedCertText }}</pre>
      </div>
      <template #footer>
        <el-button @click="certPreviewVisible=false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 返回按钮 -->
    <div class="btns">
      <el-button type="default" @click="emit('back')">返回</el-button>
    </div>
  </section>
</template>

<style scoped>
.block { margin-bottom: 12px; }
.card-header { font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
.audit-section { margin-top: 16px; }
.audit-buttons { margin-top: 16px; display: flex; gap: 12px; justify-content: center; }
.btns { margin-top: 8px; display: flex; gap: 8px; }

.approval-records {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.approval-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.approval-label {
  font-weight: 600;
  color: #374151;
  min-width: 200px;
}

.approval-value {
  color: #1f2937;
  flex: 1;
}

.hint { color: #64748b; font-size: 12px; margin-top: 6px; }
.preview { 
  min-height: 200px; 
  background-size: cover; 
  background-position: center; 
  padding: 12px; 
  border: 1px dashed #e5e7eb; 
}
.content { 
  white-space: pre-wrap; 
  background: #f8fafc; 
  padding: 8px; 
  border-radius: 6px; 
}
</style>
