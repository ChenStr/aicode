<script setup>
import SystemMenu from './components/SystemMenu.vue'
import CourseDefinition from './components/CourseDefinition.vue'
import WorkItemDefinition from './components/WorkItemDefinition.vue'
import TrainingOutlineHistory from './components/TrainingOutlineHistory.vue'
import MtaAuthorizationDefinition from './components/MtaAuthorizationDefinition.vue'
import PositionDefinition from './components/PositionDefinition.vue'
import PositionPlan from './components/PositionPlan.vue'
import AnnualPlanDefinition from './components/AnnualPlanDefinition.vue'
import PlanStatistics from './components/PlanStatistics.vue'
import TrainingManagement from './components/TrainingManagement.vue'
import TrainingGuidanceList from './components/TrainingGuidanceList.vue'
import TrainingGuidanceDetail from './components/TrainingGuidanceDetail.vue'
import PracticeAuditRecords from './components/PracticeAuditRecords.vue'
import PracticeAuditReviews from './components/PracticeAuditReviews.vue'
import MtaProcessList from './components/MtaProcessList.vue'
import MtaApplyDetail from './components/MtaApplyDetail.vue'
import MtaEquivalentDetail from './components/MtaEquivalentDetail.vue'
import MtaExtendDetail from './components/MtaExtendDetail.vue'
import MtaAssessmentList from './components/MtaAssessmentList.vue'
import MtaAssessmentDetail from './components/MtaAssessmentDetail.vue'
import CertTemplateDefinition from './components/CertTemplateDefinition.vue'
import PositionCertTemplateDefinition from './components/PositionCertTemplateDefinition.vue'
import NoPermission from './components/NoPermission.vue'
import MyMtaCerts from './components/MyMtaCerts.vue'
import MyPosition from './components/MyPosition.vue'
import PositionProcessList from './components/PositionProcessList.vue'
import PositionApplyDetail from './components/PositionApplyDetail.vue'
import PositionAssessmentList from './components/PositionAssessmentList.vue'
import PositionAssessmentDetail from './components/PositionAssessmentDetail.vue'
import PositionEquivalentDetail from './components/PositionEquivalentDetail.vue'
import PositionExtendDetail from './components/PositionExtendDetail.vue'
import OnJobTrainingList from './components/OnJobTrainingList.vue'
import OnJobTrainingDetail from './components/OnJobTrainingDetail.vue'
import OnJobTrainingAssessmentList from './components/OnJobTrainingAssessmentList.vue'
import OnJobTrainingAssessmentDetail from './components/OnJobTrainingAssessmentDetail.vue'
import OnJobTrainingScoreSheet from './components/OnJobTrainingScoreSheet.vue'
import TrainingProcessList from './components/TrainingProcessList.vue'
import TrainingEquivalentDetail from './components/TrainingEquivalentDetail.vue'
import MtaQuestionBankList from './components/MtaQuestionBankList.vue'
import MtaQuestionBankDetail from './components/MtaQuestionBankDetail.vue'
import { currentUser, USERS, setCurrentUser } from './user'
import { ref } from 'vue'
import { Reading, Menu } from '@element-plus/icons-vue'
import PositionRevocationList from './components/PositionRevocationList.vue'
import PositionRevocationDetail from './components/PositionRevocationDetail.vue'
import PositionSequence from './components/PositionSequence.vue'
import WorkScopeDefinition from './components/WorkScopeDefinition.vue'
import WorkScopeDetail from './components/WorkScopeDetail.vue'
import WorkDefinition from './components/WorkDefinition.vue'
import WorkProcessList from './components/WorkProcessList.vue'
import WorkApplyDetail from './components/WorkApplyDetail.vue'
import WorkAssessmentList from './components/WorkAssessmentList.vue'
import WorkAssessmentDetail from './components/WorkAssessmentDetail.vue'
import WorkCertTemplateDefinition from './components/WorkCertTemplateDefinition.vue'
import WorkAuthorizationList from './components/WorkAuthorizationList.vue'
import MtaExamPaperList from './components/MtaExamPaperList.vue'
import MtaExamPaperDetail from './components/MtaExamPaperDetail.vue'
import MtaExamPaperPreview from './components/MtaExamPaperPreview.vue'
import OnJobTrainingQuestionBankList from './components/OnJobTrainingQuestionBankList.vue'
import OnJobTrainingQuestionBankDetail from './components/OnJobTrainingQuestionBankDetail.vue'
import OnJobTrainingExamPaperList from './components/OnJobTrainingExamPaperList.vue'
import OnJobTrainingExamPaperDetail from './components/OnJobTrainingExamPaperDetail.vue'
import OnJobTrainingExamPaperPreview from './components/OnJobTrainingExamPaperPreview.vue'

const currentPage = ref('')
const practiceAuditFilter = ref(null)
const applyDetailTargetId = ref('')
const applyDetailProcessInfo = ref(null)
const equivalentDetailProcessInfo = ref(null)
const extendDetailProcessInfo = ref(null)
const assessmentDetailId = ref('')
const positionAssessmentDetailId = ref('')
const workAssessmentDetailId = ref('')
const workAssessmentDetailData = ref(null)
const positionApplyDetailTargetId = ref('')
const positionApplyDetailProcessInfo = ref(null)
const positionEquivalentDetailInfo = ref(null)
const positionExtendDetailInfo = ref(null)
const onJobTrainingDetailId = ref('')
const onJobTrainingAssessmentDetailId = ref('')
const onJobTrainingScoreSheetId = ref('')
const trainingGuidanceDetailId = ref('')
const positionRevocationDetailId = ref('')
const trainingProcessDetailData = ref(null)
const isNewTrainingProcess = ref(false)
const mtaQuestionBankDetailData = ref(null)
const isNewMtaQuestion = ref(false)
const workScopeDetailId = ref('')
const workApplyTargetId = ref('')
const examPaperDetailVisible = ref(false)
const examPaperDetailData = ref(null)
const examPaperPreviewVisible = ref(false)
const examPaperPreviewData = ref(null)
const onJobQuestionDetailVisible = ref(false)
const onJobQuestionDetailData = ref(null)
const onJobExamPaperDetailVisible = ref(false)
const onJobExamPaperDetailData = ref(null)
const onJobExamPaperPreviewVisible = ref(false)
const onJobExamPaperPreviewData = ref(null)

function handleNavigateToPracticeAudit(filter) {
  practiceAuditFilter.value = filter
  currentPage.value = '实践考核记录'
}

function handleOpenApplyDetail(targetId, processInfo = null) {
  applyDetailTargetId.value = targetId
  applyDetailProcessInfo.value = processInfo
  currentPage.value = '授权申请详情'
}

function handleOpenEquivalentDetail(processInfo) {
  equivalentDetailProcessInfo.value = processInfo
  currentPage.value = '等效流程详情'
}

function handleOpenExtendDetail(processInfo) {
  extendDetailProcessInfo.value = processInfo
  currentPage.value = '延期流程详情'
}

function handleAuditComplete() {
  // 审核完成后返回流程列表
  currentPage.value = '发起流程'
  applyDetailProcessInfo.value = null
  equivalentDetailProcessInfo.value = null
  extendDetailProcessInfo.value = null
}

function handleOpenAssessmentDetail(assessmentId) {
  assessmentDetailId.value = assessmentId
  currentPage.value = 'MTA考核详情'
}
function handleOpenPositionAssessmentDetail(id) {
  positionAssessmentDetailId.value = id
  currentPage.value = '岗位考核详情'
}

function handleAssessmentComplete() {
  // 考核完成后返回考核列表
  currentPage.value = 'MTA考核'
  assessmentDetailId.value = ''
}

function handleOpenPositionApplyDetail(targetId, processInfo = null) {
  positionApplyDetailTargetId.value = targetId
  positionApplyDetailProcessInfo.value = processInfo
  currentPage.value = '岗位申请详情'
}

function handleOpenPositionEquivalentDetail(processInfo) {
  positionEquivalentDetailInfo.value = processInfo
  currentPage.value = '岗位等效详情'
}

function handleOpenPositionExtendDetail(processInfo) {
  positionExtendDetailInfo.value = processInfo
  currentPage.value = '岗位延期详情'
}

function handleOpenOnJobTrainingDetail(activity) {
  onJobTrainingDetailId.value = activity.id
  currentPage.value = '在岗培训详情'
}

function handlePositionAuditComplete() {
  // 审核完成后返回流程列表
  currentPage.value = '岗位发起流程'
  positionApplyDetailProcessInfo.value = null
  positionEquivalentDetailInfo.value = null
  positionExtendDetailInfo.value = null
}

function handleOnJobTrainingBack() {
  currentPage.value = '在岗培训'
  onJobTrainingDetailId.value = ''
}

function handleOpenOnJobTrainingAssessmentDetail(assessment) {
  onJobTrainingAssessmentDetailId.value = assessment.id
  currentPage.value = '在岗培训考核详情'
}

function handleOnJobTrainingAssessmentBack() {
  currentPage.value = '在岗培训考核'
  onJobTrainingAssessmentDetailId.value = ''
}

function handleOpenOnJobTrainingScoreSheet(studentAssessment) {
  onJobTrainingScoreSheetId.value = studentAssessment.id
  currentPage.value = '在岗培训成绩单'
}

function handleOnJobTrainingScoreSheetBack() {
  currentPage.value = '在岗培训考核详情'
  onJobTrainingScoreSheetId.value = ''
}

// 培训流程相关事件处理
function handleOpenTrainingProcessDetail(data) {
  if (data.isNew) {
    trainingProcessDetailData.value = { type: data.type }
    isNewTrainingProcess.value = true
    currentPage.value = '培训项目等效详情'
  } else {
    trainingProcessDetailData.value = data.process
    isNewTrainingProcess.value = false
    currentPage.value = '培训项目等效详情'
  }
}

function handleTrainingProcessBack() {
  currentPage.value = '培训发起流程'
  trainingProcessDetailData.value = null
  isNewTrainingProcess.value = false
}

// MTA考核笔试题库相关事件处理
function handleOpenMtaQuestionDetail(data) {
  if (data.isNew) {
    mtaQuestionBankDetailData.value = null
    isNewMtaQuestion.value = true
    currentPage.value = 'MTA考核笔试题库详情'
  } else {
    mtaQuestionBankDetailData.value = data.question
    isNewMtaQuestion.value = false
    currentPage.value = 'MTA考核笔试题库详情'
  }
}

function handleMtaQuestionBack() {
  currentPage.value = 'MTA考核题目定义'
  mtaQuestionBankDetailData.value = null
  isNewMtaQuestion.value = false
}

function openPositionRevocationDetail(id) {
  positionRevocationDetailId.value = id
  currentPage.value = '岗位撤销详情'
}

function openTrainingGuidanceDetail(id) {
  trainingGuidanceDetailId.value = id
  currentPage.value = '培训指导详情'
}

function openWorkScopeDetail(id) {
  workScopeDetailId.value = id
  currentPage.value = '工作范围详情'
}

function openWorkApplyDetail(id) {
  workApplyTargetId.value = id
  currentPage.value = '工作申请详情'
}

function openWorkAssessmentDetail(assessment) {
  workAssessmentDetailId.value = assessment.id
  workAssessmentDetailData.value = assessment
  currentPage.value = '工作考核详情'
}

function handleWorkAssessmentComplete() {
  ElMessage.success('工作考核已完成，流程将流转至科长审批')
  // 刷新工作考核列表数据
  workAssessmentDetailData.value = null
  currentPage.value = '工作考核'
}

// MTA考核笔试试卷相关事件处理
function handleOpenExamPaperDetail(data) {
  examPaperDetailData.value = data
  examPaperDetailVisible.value = true
}

function handleCloseExamPaperDetail() {
  examPaperDetailVisible.value = false
  examPaperDetailData.value = null
}

function handlePreviewExamPaper(data) {
  examPaperPreviewData.value = data
  examPaperPreviewVisible.value = true
}

function handleCloseExamPaperPreview() {
  examPaperPreviewVisible.value = false
  examPaperPreviewData.value = null
}

// 在岗培训考核笔试题库相关事件处理
function handleOpenOnJobQuestionDetail(data) {
  onJobQuestionDetailData.value = data
  onJobQuestionDetailVisible.value = true
}

function handleCloseOnJobQuestionDetail() {
  onJobQuestionDetailVisible.value = false
  onJobQuestionDetailData.value = null
}

// 在岗培训考核笔试试卷相关事件处理
function handleOpenOnJobExamPaperDetail(data) {
  onJobExamPaperDetailData.value = data
  onJobExamPaperDetailVisible.value = true
}

function handleCloseOnJobExamPaperDetail() {
  onJobExamPaperDetailVisible.value = false
  onJobExamPaperDetailData.value = null
}

function handlePreviewOnJobExamPaper(data) {
  onJobExamPaperPreviewData.value = data
  onJobExamPaperPreviewVisible.value = true
}

function handleCloseOnJobExamPaperPreview() {
  onJobExamPaperPreviewVisible.value = false
  onJobExamPaperPreviewData.value = null
}
</script>

<template>
  <div class="layout">
    <SystemMenu :current-user="currentUser" @select="(k)=> currentPage = k" />
    <main class="content">
      <div class="topbar">
        <div class="topbar-left">
          <el-form-item label="当前人员">
            <el-select :value="currentUser.id" @change="setCurrentUser" placeholder="选择用户">
              <el-option
                v-for="u in USERS"
                :key="u.id"
                :value="u.id"
                :label="`${u.name}（${u.department}｜${u.roleLabel}）`"
              />
            </el-select>
          </el-form-item>
        </div>
        <div class="topbar-right">
          <el-avatar :src="currentUser.avatar" :size="32" />
          <span class="user">{{ currentUser.name }}（{{ currentUser.department }}｜{{ currentUser.roleLabel }}）</span>
        </div>
      </div>

      <template v-if="currentPage === '工作项定义'">
        <WorkItemDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '课程定义'">
        <CourseDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '岗位培训大纲历史'">
        <TrainingOutlineHistory :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === 'MTA授权定义'">
        <MtaAuthorizationDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '岗位定义'">
        <PositionDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '我的岗位'">
        <MyPosition />
      </template>
      <template v-else-if="currentPage === '岗位规划'">
        <PositionPlan :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '计划定义'">
        <AnnualPlanDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '计划统计'">
        <PlanStatistics :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '培训管理'">
        <TrainingManagement :current-user="currentUser" @navigate-to-practice-audit="handleNavigateToPracticeAudit" />
      </template>
      <template v-else-if="currentPage === '在岗培训'">
        <OnJobTrainingList :current-user="currentUser" @open-detail="handleOpenOnJobTrainingDetail" />
      </template>
      <template v-else-if="currentPage === '在岗培训详情'">
        <OnJobTrainingDetail 
          :current-user="currentUser" 
          :activity-id="onJobTrainingDetailId"
          @back="handleOnJobTrainingBack" 
        />
      </template>
      <template v-else-if="currentPage === '在岗培训考核'">
        <OnJobTrainingAssessmentList :current-user="currentUser" @open-detail="handleOpenOnJobTrainingAssessmentDetail" />
      </template>
      <template v-else-if="currentPage === '在岗培训考核详情'">
        <OnJobTrainingAssessmentDetail 
          :current-user="currentUser" 
          :assessment-id="onJobTrainingAssessmentDetailId"
          @back="handleOnJobTrainingAssessmentBack"
          @open-score-sheet="handleOpenOnJobTrainingScoreSheet"
        />
      </template>
      <template v-else-if="currentPage === '在岗培训成绩单'">
        <OnJobTrainingScoreSheet 
          :current-user="currentUser" 
          :student-assessment-id="onJobTrainingScoreSheetId"
          @back="handleOnJobTrainingScoreSheetBack"
        />
      </template>
      <template v-else-if="currentPage === '培训发起流程'">
        <TrainingProcessList 
          :current-user="currentUser"
          @open-process-detail="handleOpenTrainingProcessDetail"
        />
      </template>
      <template v-else-if="currentPage === '培训项目等效详情'">
        <TrainingEquivalentDetail 
          :current-user="currentUser"
          :process-data="trainingProcessDetailData"
          :is-new="isNewTrainingProcess"
          @back="handleTrainingProcessBack"
        />
      </template>
      <template v-else-if="currentPage === 'MTA考核题目定义'">
        <MtaQuestionBankList 
          :current-user="currentUser"
          @open-question-detail="handleOpenMtaQuestionDetail"
        />
      </template>
      <template v-else-if="currentPage === 'MTA考核笔试题库详情'">
        <MtaQuestionBankDetail 
          :current-user="currentUser"
          :question-data="mtaQuestionBankDetailData"
          :is-new="isNewMtaQuestion"
          @back="handleMtaQuestionBack"
        />
      </template>
      <template v-else-if="currentPage === '培训指导'">
        <TrainingGuidanceList :current-user="currentUser" @open-detail="openTrainingGuidanceDetail" />
      </template>
      <template v-else-if="currentPage === '培训指导详情'">
        <TrainingGuidanceDetail 
          :current-user="currentUser" 
          :guidance-id="trainingGuidanceDetailId"
          @back="currentPage='培训指导'"
          @approved="currentPage='培训指导'"
        />
      </template>
      <template v-else-if="currentPage === '实践考核记录'">
        <PracticeAuditRecords :current-user="currentUser" :initial-filter="practiceAuditFilter" />
      </template>
      <template v-else-if="currentPage === '实践考核记录评价'">
        <PracticeAuditReviews :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '发起流程'">
        <MtaProcessList :current-user="currentUser" @open-apply-detail="handleOpenApplyDetail" @open-equivalent-detail="handleOpenEquivalentDetail" @open-extend-detail="handleOpenExtendDetail" />
      </template>
      <template v-else-if="currentPage === '授权申请详情'">
        <MtaApplyDetail 
          :current-user="currentUser" 
          :target-mta-id="applyDetailTargetId" 
          :process-info="applyDetailProcessInfo"
          @back="currentPage='发起流程'" 
          @audit-complete="handleAuditComplete"
        />
      </template>
      <template v-else-if="currentPage === '等效流程详情'">
        <MtaEquivalentDetail 
          :current-user="currentUser" 
          :process-info="equivalentDetailProcessInfo"
          @back="currentPage='发起流程'" 
          @audit-complete="handleAuditComplete"
        />
      </template>
      <template v-else-if="currentPage === '延期流程详情'">
        <MtaExtendDetail 
          :current-user="currentUser" 
          :process-info="extendDetailProcessInfo"
          @back="currentPage='发起流程'" 
          @audit-complete="handleAuditComplete"
        />
      </template>
      <template v-else-if="currentPage === 'MTA考核'">
        <MtaAssessmentList :current-user="currentUser" @open-assessment-detail="handleOpenAssessmentDetail" />
      </template>
      <template v-else-if="currentPage === 'MTA考核详情'">
        <MtaAssessmentDetail 
          :current-user="currentUser" 
          :assessment-id="assessmentDetailId"
          @back="currentPage='MTA考核'" 
          @assessment-complete="handleAssessmentComplete"
        />
      </template>
      <template v-else-if="currentPage === '授权证书模版定义'">
        <template v-if="['section_chief','training_admin','dept_manager'].includes(currentUser.role)">
          <CertTemplateDefinition :current-user="currentUser" />
        </template>
        <template v-else>
          <NoPermission />
        </template>
      </template>
      <template v-else-if="currentPage === '岗位证书模版定义'">
        <template v-if="['section_chief','training_admin','dept_manager'].includes(currentUser.role)">
          <PositionCertTemplateDefinition :current-user="currentUser" />
        </template>
        <template v-else>
          <NoPermission />
        </template>
      </template>
      <template v-else-if="currentPage === '我的MTA授权'">
        <MyMtaCerts :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '岗位发起流程'">
        <PositionProcessList :current-user="currentUser" @open-apply-detail="handleOpenPositionApplyDetail" @open-equivalent-detail="handleOpenPositionEquivalentDetail" @open-extend-detail="handleOpenPositionExtendDetail" />
      </template>
      <template v-else-if="currentPage === '岗位申请详情'">
        <PositionApplyDetail 
          :current-user="currentUser" 
          :target-position-id="positionApplyDetailTargetId" 
          :process-info="positionApplyDetailProcessInfo"
          @back="currentPage='岗位发起流程'" 
          @audit-complete="handlePositionAuditComplete"
        />
      </template>
      <template v-else-if="currentPage === '岗位等效详情'">
        <PositionEquivalentDetail 
          :current-user="currentUser" 
          :info="positionEquivalentDetailInfo"
          @back="currentPage='岗位发起流程'" 
          @audit-complete="handlePositionAuditComplete"
        />
      </template>
      <template v-else-if="currentPage === '岗位延期详情'">
        <PositionExtendDetail 
          :current-user="currentUser" 
          :info="positionExtendDetailInfo"
          @back="currentPage='岗位发起流程'" 
          @audit-complete="handlePositionAuditComplete"
        />
      </template>
      <template v-else-if="currentPage === '岗位考核'">
        <PositionAssessmentList :current-user="currentUser" @open-detail="handleOpenPositionAssessmentDetail" />
      </template>
      <template v-else-if="currentPage === '岗位考核详情'">
        <PositionAssessmentDetail :current-user="currentUser" :assessment-id="positionAssessmentDetailId" @back="currentPage='岗位考核'" />
      </template>
      <template v-else-if="currentPage === '岗位撤销'">
        <PositionRevocationList :current-user="currentUser" @open-detail="openPositionRevocationDetail" />
      </template>
      <template v-else-if="currentPage === '岗位撤销详情'">
        <PositionRevocationDetail :current-user="currentUser" :revocation-id="positionRevocationDetailId" @back="currentPage='岗位撤销'" />
      </template>
      <template v-else-if="currentPage === '岗位发展序列'">
        <PositionSequence :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '工作范围定义'">
        <WorkScopeDefinition :current-user="currentUser" @open-detail="openWorkScopeDetail" />
      </template>
      <template v-else-if="currentPage === '工作范围详情'">
        <WorkScopeDetail 
          :current-user="currentUser" 
          :scope-id="workScopeDetailId"
          @back="currentPage='工作考核评价（管理端）'"
        />
      </template>
      <template v-else-if="currentPage === '工作定义'">
        <WorkDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '工作发起流程'">
        <WorkProcessList :current-user="currentUser" @open-apply-detail="openWorkApplyDetail" />
      </template>
      <template v-else-if="currentPage === '工作申请详情'">
        <WorkApplyDetail :current-user="currentUser" :target-work-id="workApplyTargetId" @back="currentPage='工作发起流程'" />
      </template>
      <template v-else-if="currentPage === '工作考核'">
        <WorkAssessmentList :current-user="currentUser" @view-detail="openWorkAssessmentDetail" />
      </template>
      <template v-else-if="currentPage === '工作考核详情'">
        <WorkAssessmentDetail :current-user="currentUser" :assessment="workAssessmentDetailData" @back="currentPage='工作考核'" @assessment-complete="handleWorkAssessmentComplete" />
      </template>
      <template v-else-if="currentPage === '工作证书模版定义'">
        <WorkCertTemplateDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '工作授权'">
        <WorkAuthorizationList :current-user="currentUser" @reapply="(workId)=>{ workApplyTargetId = workId; currentPage='工作申请详情' }" />
      </template>
      <template v-else-if="currentPage === 'MTA考核笔试试卷'">
        <MtaExamPaperList 
          :current-user="currentUser"
          @open-paper-detail="handleOpenExamPaperDetail"
          @preview-paper="handlePreviewExamPaper"
        />
      </template>
      <template v-else-if="currentPage === '在岗培训考核笔试题库'">
        <OnJobTrainingQuestionBankList 
          :current-user="currentUser"
          @open-question-detail="handleOpenOnJobQuestionDetail"
        />
      </template>
      <template v-else-if="currentPage === '在岗培训考核笔试试卷'">
        <OnJobTrainingExamPaperList 
          :current-user="currentUser"
          @open-paper-detail="handleOpenOnJobExamPaperDetail"
          @preview-paper="handlePreviewOnJobExamPaper"
        />
      </template>
      <template v-else>
        <el-card class="welcome-card">
          <template #header>
            <div class="card-header">
              <el-icon><Reading /></el-icon>
              <span>欢迎使用培训授权</span>
            </div>
          </template>
          <div class="welcome-content">
            <el-icon class="welcome-icon"><Menu /></el-icon>
            <p>请选择左侧菜单开始使用系统</p>
          </div>
        </el-card>
      </template>
    </main>

    <!-- MTA考核笔试试卷详情模态框 -->
    <MtaExamPaperDetail
      :visible="examPaperDetailVisible"
      :paper-id="examPaperDetailData?.paper?.id"
      :current-user="currentUser"
      @close="handleCloseExamPaperDetail"
      @preview="handlePreviewExamPaper"
    />

    <!-- MTA考核笔试试卷预览模态框 -->
    <MtaExamPaperPreview
      :visible="examPaperPreviewVisible"
      :paper-data="examPaperPreviewData"
      @close="handleCloseExamPaperPreview"
    />

    <!-- 在岗培训考核笔试题库详情模态框 -->
    <OnJobTrainingQuestionBankDetail
      :visible="onJobQuestionDetailVisible"
      :question-id="onJobQuestionDetailData?.question?.id"
      :current-user="currentUser"
      @close="handleCloseOnJobQuestionDetail"
    />

    <!-- 在岗培训考核笔试试卷详情模态框 -->
    <OnJobTrainingExamPaperDetail
      :visible="onJobExamPaperDetailVisible"
      :paper-id="onJobExamPaperDetailData?.paper?.id"
      :current-user="currentUser"
      @close="handleCloseOnJobExamPaperDetail"
      @preview="handlePreviewOnJobExamPaper"
    />

    <!-- 在岗培训考核笔试试卷预览模态框 -->
    <OnJobTrainingExamPaperPreview
      :visible="onJobExamPaperPreviewVisible"
      :paper-data="onJobExamPaperPreviewData"
      @close="handleCloseOnJobExamPaperPreview"
    />
  </div>
  
</template>

<style scoped>
.layout {
  display: flex;
  width: 100%;
  height: 100vh;
  min-width: 0;
  overflow: hidden;
}
.content {
  flex: 1;
  min-width: 0;
  max-width: calc(100vw - 280px);
  padding: 24px;
  text-align: left;
  overflow-x: auto;
}
.topbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.06);
  margin-bottom: 16px;
}
.topbar-left { display: flex; align-items: center; gap: 12px; }
.field { display: inline-flex; align-items: center; gap: 8px; color: #213547; }
.label { font-size: 14px; opacity: .8; }
.select { height: 32px; padding: 0 8px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; }
.topbar-right { display: flex; align-items: center; gap: 8px; color: #213547; }
.avatar-img { width: 28px; height: 28px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.avatar { font-size: 18px; }
.user { font-weight: 600; }

.welcome-card {
  margin-top: 40px;
  text-align: center;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
}

.welcome-content {
  padding: 40px 20px;
}

.welcome-icon {
  font-size: 64px;
  color: #409eff;
  margin-bottom: 20px;
}

.welcome-content p {
  font-size: 16px;
  color: #666;
  margin: 0;
}
</style>
