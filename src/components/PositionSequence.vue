<script setup>
import { ref, computed } from 'vue'
import { positionsStore, listPositionsByDept } from '../positions'
import { mtaAuthsStore } from '../mtaAuths'
import { coursesStore } from '../courses'
import { workItemsStore } from '../workItems'
import { currentUser } from '../user'
import { listMyPositionProcesses } from '../positionProcesses'
import { listMyCourseScores, listMyPracticeAudits } from '../trainingRecords'
import { mtaProcessesStore } from '../mtaProcesses'

const props = defineProps({ currentUser: { type: Object, required: true } })

// 岗位详情弹窗
const positionDetailDialog = ref(false)
const selectedPosition = ref(null)

// MTA详情弹窗
const mtaDetailDialog = ref(false)
const selectedMta = ref(null)

// 获取当前用户所在部门的所有岗位
const departmentPositions = computed(() => {
  return listPositionsByDept(props.currentUser.department)
})

// 获取当前用户的最新岗位（从已批准的岗位流程中获取）
const currentUserPosition = computed(() => {
  const processes = listMyPositionProcesses(props.currentUser.id).filter(p => p.status === 'approved')
  if (!processes.length) return null
  
  // 取最新的已批准岗位
  const latest = processes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]
  return positionsStore.items.find(p => p.id === latest.targetPositionId) || null
})

// 构建岗位发展序列图
const positionSequence = computed(() => {
  const positions = departmentPositions.value
  if (!positions.length) return []
  
  // 按层级分组
  const levels = {}
  positions.forEach(pos => {
    const level = pos.level || '未分级'
    if (!levels[level]) levels[level] = []
    levels[level].push({
      ...pos,
      isCurrentUser: currentUserPosition.value?.id === pos.id
    })
  })
  
  // 转换为数组并按层级排序
  return Object.keys(levels)
    .sort((a, b) => {
      // 简单的层级排序：一级 < 二级 < 三级
      const levelOrder = { '一级': 1, '二级': 2, '三级': 3, '四级': 4, '五级': 5 }
      return (levelOrder[a] || 999) - (levelOrder[b] || 999)
    })
    .map(level => ({
      level,
      positions: levels[level]
    }))
})

// 获取课程名称
function getCourseName(courseId) {
  const course = coursesStore.courses?.find(c => c.id === courseId)
  return course ? course.name : courseId
}

// 获取工作项名称
function getWorkItemName(workItemId) {
  const workItem = workItemsStore.items?.find(w => w.id === workItemId)
  return workItem ? workItem.name : workItemId
}

// 获取MTA名称
function getMtaName(mtaId) {
  const mta = mtaAuthsStore.items?.find(m => m.id === mtaId)
  return mta ? `${mta.techName}（${mta.code}）` : mtaId
}

// 获取用户已获得的MTA授权（有效期内）
const userValidMtaIds = computed(() => {
  const now = new Date().toISOString().slice(0,10)
  const processes = (mtaProcessesStore.processes || []).filter(p => 
    p.userId === props.currentUser.id && 
    p.status === 'approved' && 
    p.issuedCert && 
    p.issuedCert.mtaId
  )
  
  return new Set(processes.map(p => {
    const issued = p.issuedCert.issuedAt
    const years = Number(p.issuedCert.expireYears) || 1
    if (!issued) return null
    
    const expireDate = new Date(issued)
    expireDate.setFullYear(expireDate.getFullYear() + years)
    const expireAt = expireDate.toISOString().slice(0,10)
    
    return (expireAt >= now) ? p.issuedCert.mtaId : null
  }).filter(Boolean))
})

// 获取用户课程成绩
const userCourseResults = computed(() => {
  const scores = listMyCourseScores(props.currentUser.id)
  const resultMap = new Map()
  scores.forEach(score => {
    resultMap.set(score.courseId, score.result)
  })
  return resultMap
})

// 获取用户实践完成情况
const userPracticeCounts = computed(() => {
  const audits = listMyPracticeAudits(props.currentUser.id) || []
  const assessed = audits.filter(a => a.status === 'assessed')
  const countMap = new Map()
  assessed.forEach(a => {
    const count = countMap.get(a.workItemId) || 0
    countMap.set(a.workItemId, count + 1)
  })
  return countMap
})

// 检查用户是否已获得MTA授权
function hasMtaAuth(mtaId) {
  return userValidMtaIds.value.has(mtaId)
}

// 检查用户是否已通过课程
function hasPassedCourse(courseId) {
  return userCourseResults.value.get(courseId) === '通过'
}

// 检查用户是否已完成实践
function hasCompletedPractice(workItemId, minTimes = 1) {
  const count = userPracticeCounts.value.get(workItemId) || 0
  return count >= minTimes
}

// 打开岗位详情
function openPositionDetail(position) {
  selectedPosition.value = position
  positionDetailDialog.value = true
}

// 打开MTA详情
function openMtaDetail(mtaId) {
  selectedMta.value = mtaAuthsStore.items.find(m => m.id === mtaId)
  mtaDetailDialog.value = true
}

// 关闭弹窗
function closePositionDetail() {
  positionDetailDialog.value = false
  selectedPosition.value = null
}

function closeMtaDetail() {
  mtaDetailDialog.value = false
  selectedMta.value = null
}
</script>

<template>
  <section class="position-sequence">
    <div class="page-header">
      <h2>岗位发展序列</h2>
      <div class="user-info">
        <span>当前用户：{{ currentUser.name }}</span>
        <span>部门：{{ currentUser.department }}</span>
        <span v-if="currentUserPosition" class="current-position">
          当前岗位：{{ currentUserPosition.name }}
        </span>
      </div>
    </div>

    <!-- 岗位发展序列图 -->
    <div class="sequence-container">
      <div v-for="level in positionSequence" :key="level.level" class="level-row">
        <div class="level-label">{{ level.level }}</div>
        <div class="positions-row">
          <div 
            v-for="position in level.positions" 
            :key="position.id"
            class="position-card"
            :class="{ 'current-user': position.isCurrentUser }"
            @click="openPositionDetail(position)"
          >
            <div class="position-name">{{ position.name }}</div>
            <div class="position-level">{{ position.level }}</div>
            <div v-if="position.isCurrentUser" class="current-badge">当前岗位</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 岗位详情弹窗 -->
    <el-dialog v-model="positionDetailDialog" title="岗位详情" width="800px">
      <div v-if="selectedPosition" class="position-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="岗位名称">{{ selectedPosition.name }}</el-descriptions-item>
          <el-descriptions-item label="岗位等级">{{ selectedPosition.level }}</el-descriptions-item>
          <el-descriptions-item label="上级岗位">{{ selectedPosition.parentPosition || '-' }}</el-descriptions-item>
          <el-descriptions-item label="所属部门">{{ selectedPosition.department }}</el-descriptions-item>
          <el-descriptions-item label="岗位描述" :span="2">{{ selectedPosition.description }}</el-descriptions-item>
        </el-descriptions>

        <!-- MTA授权要求 -->
        <el-card class="detail-section" shadow="never">
          <template #header>
            <div class="section-header">MTA授权要求</div>
          </template>
          <div v-if="selectedPosition.mtaAuthorizations?.items?.length">
            <div class="requirement-info">
              至少选择 {{ selectedPosition.mtaAuthorizations.minSelect || 0 }} 项 MTA 授权
            </div>
            <div class="mta-list">
              <div 
                v-for="item in selectedPosition.mtaAuthorizations.items" 
                :key="item.id"
                class="mta-item"
                :class="{ 'completed': hasMtaAuth(item.mtaId) }"
                @click="openMtaDetail(item.mtaId)"
              >
                <el-tag :type="item.isRequired ? 'danger' : 'info'" size="small">
                  {{ item.isRequired ? '必选' : '可选' }}
                </el-tag>
                <span class="mta-name">{{ getMtaName(item.mtaId) }}</span>
                <el-icon v-if="hasMtaAuth(item.mtaId)" class="completed-icon" type="success"><Check /></el-icon>
                <el-icon v-else class="click-icon"><ArrowRight /></el-icon>
              </div>
            </div>
          </div>
          <div v-else class="no-requirements">无MTA授权要求</div>
        </el-card>

        <!-- 特种作业证书要求 -->
        <el-card class="detail-section" shadow="never">
          <template #header>
            <div class="section-header">特种作业证书要求</div>
          </template>
          <div v-if="selectedPosition.specialCertificates?.items?.length">
            <div class="requirement-info">
              至少选择 {{ selectedPosition.specialCertificates.minSelect || 0 }} 项特种作业证书
            </div>
            <div class="cert-list">
              <div v-for="item in selectedPosition.specialCertificates.items" :key="item.id" class="cert-item">
                <el-tag :type="item.isRequired ? 'danger' : 'info'" size="small">
                  {{ item.isRequired ? '必选' : '可选' }}
                </el-tag>
                <span>{{ item.certId }}</span>
              </div>
            </div>
          </div>
          <div v-else class="no-requirements">无特种作业证书要求</div>
        </el-card>

        <!-- 课程要求 -->
        <el-card class="detail-section" shadow="never">
          <template #header>
            <div class="section-header">课程要求</div>
          </template>
          <div v-if="selectedPosition.courses?.length">
            <div class="course-list">
              <div 
                v-for="courseId in selectedPosition.courses" 
                :key="courseId" 
                class="course-item"
                :class="{ 'completed': hasPassedCourse(courseId) }"
              >
                <span>{{ getCourseName(courseId) }}</span>
                <el-icon v-if="hasPassedCourse(courseId)" class="completed-icon" type="success"><Check /></el-icon>
              </div>
            </div>
          </div>
          <div v-else class="no-requirements">无课程要求</div>
        </el-card>

        <!-- 实践要求 -->
        <el-card class="detail-section" shadow="never">
          <template #header>
            <div class="section-header">实践要求</div>
          </template>
          <div v-if="selectedPosition.skillPractices?.items?.length">
            <div class="requirement-info">
              至少选择 {{ selectedPosition.skillPractices.minSelect || 0 }} 项实践项目，
              至少完成 {{ selectedPosition.skillPractices.minTimes || 0 }} 次
            </div>
            <div class="practice-list">
              <div 
                v-for="item in selectedPosition.skillPractices.items" 
                :key="item.id" 
                class="practice-item"
                :class="{ 'completed': hasCompletedPractice(item.workItemId) }"
              >
                <el-tag :type="item.isRequired ? 'danger' : 'info'" size="small">
                  {{ item.isRequired ? '必选' : '可选' }}
                </el-tag>
                <span>{{ getWorkItemName(item.workItemId) }}</span>
                <el-icon v-if="hasCompletedPractice(item.workItemId)" class="completed-icon" type="success"><Check /></el-icon>
              </div>
            </div>
          </div>
          <div v-else class="no-requirements">无实践要求</div>
        </el-card>
      </div>
      <template #footer>
        <el-button @click="closePositionDetail">关闭</el-button>
      </template>
    </el-dialog>

    <!-- MTA详情弹窗 -->
    <el-dialog v-model="mtaDetailDialog" title="MTA授权详情" width="700px">
      <div v-if="selectedMta" class="mta-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="技术名称">{{ selectedMta.techName }}</el-descriptions-item>
          <el-descriptions-item label="授权代码">{{ selectedMta.code }}</el-descriptions-item>
          <el-descriptions-item label="项目名称">{{ selectedMta.projectName }}</el-descriptions-item>
          <el-descriptions-item label="等级">{{ selectedMta.level }}</el-descriptions-item>
          <el-descriptions-item label="学时">{{ selectedMta.hours }}</el-descriptions-item>
          <el-descriptions-item label="所属部门">{{ selectedMta.department }}</el-descriptions-item>
        </el-descriptions>

        <!-- MTA课程要求 -->
        <el-card class="detail-section" shadow="never">
          <template #header>
            <div class="section-header">课程要求</div>
          </template>
          <div v-if="selectedMta.courses?.length">
            <div class="course-list">
              <div 
                v-for="courseId in selectedMta.courses" 
                :key="courseId" 
                class="course-item"
                :class="{ 'completed': hasPassedCourse(courseId) }"
              >
                <span>{{ getCourseName(courseId) }}</span>
                <el-icon v-if="hasPassedCourse(courseId)" class="completed-icon" type="success"><Check /></el-icon>
              </div>
            </div>
          </div>
          <div v-else class="no-requirements">无课程要求</div>
        </el-card>

        <!-- MTA实践要求 -->
        <el-card class="detail-section" shadow="never">
          <template #header>
            <div class="section-header">实践要求</div>
          </template>
          <div v-if="selectedMta.skillPractices?.items?.length">
            <div class="requirement-info">
              至少选择 {{ selectedMta.skillPractices.minSelect || 0 }} 项技能实践，
              至少完成 {{ selectedMta.skillPractices.minTimes || 0 }} 次
            </div>
            <div class="practice-list">
              <div 
                v-for="item in selectedMta.skillPractices.items" 
                :key="item.id" 
                class="practice-item"
                :class="{ 'completed': hasCompletedPractice(item.workItemId) }"
              >
                <el-tag :type="item.isRequired ? 'danger' : 'info'" size="small">
                  {{ item.isRequired ? '必选' : '可选' }}
                </el-tag>
                <span>{{ getWorkItemName(item.workItemId) }}</span>
                <el-icon v-if="hasCompletedPractice(item.workItemId)" class="completed-icon" type="success"><Check /></el-icon>
              </div>
            </div>
          </div>
          <div v-else class="no-requirements">无技能实践要求</div>
        </el-card>

        <!-- MTA实操要求 -->
        <el-card class="detail-section" shadow="never">
          <template #header>
            <div class="section-header">实操要求</div>
          </template>
          <div v-if="selectedMta.operationPractices?.items?.length">
            <div class="requirement-info">
              至少选择 {{ selectedMta.operationPractices.minSelect || 0 }} 项实操实践，
              至少完成 {{ selectedMta.operationPractices.minTimes || 0 }} 次
            </div>
            <div class="practice-list">
              <div 
                v-for="item in selectedMta.operationPractices.items" 
                :key="item.id" 
                class="practice-item"
                :class="{ 'completed': hasCompletedPractice(item.workItemId) }"
              >
                <el-tag :type="item.isRequired ? 'danger' : 'info'" size="small">
                  {{ item.isRequired ? '必选' : '可选' }}
                </el-tag>
                <span>{{ getWorkItemName(item.workItemId) }}</span>
                <el-icon v-if="hasCompletedPractice(item.workItemId)" class="completed-icon" type="success"><Check /></el-icon>
              </div>
            </div>
          </div>
          <div v-else class="no-requirements">无实操实践要求</div>
        </el-card>
      </div>
      <template #footer>
        <el-button @click="closeMtaDetail">关闭</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.position-sequence {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 12px 0;
  color: #213547;
}

.user-info {
  display: flex;
  gap: 16px;
  color: #666;
  font-size: 14px;
}

.current-position {
  color: #409eff;
  font-weight: 600;
}

.sequence-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.level-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.level-label {
  min-width: 80px;
  padding: 8px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  color: #213547;
}

.positions-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.position-card {
  position: relative;
  padding: 16px;
  background: #fff;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 160px;
  text-align: center;
}

.position-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.position-card.current-user {
  border-color: #67c23a;
  background: #f0f9ff;
}

.position-name {
  font-weight: 600;
  color: #213547;
  margin-bottom: 4px;
}

.position-level {
  font-size: 12px;
  color: #909399;
}

.current-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  padding: 2px 8px;
  background: #67c23a;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.detail-section {
  margin-bottom: 16px;
}

.section-header {
  font-weight: 600;
  color: #213547;
}

.requirement-info {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 6px;
  color: #409eff;
  font-size: 14px;
}

.mta-list, .cert-list, .course-list, .practice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mta-item, .cert-item, .course-item, .practice-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.mta-item.completed, .course-item.completed, .practice-item.completed {
  background: #f0f9ff;
  border: 1px solid #67c23a;
}

.mta-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.mta-item:hover {
  background: #e3f2fd;
}

.mta-name {
  flex: 1;
}

.click-icon {
  color: #409eff;
  font-size: 14px;
}

.completed-icon {
  color: #67c23a;
  font-size: 16px;
}

.no-requirements {
  color: #909399;
  font-style: italic;
  text-align: center;
  padding: 20px;
}
</style>
