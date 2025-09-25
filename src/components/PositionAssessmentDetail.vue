<script setup>
import { computed, ref } from 'vue'
import { positionAssessmentsStore, updateAssessment, findSummaryPlanByProcess, updateSummaryPlan, createSummaryPlan } from '../positionAssessments'
import { USERS } from '../user'
import { positionsStore } from '../positions'
import { updatePositionProcess } from '../positionProcesses'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({ currentUser: { type: Object, required: true }, assessmentId: { type: String, required: true } })
const emit = defineEmits(['back', 'open-process'])

const assessment = computed(() => positionAssessmentsStore.assessments.find(a => a.id === props.assessmentId))
const processId = computed(() => assessment.value?.processId || '')
const summaryPlan = computed(() => findSummaryPlanByProcess(processId.value))

function getUserName(id) { return USERS.find(u => u.id === id)?.name || id }
function getPosName(id) { return positionsStore.items.find(p => p.id === id)?.name || id }

const activeTab = ref('assessment')
const myRecord = computed(() => {
  if (!assessment.value) return null
  return (assessment.value.records || []).find(r => r.assessorId === props.currentUser.id) || null
})

const canEditAssessment = computed(() => props.currentUser.role === 'assessor' && !!myRecord.value)
const canSignAssessment = canEditAssessment

function saveAssessmentShared() {
  if (!assessment.value) return
  updateAssessment(assessment.value.id, {
    reportContent: assessment.value.reportContent,
    qaContent: assessment.value.qaContent,
    finalResult: assessment.value.finalResult
  })
  ElMessage.success('已保存')
}

function signMyAssessment() {
  if (!assessment.value || !myRecord.value) return
  myRecord.value.signed = true
  myRecord.value.signedAt = new Date().toISOString().slice(0,10)
  updateAssessment(assessment.value.id, { records: assessment.value.records })
  ElMessage.success('已签名')
}

const applicantCanEditSummary = computed(() => {
  return !!summaryPlan.value && props.currentUser.id === assessment.value?.applicantId && assessment.value?.finalResult === 'suggest_authorize'
})

function submitSummaryPlan() {
  if (!summaryPlan.value) return
  if (!summaryPlan.value.summaryText?.trim() || !summaryPlan.value.planText?.trim()) {
    ElMessage.warning('请填写完整的总结与设想')
    return
  }
  updateSummaryPlan(summaryPlan.value.id, { status: 'submitted' })
  // 推进流程至科长审核
  if (processId.value) {
    updatePositionProcess(processId.value, { currentNode: '科长审核' })
  }
  ElMessage.success('已提交，流程已推进至科长审核')
}

const allAssessorsSigned = computed(() => (assessment.value?.records || []).every(r => r.signed))

function finalizeIfReady() {
  if (!assessment.value) return
  const final = assessment.value.finalResult || 'pending'
  updateAssessment(assessment.value.id, { finalResult: final, status: allAssessorsSigned.value ? 'completed' : assessment.value.status })
  // 若无总结计划或不需要填写，且所有人签名完成，则推进流程至科长审核
  if (allAssessorsSigned.value) {
    const sp = summaryPlan.value
    if (!sp) {
      if (processId.value) updatePositionProcess(processId.value, { currentNode: '科长审核' })
    }
  }
}

// 进入详情时：若岗位需要总结与设想但缺少记录，则自动创建
function ensureSummaryPlanIfNeeded() {
  try {
    const pos = positionsStore.items.find(p => p.id === assessment.value?.targetPositionId)
    if (pos && pos.requireWorkPlan && !summaryPlan.value && processId.value && assessment.value) {
      createSummaryPlan({
        processId: processId.value,
        applicantId: assessment.value.applicantId,
        department: assessment.value.department,
        targetPositionId: assessment.value.targetPositionId
      })
    }
  } catch {}
}

</script>

<template>
  <section>
    <el-page-header @back="() => emit('back')" content="岗位考核详情" />

    <el-descriptions :column="2" border style="margin: 12px 0;">
      <el-descriptions-item label="申请人">{{ getUserName(assessment?.applicantId) }}</el-descriptions-item>
      <el-descriptions-item label="部门/科室">{{ assessment?.department }}</el-descriptions-item>
      <el-descriptions-item label="拟申请岗位技术授权">{{ getPosName(assessment?.targetPositionId) }}</el-descriptions-item>
      <el-descriptions-item label="现工作岗位">{{ assessment?.currentPositionLabel }}</el-descriptions-item>
    </el-descriptions>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="岗位考核" name="assessment">
        <el-form label-width="140px" style="max-width: 1000px;">
          <el-form-item label="汇报内容">
            <el-input :disabled="!canEditAssessment" v-model="assessment.reportContent" type="textarea" :rows="4" />
          </el-form-item>
          <el-form-item label="提问及回答情况">
            <el-input :disabled="!canEditAssessment" v-model="assessment.qaContent" type="textarea" :rows="4" />
          </el-form-item>
          <el-form-item label="考核结果">
            <el-select :disabled="!canEditAssessment" v-model="assessment.finalResult" style="width: 280px;">
              <el-option label="待评定" value="pending" />
              <el-option label="建议给予岗位技术授权" value="suggest_authorize" />
              <el-option label="答辩不合格不予授权" value="failed" />
            </el-select>
          </el-form-item>
          <div style="text-align:right; margin-bottom: 16px;">
            <el-button v-if="canEditAssessment" @click="saveAssessmentShared">保存</el-button>
          </div>

          <h4>考核组签名</h4>
          <el-table :data="assessment?.records || []" size="small" stripe>
            <el-table-column label="考核组成员" min-width="180">
              <template #default="{ row }">{{ getUserName(row.assessorId) }}</template>
            </el-table-column>
            <el-table-column label="签名/日期" min-width="200">
              <template #default="{ row }">
                <div v-if="row.signed">已签名（{{ row.signedAt }}）</div>
                <div v-else>未签名</div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button v-if="canSignAssessment && row.assessorId === props.currentUser.id && !row.signed" size="small" type="primary" @click="signMyAssessment">签名</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div style="text-align:right; margin-top: 12px;">
            <el-button type="primary" @click="finalizeIfReady">刷新结果/推进流程</el-button>
          </div>
        </el-form>
      </el-tab-pane>

      <el-tab-pane v-if="summaryPlan" label="工作总结与设想" name="summary">
        <el-form label-width="180px" style="max-width: 980px;">
          <el-form-item label="姓名">{{ getUserName(assessment?.applicantId) }}</el-form-item>
          <el-form-item label="部门">{{ assessment?.department }}</el-form-item>
          <el-form-item label="岗位名称">{{ getPosName(assessment?.targetPositionId) }}</el-form-item>
          <el-form-item label="岗位培训期间工作总结">
            <el-input v-model="summaryPlan.summaryText" type="textarea" :rows="5" :disabled="!applicantCanEditSummary" />
          </el-form-item>
          <el-form-item label="任新职后工作思路及设想">
            <el-input v-model="summaryPlan.planText" type="textarea" :rows="5" :disabled="!applicantCanEditSummary" />
          </el-form-item>
          <div style="text-align:right;">
            <el-button v-if="applicantCanEditSummary" type="primary" @click="submitSummaryPlan">提交总结与设想</el-button>
          </div>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<style scoped>
</style>


