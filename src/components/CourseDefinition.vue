<script setup>
import { ref, computed, watch } from 'vue'
import { listCoursesByDept, addCourse, updateCourse } from '../courses'
import { listWorkItemsByDept } from '../workItems'
import { Reading, Plus, Search, Edit, View } from '@element-plus/icons-vue'
import NoPermission from './NoPermission.vue'

const props = defineProps({ currentUser: { type: Object, required: true } })
const allowedRoles = ['section_chief','training_admin','dept_manager']
const isAllowed = computed(() => allowedRoles.includes(props.currentUser.role))

const keyword = ref('')
const typeFilter = ref('全部')
const statusFilter = ref('全部')
const page = ref(1)
const pageSize = ref(5)

const baseList = computed(() => listCoursesByDept(props.currentUser.department))
const availableWorkItems = computed(() => listWorkItemsByDept(props.currentUser.department))

const filtered = computed(() => {
  const kw = keyword.value.trim()
  return baseList.value.filter(c => {
    if (typeFilter.value !== '全部' && c.type !== typeFilter.value) return false
    if (statusFilter.value !== '全部' && c.status !== statusFilter.value) return false
    if (kw && !(`${c.name}${c.type}${c.status}`.toLowerCase().includes(kw.toLowerCase()))) return false
    return true
  })
})

const total = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value /pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

watch([keyword, typeFilter, statusFilter, pageSize], () => { page.value = 1 })

const showEdit = ref(false)
const editingId = ref('')
const form = ref({ 
  name: '', 
  type: '通用', 
  status: '启用',
  skillPracticeItems: [],
  operationPracticeItems: []
})

// 实践项类型选项
const practiceTypes = [
  { value: 'skill', label: '技能实践项目' },
  { value: 'operation', label: '实操实践项目' }
]

function openAdd() {
  editingId.value = ''
  form.value = { 
    name: '', 
    type: '通用', 
    status: '启用',
    skillPracticeItems: [],
    operationPracticeItems: []
  }
  showEdit.value = true
}

function openEdit(c) {
  editingId.value = c.id
  form.value = { 
    name: c.name, 
    type: c.type, 
    status: c.status,
    skillPracticeItems: c.skillPracticeItems || [],
    operationPracticeItems: c.operationPracticeItems || []
  }
  showEdit.value = true
}

function addPracticeItem(type) {
  const newItem = {
    id: `p_${Math.random().toString(36).slice(2, 8)}`,
    workItemId: '',
    isRequired: false
  }
  
  if (type === 'skill') {
    form.value.skillPracticeItems.push(newItem)
  } else {
    form.value.operationPracticeItems.push(newItem)
  }
}

function removePracticeItem(type, index) {
  if (type === 'skill') {
    form.value.skillPracticeItems.splice(index, 1)
  } else {
    form.value.operationPracticeItems.splice(index, 1)
  }
}

function submitEdit() {
  if (!form.value.name.trim()) return
  if (editingId.value) {
    updateCourse(editingId.value, { 
      name: form.value.name.trim(), 
      type: form.value.type, 
      status: form.value.status,
      skillPracticeItems: form.value.skillPracticeItems,
      operationPracticeItems: form.value.operationPracticeItems
    })
  } else {
    addCourse({ 
      name: form.value.name.trim(), 
      type: form.value.type, 
      status: form.value.status, 
      department: props.currentUser.department,
      skillPracticeItems: form.value.skillPracticeItems,
      operationPracticeItems: form.value.operationPracticeItems
    })
  }
  showEdit.value = false
}

const showDetail = ref(false)
const detail = ref(null)
function openDetail(c) { detail.value = c; showDetail.value = true }
</script>

<template>
  <section class="course-page">
    <template v-if="isAllowed">
    <div class="page-header">
      <div class="title">
        <el-icon><Reading /></el-icon>
        <span>课程定义</span>
      </div>
    </div>

    <div class="filters">
      <el-form inline>
        <el-form-item label="关键字">
          <el-input v-model="keyword" placeholder="搜索课程名称" clearable style="width: 220px" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="typeFilter" clearable placeholder="全部" style="width: 160px">
            <el-option label="通用" value="通用" />
            <el-option label="专业" value="专业" />
            <el-option label="安全" value="安全" />
            <el-option label="在岗培训" value="在岗培训" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusFilter" clearable placeholder="全部" style="width: 160px">
            <el-option label="启用" value="启用" />
            <el-option label="停用" value="停用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="openAdd" :icon="Plus">新增课程</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="paged" stripe>
        <el-table-column prop="name" label="课程名称" min-width="200">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">{{ row.name }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="课程编号" width="150" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.type === '通用' ? 'info' : row.type === '专业' ? 'success' : 'warning'">
              {{ row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '启用' ? 'success' : 'danger'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openEdit(row)" :icon="Edit">编辑</el-button>
            <el-button type="info" size="small" @click="openDetail(row)" :icon="View">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

    <div class="pagination">
      <el-pagination
        layout="prev, pager, next, jumper, total"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        @current-change="(p)=> page = p"
      />
    </div>

    <el-dialog
      v-model="showEdit"
      :title="editingId ? '修改课程' : '新增课程'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="课程名称" required>
          <el-input v-model="form.name" placeholder="请输入课程名称" />
        </el-form-item>
        <el-form-item label="课程类型">
          <el-select v-model="form.type" placeholder="请选择课程类型">
            <el-option label="通用" value="通用" />
            <el-option label="专业" value="专业" />
            <el-option label="安全" value="安全" />
            <el-option label="在岗培训" value="在岗培训" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程状态">
          <el-select v-model="form.status" placeholder="请选择课程状态">
            <el-option label="启用" value="启用" />
            <el-option label="停用" value="停用" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属部门">
          <el-input :value="props.currentUser.department" disabled />
        </el-form-item>
          
        
      </el-form>
      
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">{{ editingId ? '保存' : '新增' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showDetail"
      title="课程详情"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="课程名称">{{ detail?.name }}</el-descriptions-item>
        <el-descriptions-item label="课程编号">{{ detail?.code }}</el-descriptions-item>
        <el-descriptions-item label="课程类型">
          <el-tag :type="detail?.type === '通用' ? 'info' : detail?.type === '专业' ? 'success' : 'warning'">
            {{ detail?.type }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="课程状态">
          <el-tag :type="detail?.status === '启用' ? 'success' : 'danger'">
            {{ detail?.status }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="所属部门">{{ detail?.department }}</el-descriptions-item>
        
        
      </el-descriptions>
      
      <template #footer>
        <el-button type="primary" @click="showDetail = false">知道了</el-button>
      </template>
    </el-dialog>
    </template>
    <NoPermission v-else />
  </section>
</template>

<style scoped>
.course-page { display: flex; flex-direction: column; gap: 12px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 18px; }
.filters { background: #fff; padding: 10px; border-radius: 8px; margin-bottom: 10px; }
.pagination { display: flex; justify-content: flex-end; padding: 10px 0; }
</style>
