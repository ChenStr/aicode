<script setup>
import { ref, computed } from 'vue'
import { getActivityById, updateActivityStatus, signIn, getActivityAttendances, createScoreSheets, getActivityScores, archiveActivity } from '../onJobTraining'
import { createAssessment } from '../onJobTrainingAssessments.js'
import { USERS } from '../user'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({ 
  currentUser: { type: Object, required: true },
  activityId: { type: String, required: true }
})
const emit = defineEmits(['back'])

// 获取活动详情
const activity = computed(() => getActivityById(props.activityId))

// 权限判断
const isInstructor = computed(() => activity.value?.instructorId === props.currentUser.id)
const canManage = computed(() => isInstructor.value || ['training_admin', 'section_chief', 'dept_manager'].includes(props.currentUser.role))

// 签到相关
const showSignInDialog = ref(false)
const attendances = ref([])

// 成绩单相关
const showScoreDialog = ref(false)
const scores = ref([])

// 获取签到列表
function loadAttendances() {
  attendances.value = getActivityAttendances(props.activityId)
}

// 获取成绩单
function loadScores() {
  scores.value = getActivityScores(props.activityId)
}

// 开始签到
function startSignIn() {
  showSignInDialog.value = true
  loadAttendances()
}

// 学员签到
function studentSignIn() {
  signIn(props.activityId, props.currentUser.id, props.currentUser.name)
  loadAttendances()
  ElMessage.success('签到成功')
}

// 结束签到，开始培训
function finishSignIn() {
  updateActivityStatus(props.activityId, '进行中')
  showSignInDialog.value = false
  ElMessage.success('培训已开始')
}

// 开始考核
function startAssessment() {
  ElMessageBox.confirm('确定要开始考核吗？将为所有签到的学员创建成绩单和考核记录。', '开始考核', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    createScoreSheets(props.activityId)
    await createAssessment(props.activityId, attendances.value)
    updateActivityStatus(props.activityId, '考核中')
    loadScores()
    ElMessage.success('考核已开始，成绩单和考核记录已创建')
  }).catch(() => {})
}

// 打开成绩单
function openScoreSheet() {
  showScoreDialog.value = true
  loadScores()
}


// 归档活动
function archive() {
  ElMessageBox.confirm('确定要归档此活动吗？归档后将无法修改。', '归档活动', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    archiveActivity(props.activityId)
    ElMessage.success('活动已归档')
  }).catch(() => {})
}

// 获取状态类型
function getStatusType(status) {
  const typeMap = {
    '未开始': 'info',
    '进行中': 'warning',
    '考核中': 'primary',
    '已归档': 'success'
  }
  return typeMap[status] || 'info'
}

// 初始化
loadAttendances()
loadScores()
</script>

<template>
  <section class="on-job-training-detail">
    <div class="page-header">
      <div class="title">
        <span>{{ activity?.name }}</span>
        <el-tag :type="getStatusType(activity?.status)" style="margin-left: 12px;">
          {{ activity?.status }}
        </el-tag>
      </div>
      <el-button @click="emit('back')">返回</el-button>
    </div>

    <!-- 活动基本信息 -->
    <el-card class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>活动信息</span>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="活动名称">{{ activity?.name }}</el-descriptions-item>
        <el-descriptions-item label="课程名称">{{ activity?.courseName }}</el-descriptions-item>
        <el-descriptions-item label="讲师">{{ activity?.instructorName }}</el-descriptions-item>
        <el-descriptions-item label="组织部门">{{ activity?.department }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ activity?.startTime }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ activity?.endTime }}</el-descriptions-item>
        <el-descriptions-item label="课时">{{ activity?.hours }}小时</el-descriptions-item>
        <el-descriptions-item label="培训地点">{{ activity?.location }}</el-descriptions-item>
        <el-descriptions-item label="教室">{{ activity?.classroom }}</el-descriptions-item>
        <el-descriptions-item label="提供单位">{{ activity?.provider }}</el-descriptions-item>
        <el-descriptions-item label="考核方式" :span="2">
          <el-tag v-for="method in activity?.assessmentMethods" :key="method" size="small" style="margin-right: 8px;">
            {{ method }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 操作按钮 -->
    <el-card class="action-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>操作</span>
        </div>
      </template>
      
      <div class="action-buttons">
        <!-- 讲师操作 -->
        <template v-if="isInstructor">
          <el-button 
            v-if="activity?.status === '未开始'" 
            type="primary" 
            @click="startSignIn"
          >
            开始签到
          </el-button>
          <el-button 
            v-if="activity?.status === '进行中'" 
            type="warning" 
            @click="startAssessment"
          >
            开始考核
          </el-button>
          <el-button 
            v-if="activity?.status === '考核中'" 
            type="info" 
            @click="openScoreSheet"
          >
            查看成绩单
          </el-button>
        </template>
        
        <!-- 学员操作 -->
        <template v-else>
          <el-button 
            v-if="activity?.status === '未开始'" 
            type="primary" 
            @click="studentSignIn"
          >
            我要参加
          </el-button>
        </template>
      </div>
    </el-card>

    <!-- 签到列表 -->
    <el-card v-if="attendances.length > 0" class="attendance-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>签到列表 ({{ attendances.length }}人)</span>
        </div>
      </template>
      <el-table :data="attendances" stripe>
        <el-table-column prop="userName" label="姓名" width="120" />
        <el-table-column prop="signedInAt" label="签到时间" width="160" />
      </el-table>
    </el-card>

    <!-- 签到对话框 -->
    <el-dialog v-model="showSignInDialog" title="签到管理" width="500px">
      <div class="sign-in-content">
        <p>当前已签到人数：{{ attendances.length }}人</p>
        <el-table :data="attendances" stripe>
          <el-table-column prop="userName" label="姓名" width="120" />
          <el-table-column prop="signedInAt" label="签到时间" width="160" />
        </el-table>
      </div>
      <template #footer>
        <el-button @click="showSignInDialog = false">关闭</el-button>
        <el-button type="primary" @click="finishSignIn">结束签到，开始培训</el-button>
      </template>
    </el-dialog>

    <!-- 成绩单对话框 -->
    <el-dialog v-model="showScoreDialog" title="成绩单" width="800px">
      <el-table :data="scores" stripe>
        <el-table-column prop="userName" label="学员姓名" width="120" />
        <el-table-column label="笔试成绩" width="120">
          <template #default="{ row }">
            <span>{{ row.writtenScore || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="报告成绩" width="120">
          <template #default="{ row }">
            <span>{{ row.reportScore || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="面试成绩" width="120">
          <template #default="{ row }">
            <span>{{ row.interviewScore || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="是否通过" width="100">
          <template #default="{ row }">
            <el-tag :type="row.passed ? 'success' : 'danger'">
              {{ row.passed ? '通过' : '不通过' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="总体评价" min-width="200">
          <template #default="{ row }">
            <span>{{ row.instructorComment || '-' }}</span>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="showScoreDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.on-job-training-detail {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  display: flex;
  align-items: center;
  font-size: 20px;
  font-weight: 600;
  color: #213547;
}

.info-card, .action-card, .attendance-card {
  margin-bottom: 20px;
}

.card-header {
  font-weight: 600;
  color: #213547;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.sign-in-content {
  padding: 16px 0;
}
</style>
