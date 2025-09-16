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
import MyMtaCerts from './components/MyMtaCerts.vue'
import MyPosition from './components/MyPosition.vue'
import PositionProcessList from './components/PositionProcessList.vue'
import PositionApplyDetail from './components/PositionApplyDetail.vue'
import { currentUser, USERS, setCurrentUser } from './user'
import { ref } from 'vue'
import { Reading, Menu } from '@element-plus/icons-vue'

const currentPage = ref('')
const practiceAuditFilter = ref(null)
const applyDetailTargetId = ref('')
const applyDetailProcessInfo = ref(null)
const equivalentDetailProcessInfo = ref(null)
const extendDetailProcessInfo = ref(null)
const assessmentDetailId = ref('')
const positionApplyDetailTargetId = ref('')
const positionApplyDetailProcessInfo = ref(null)
const trainingGuidanceDetailId = ref('')

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

function handlePositionAuditComplete() {
  // 审核完成后返回流程列表
  currentPage.value = '岗位发起流程'
  positionApplyDetailProcessInfo.value = null
}

function openTrainingGuidanceDetail(id) {
  trainingGuidanceDetailId.value = id
  currentPage.value = '培训指导详情'
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
        <CertTemplateDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '我的MTA授权'">
        <MyMtaCerts :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '岗位发起流程'">
        <PositionProcessList :current-user="currentUser" @open-apply-detail="handleOpenPositionApplyDetail" />
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
