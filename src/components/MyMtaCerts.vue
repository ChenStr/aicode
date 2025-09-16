<script setup>
import { computed, ref } from 'vue'
import { mtaAuthsStore } from '../mtaAuths'
import { mtaProcessesStore } from '../mtaProcesses'
import { certTemplatesStore } from '../certTemplates'
import { USERS } from '../user'
import { View } from '@element-plus/icons-vue'

const props = defineProps({ currentUser: { type: Object, required: true } })

function getUserName(userId) {
  const u = USERS.find(u => u.id === userId)
  return u ? u.name : userId
}

function formatYmdDash(dateStr) {
  if (!dateStr) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const da = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${da}`
}

// 从流程中抽取“通过并签发”的授权
const allIssued = computed(() => {
  return (mtaProcessesStore.processes || []).filter(p => p.status === 'approved' && p.issuedCert && p.issuedCert.mtaId)
})

// 是否管理角色（可切换部门视角）
const isManagerial = computed(() => ['training_admin','section_chief','dept_manager'].includes(props.currentUser.role))
const viewScope = ref('me') // me | dept

const visibleIssued = computed(() => {
  if (!isManagerial.value || viewScope.value === 'me') {
    return allIssued.value.filter(p => p.userId === props.currentUser.id)
  }
  // 部门视角：同部门用户
  return allIssued.value.filter(p => {
    const u = USERS.find(u => u.id === p.userId)
    return u && u.department === props.currentUser.department
  })
})

function getMta(mtaId) {
  return mtaAuthsStore.items.find(m => m.id === mtaId)
}

// 列表行映射
const rows = computed(() => {
  return visibleIssued.value.map(p => {
    const mta = getMta(p.issuedCert.mtaId) || {}
    return {
      id: p.id,
      userId: p.userId,
      applicantName: getUserName(p.userId),
      name: mta.techName || '-',
      code: mta.code || '-',
      level: mta.level || '-',
      hours: mta.hours || '-',
      issuedAt: formatYmdDash(p.issuedCert.issuedAt),
      expireAt: (() => {
        // 等效授权直接使用存储的失效时间
        if (p.issuedCert.expireAt) {
          return formatYmdDash(p.issuedCert.expireAt)
        }
        // 若流程中未存具体到期日，仅存年限，则按 issuedAt + expireYears 计算
        const issued = p.issuedCert.issuedAt
        const years = Number(p.issuedCert.expireYears) || 1
        if (!issued) return ''
        const d = new Date(issued)
        if (Number.isNaN(d.getTime())) return ''
        d.setFullYear(d.getFullYear() + years)
        return formatYmdDash(d.toISOString().slice(0,10))
      })(),
      cert: p.issuedCert
    }
  })
})

function isExpiringSoon(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  const diff = (d.getTime() - now.getTime()) / (1000*60*60*24)
  return diff <= 30 // 30天内到期
}

// 查看证书（按签发时的模版渲染）
const previewDialog = ref(false)
const previewRow = ref(null)
const previewTemplate = computed(() => {
  const tplId = previewRow.value?.cert?.templateId
  if (!tplId) return null
  return certTemplatesStore.templates.find(t => t.id === tplId) || null
})
function fmtYmd(d){
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const da = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${da}`
}
const renderedText = computed(() => {
  const tpl = previewTemplate.value?.contentTemplate || ''
  if (!tpl) return ''
  const issuedAt = previewRow.value?.issuedAt
  const expireAt = previewRow.value?.expireAt
  const vars = {
    applicantName: previewRow.value ? getUserName(previewRow.value.userId) : '',
    issuedAt: issuedAt || '',
    expireAt: expireAt || '',
    mtaName: previewRow.value ? `${previewRow.value.name}（${previewRow.value.code}）` : ''
  }
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
})
function openPreview(row) {
  previewRow.value = row
  previewDialog.value = true
}

</script>

<template>
  <section class="my-mta-certs">
    <div class="header">
      <div class="title">我的MTA授权</div>
      <div class="actions" v-if="isManagerial">
        <el-radio-group v-model="viewScope" size="small">
          <el-radio-button label="me">仅自己</el-radio-button>
          <el-radio-button label="dept">本部门</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="table-container">
      <el-table :data="rows" stripe style="width: 100%; table-layout: fixed;">
        <el-table-column v-if="isManagerial && viewScope==='dept'" label="申请人" width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.applicantName }}</template>
        </el-table-column>
        <el-table-column prop="name" label="授权名称" :width="isManagerial && viewScope==='dept' ? 200 : 250" show-overflow-tooltip />
        <el-table-column prop="level" label="等级" width="80" />
        <el-table-column prop="code" label="编号" width="120" show-overflow-tooltip />
        <el-table-column prop="hours" label="课时" width="80" />
        <el-table-column prop="issuedAt" label="签发时间" width="120" />
        <el-table-column prop="expireAt" label="截止时间" width="120">
          <template #default="{ row }">
            <el-tag :type="isExpiringSoon(row.expireAt) ? 'warning' : 'info'" size="small">{{ row.expireAt || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" :icon="View" @click="openPreview(row)">查看证书</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="previewDialog" title="授权证书" width="820px">
      <div v-if="previewRow" class="preview" :style="{ backgroundImage: (previewTemplate && previewTemplate.backgroundUrl) ? `url(${previewTemplate.backgroundUrl})` : 'none' }">
        <pre class="content">{{ renderedText }}</pre>
      </div>
      <template #footer>
        <el-button @click="previewDialog=false">关闭</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.my-mta-certs { 
  display: flex; 
  flex-direction: column; 
  gap: 12px; 
  width: 100%; 
  max-width: 100%; 
  min-width: 0;
  overflow: hidden;
}
.header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  flex-wrap: wrap;
  gap: 12px;
  min-width: 0;
}
.title { 
  font-weight: 600; 
  font-size: 18px; 
  flex-shrink: 0;
}
.table-container {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
}
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


