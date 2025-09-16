<script setup>
import { computed, ref } from 'vue'
import { USERS } from '../user'
import { listMyAnnualPlans } from '../annualPlans'
import { positionsStore } from '../positions'
import { mtaAuthsStore } from '../mtaAuths'
import { coursesStore } from '../courses'
import { workItemsStore } from '../workItems'
import { listMyCourseScores, listMyPractices, listMyPracticeAudits, addPracticeAudit } from '../trainingRecords'
import { Reading, Tools, View } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const props = defineProps({ currentUser: { type: Object, required: true } })
const emit = defineEmits(['navigate-to-practice-audit'])

// 课程来源：年度计划所选课程（当前年）
const currentYear = new Date().getFullYear()
const plannedCourseIds = computed(() => {
  const plans = listMyAnnualPlans(props.currentUser.id).filter(p => p.year === currentYear)
  const ids = new Set()
  for (const p of plans) for (const cid of (p.selectedCourseIds || [])) ids.add(cid)
  return Array.from(ids)
})
function getCourseName(id) { const c = coursesStore.courses.find(c => c.id === id); return c ? c.name : id }

// 实践来源：进行中的岗位 + 岗位的MTA授权的实践项
const activePosition = computed(() => {
  const pos = positionsStore.items.find(p => p.department === props.currentUser.department) // 简化：取本部门第一个岗位
  return pos || null
})
const practiceWorkItemIds = computed(() => {
  const ids = new Set()
  const pos = activePosition.value
  if (pos) {
    for (const item of (pos.skillPractices?.items || [])) if (item.workItemId) ids.add(item.workItemId)
    if (pos.mtaAuthorizations?.items?.length) {
      for (const mi of pos.mtaAuthorizations.items) {
        const mta = mtaAuthsStore.items.find(m => m.id === mi.mtaId)
        for (const it of (mta?.skillPractices?.items || [])) if (it.workItemId) ids.add(it.workItemId)
        for (const it of (mta?.operationPractices?.items || [])) if (it.workItemId) ids.add(it.workItemId)
      }
    }
  }
  return Array.from(ids)
})

// 成绩/记录（可为空）
const myScores = computed(() => listMyCourseScores(props.currentUser.id))
const myPractices = computed(() => listMyPractices(props.currentUser.id))

function findScoreForCourse(courseId) {
  const r = myScores.value.find(s => s.courseId === courseId)
  return r || { score: null, result: '-', startAt: '-', endAt: '-' }
}

function getWorkItemName(id) {
  const w = workItemsStore.items.find(w => w.id === id)
  return w ? w.name : id
}

// 课程筛选与分页
const activeTab = ref('courses')
const courseKeyword = ref('')
const courseResult = ref('')
const coursePage = ref(1)
const coursePageSize = ref(8)

const courseRows = computed(() => plannedCourseIds.value.map(id => ({ id, name: getCourseName(id), score: findScoreForCourse(id).score, result: findScoreForCourse(id).result, startAt: findScoreForCourse(id).startAt, endAt: findScoreForCourse(id).endAt })))
const courseFiltered = computed(() => {
  const kw = courseKeyword.value.trim()
  return courseRows.value.filter(r => {
    const hitKw = !kw || r.name.includes(kw)
    const hitRes = !courseResult.value || r.result === courseResult.value
    return hitKw && hitRes
  })
})
const coursePaged = computed(() => {
  const start = (coursePage.value - 1) * coursePageSize.value
  return courseFiltered.value.slice(start, start + coursePageSize.value)
})

// 实践筛选与分页
const practiceKeyword = ref('')
const practiceResult = ref('')
const practicePage = ref(1)
const practicePageSize = ref(8)

// 审核弹窗相关
const auditDialogVisible = ref(false)
const selectedWorkItemId = ref('')
const auditForm = ref({
  attachments: [],
  assessmentContent: '',
  assessorId: ''
})
const practiceRows = computed(() => practiceWorkItemIds.value.map(id => ({ id, name: getWorkItemName(id) })))
const practiceFiltered = computed(() => {
  const kw = practiceKeyword.value.trim()
  if (!kw) return practiceRows.value
  return practiceRows.value.filter(r => r.name.includes(kw))
})
const practicePaged = computed(() => {
  const start = (practicePage.value - 1) * practicePageSize.value
  return practiceFiltered.value.slice(start, start + practicePageSize.value)
})

// 实践审核相关
const myAudits = computed(() => listMyPracticeAudits(props.currentUser.id))

function getAuditStatus(workItemId) {
  const audits = myAudits.value.filter(a => a.workItemId === workItemId)
  if (audits.length === 0) return '未提交'
  const latest = audits[0] // 最新的提交
  const statusMap = {
    'submitted': '已提交',
    'training_approved': '培训工程师已审核',
    'assessor_assigned': '已安排考核',
    'assessed': '考核完成',
    'rejected': '已驳回'
  }
  return statusMap[latest.status] || latest.status
}

function getAuditCount(workItemId) {
  return myAudits.value.filter(a => a.workItemId === workItemId).length
}

// 统计该实践项考核完成次数
function getAssessedCount(workItemId) {
  return myAudits.value.filter(a => a.workItemId === workItemId && a.status === 'assessed').length
}

function startAudit(workItemId) {
  selectedWorkItemId.value = workItemId
  auditDialogVisible.value = true
}

function viewDetails(workItemId) {
  // 跳转到实践考核记录页面，并传递筛选条件
  emit('navigate-to-practice-audit', {
    workItemId: workItemId,
    workItemName: getWorkItemName(workItemId)
  })
}

// 提交审核
function submitAudit() {
  // 添加二次确认
  ElMessageBox.confirm(
    '确定要提交实践考核审核吗？提交后将无法修改。',
    '确认提交',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    addPracticeAudit({ 
      userId: props.currentUser.id, 
      workItemId: selectedWorkItemId.value,
      attachments: auditForm.value.attachments,
      assessmentContent: auditForm.value.assessmentContent,
      assessorId: auditForm.value.assessorId
    })
    auditDialogVisible.value = false
    // 重置表单
    auditForm.value = { attachments: [], assessmentContent: '', assessorId: '' }
    ElMessage.success('提交成功！')
  }).catch(() => {
    // 用户取消操作
  })
}

// 取消审核
function cancelAudit() {
  auditDialogVisible.value = false
  auditForm.value = { attachments: [], assessmentContent: '', assessorId: '' }
}

// 获取考核组成员列表（这里应该从用户数据中获取，暂时返回模拟数据）
const assessors = computed(() => [
  { id: 'u_002', name: '考核员1' },
  { id: 'u_003', name: '考核员2' }
])
</script>

<template>
  <section class="training-page">
    <div class="page-header">
      <div class="title">
        <el-icon><Reading /></el-icon>
        <span>培训管理</span>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane name="courses">
        <template #label>
          <el-icon style="margin-right:6px"><Reading /></el-icon>课程成绩
        </template>
        <div class="filters">
          <el-form inline>
            <el-form-item label="关键字">
              <el-input v-model="courseKeyword" placeholder="搜索课程名称" clearable style="width: 220px" />
            </el-form-item>
            <el-form-item label="结果">
              <el-select v-model="courseResult" clearable placeholder="全部" style="width: 160px">
                <el-option label="通过" value="通过" />
                <el-option label="不通过" value="不通过" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
        <el-table :data="coursePaged" stripe>
          <el-table-column prop="name" label="课程名称" min-width="200" />
          <el-table-column prop="score" label="课程分数" width="120" />
          <el-table-column prop="result" label="课程结果" width="120" />
          <el-table-column prop="startAt" label="开始时间" width="140" />
          <el-table-column prop="endAt" label="结束时间" width="140" />
        </el-table>
        <div class="pagination">
          <el-pagination
            layout="prev, pager, next, jumper, total"
            :total="courseFiltered.length"
            :current-page="coursePage"
            :page-size="coursePageSize"
            @current-change="(p)=> coursePage = p"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane name="practices">
        <template #label>
          <el-icon style="margin-right:6px"><Tools /></el-icon>实践记录
        </template>
        <div class="filters">
          <el-form inline>
            <el-form-item label="关键字">
              <el-input v-model="practiceKeyword" placeholder="搜索实践项目名称" clearable style="width: 240px" />
            </el-form-item>
          </el-form>
        </div>
        <el-table :data="practicePaged" stripe>
          <el-table-column prop="name" label="实践项目名称" min-width="200" />
          <el-table-column label="状态" width="140">
            <template #default="{ row }">
              <el-tag :type="getAuditStatus(row.id) === '考核完成' ? 'success' : getAuditStatus(row.id) === '已驳回' ? 'danger' : 'info'">
                {{ getAuditStatus(row.id) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提交次数" width="100">
            <template #default="{ row }">{{ getAuditCount(row.id) }}</template>
          </el-table-column>
          <el-table-column label="考核完成次数" width="130">
            <template #default="{ row }">{{ getAssessedCount(row.id) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click="startAudit(row.id)">发起审核</el-button>
              <el-button size="small" type="info" :icon="View" @click="viewDetails(row.id)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination">
          <el-pagination
            layout="prev, pager, next, jumper, total"
            :total="practiceFiltered.length"
            :current-page="practicePage"
            :page-size="practicePageSize"
            @current-change="(p)=> practicePage = p"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 发起审核弹窗 -->
    <el-dialog v-model="auditDialogVisible" title="发起实践考核" width="600px">
      <el-form :model="auditForm" label-width="120px">
        <el-form-item label="考核实践项">
          <el-input :value="getWorkItemName(selectedWorkItemId)" readonly />
        </el-form-item>
        
        <el-form-item label="考核实践项附件">
          <el-upload
            v-model:file-list="auditForm.attachments"
            action="#"
            :auto-upload="false"
            multiple
            :limit="5"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持上传多个文件，最多5个文件
              </div>
            </template>
          </el-upload>
        </el-form-item>
        
        <el-form-item label="考核内容">
          <el-input
            v-model="auditForm.assessmentContent"
            type="textarea"
            :rows="4"
            placeholder="考核组成员填写考核内容（用户不可填写）"
            readonly
          />
        </el-form-item>
        
        <el-form-item label="考核人员">
          <el-select v-model="auditForm.assessorId" placeholder="培训工程师选择考核人员（用户不可选择）" disabled style="width: 100%">
            <el-option
              v-for="assessor in assessors"
              :key="assessor.id"
              :label="assessor.name"
              :value="assessor.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelAudit">取消</el-button>
          <el-button type="primary" @click="submitAudit">提交审核</el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.training-page { display: flex; flex-direction: column; gap: 12px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 18px; }
.filters { background: #fff; padding: 10px; border-radius: 8px; margin-bottom: 10px; }
.pagination { display: flex; justify-content: flex-end; padding: 10px 0; }
</style>


