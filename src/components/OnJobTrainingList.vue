<script setup>
import { ref, computed } from 'vue'
import { listActivitiesByDept, listActivitiesByInstructor, createActivity } from '../onJobTraining'
import { listCoursesByDept } from '../courses'
import { USERS } from '../user'
import { Plus, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({ currentUser: { type: Object, required: true } })
const emit = defineEmits(['open-detail'])

// 权限判断
const canCreate = computed(() => ['training_admin', 'section_chief', 'dept_manager'].includes(props.currentUser.role))
const canViewAll = computed(() => ['training_admin', 'section_chief', 'dept_manager'].includes(props.currentUser.role))

// 获取活动列表
const allActivities = computed(() => {
  if (canViewAll.value) {
    // 管理员可看本部门所有活动
    return listActivitiesByDept(props.currentUser.department)
  } else {
    // 普通员工可看本部门所有活动 + 自己作为讲师的活动
    const deptActivities = listActivitiesByDept(props.currentUser.department)
    const instructorActivities = listActivitiesByInstructor(props.currentUser.id)
    // 合并去重
    const combined = [...deptActivities]
    instructorActivities.forEach(activity => {
      if (!combined.find(a => a.id === activity.id)) {
        combined.push(activity)
      }
    })
    return combined
  }
})

// 筛选和分页
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(10)

const filtered = computed(() => {
  return allActivities.value.filter(activity => {
    const statusMatch = !statusFilter.value || activity.status === statusFilter.value
    return statusMatch
  })
})

const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

// 新增活动对话框
const showCreateDialog = ref(false)
const createForm = ref({
  name: '',
  courseId: '',
  startTime: '',
  endTime: '',
  hours: 8,
  location: '',
  classroom: '',
  provider: '',
  assessmentMethods: [],
  instructorId: ''
})

// 获取本部门在岗培训课程
const availableCourses = computed(() => {
  return listCoursesByDept(props.currentUser.department).filter(c => c.type === '在岗培训' && c.status === '启用')
})

// 获取所有部门
const allDepartments = computed(() => {
  const depts = new Set(USERS.map(u => u.department))
  return Array.from(depts)
})

// 获取本部门人员作为讲师选项
const instructorOptions = computed(() => {
  return USERS.filter(u => u.department === props.currentUser.department)
})

// 考核方式选项
const assessmentOptions = [
  { label: '笔试', value: '笔试' },
  { label: '面试', value: '面试' },
  { label: '报告', value: '报告' }
]

// 打开新增对话框
function openCreate() {
  createForm.value = {
    name: '',
    courseId: '',
    startTime: '',
    endTime: '',
    hours: 8,
    location: '',
    classroom: '',
    provider: props.currentUser.department,
    assessmentMethods: [],
    instructorId: ''
  }
  showCreateDialog.value = true
}

// 提交新增
function submitCreate() {
  if (!createForm.value.name.trim()) {
    ElMessage.warning('请输入活动名称')
    return
  }
  if (!createForm.value.courseId) {
    ElMessage.warning('请选择课程')
    return
  }
  if (!createForm.value.startTime) {
    ElMessage.warning('请选择开始时间')
    return
  }
  if (!createForm.value.endTime) {
    ElMessage.warning('请选择结束时间')
    return
  }
  if (!createForm.value.instructorId) {
    ElMessage.warning('请选择讲师')
    return
  }
  if (createForm.value.assessmentMethods.length === 0) {
    ElMessage.warning('请选择考核方式')
    return
  }

  const selectedCourse = availableCourses.value.find(c => c.id === createForm.value.courseId)
  const selectedInstructor = instructorOptions.value.find(u => u.id === createForm.value.instructorId)

  const activityData = {
    name: createForm.value.name.trim(),
    courseId: createForm.value.courseId,
    courseName: selectedCourse.name,
    type: '在岗培训',
    startTime: createForm.value.startTime,
    endTime: createForm.value.endTime,
    department: props.currentUser.department,
    hours: createForm.value.hours,
    location: createForm.value.location,
    classroom: createForm.value.classroom,
    provider: createForm.value.provider,
    assessmentMethods: createForm.value.assessmentMethods,
    instructorId: createForm.value.instructorId,
    instructorName: selectedInstructor.name,
    createdBy: props.currentUser.id
  }

  createActivity(activityData)
  
  ElMessage.success('在岗培训活动创建成功')
  showCreateDialog.value = false
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

// 查看详情
function viewDetail(activity) {
  emit('open-detail', activity)
}
</script>

<template>
  <section class="on-job-training-list">
    <div class="page-header">
      <div class="title">
        <el-icon><View /></el-icon>
        <span>在岗培训</span>
      </div>
      <el-button v-if="canCreate" type="primary" :icon="Plus" @click="openCreate">新增活动</el-button>
    </div>

    <div class="filters">
      <el-form inline>
        <el-form-item label="状态">
          <el-select v-model="statusFilter" clearable placeholder="全部" style="width: 160px">
            <el-option label="未开始" value="未开始" />
            <el-option label="进行中" value="进行中" />
            <el-option label="考核中" value="考核中" />
            <el-option label="已归档" value="已归档" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="paged" stripe>
      <el-table-column prop="name" label="活动名称" min-width="200">
        <template #default="{ row }">
          <el-button type="primary" link @click="viewDetail(row)">{{ row.name }}</el-button>
        </template>
      </el-table-column>
      <el-table-column prop="courseName" label="课程名称" min-width="180" />
      <el-table-column prop="type" label="活动类型" width="120" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="startTime" label="开始时间" width="160" />
      <el-table-column prop="endTime" label="结束时间" width="160" />
      <el-table-column prop="department" label="组织部门" width="120" />
      <el-table-column prop="assessmentMethods" label="考核方式" min-width="120">
        <template #default="{ row }">
          <el-tag v-for="method in row.assessmentMethods" :key="method" size="small" style="margin-right: 4px;">
            {{ method }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        layout="prev, pager, next, jumper, total"
        :total="filtered.length"
        :current-page="page"
        :page-size="pageSize"
        @current-change="(p) => page = p"
      />
    </div>

    <!-- 新增活动对话框 -->
    <el-dialog v-model="showCreateDialog" title="新增在岗培训活动" width="600px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="活动名称" required>
          <el-input v-model="createForm.name" placeholder="请输入活动名称" />
        </el-form-item>
        <el-form-item label="课程名称" required>
          <el-select v-model="createForm.courseId" placeholder="请选择课程" style="width: 100%">
            <el-option 
              v-for="course in availableCourses" 
              :key="course.id" 
              :label="course.name" 
              :value="course.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="活动类型">
          <el-input value="在岗培训" disabled />
        </el-form-item>
        <el-form-item label="开始时间" required>
          <el-date-picker
            v-model="createForm.startTime"
            type="datetime"
            placeholder="选择开始时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" required>
          <el-date-picker
            v-model="createForm.endTime"
            type="datetime"
            placeholder="选择结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="课时">
          <el-input-number v-model="createForm.hours" :min="1" :max="24" />
        </el-form-item>
        <el-form-item label="培训地点">
          <el-input v-model="createForm.location" placeholder="请输入培训地点" />
        </el-form-item>
        <el-form-item label="教室">
          <el-input v-model="createForm.classroom" placeholder="请输入教室" />
        </el-form-item>
        <el-form-item label="提供单位">
          <el-select v-model="createForm.provider" placeholder="请选择提供单位" style="width: 100%">
            <el-option 
              v-for="dept in allDepartments" 
              :key="dept" 
              :label="dept" 
              :value="dept" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="考核方式" required>
          <el-select v-model="createForm.assessmentMethods" multiple placeholder="请选择考核方式" style="width: 100%">
            <el-option 
              v-for="option in assessmentOptions" 
              :key="option.value" 
              :label="option.label" 
              :value="option.value" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="讲师" required>
          <el-select v-model="createForm.instructorId" placeholder="请选择讲师" style="width: 100%">
            <el-option 
              v-for="instructor in instructorOptions" 
              :key="instructor.id" 
              :label="instructor.name" 
              :value="instructor.id" 
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">确定</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.on-job-training-list {
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
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: #213547;
}

.filters {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
