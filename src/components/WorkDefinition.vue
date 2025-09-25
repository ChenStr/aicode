<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, View, Search, Folder, Document, Reading, Tools, Trophy } from '@element-plus/icons-vue'
import { listWorksByDept, addWork, updateWork, removeWork } from '../works'
import { listCoursesByDept } from '../courses'
import { listMtaByDept } from '../mtaAuths'
import { listPositionsByDept } from '../positions'
import { listWorkItemsByDept } from '../workItems'
import { WORK_SCOPES } from '../workScopes'

const props = defineProps({
  currentUser: { type: Object, required: true }
})

const works = ref([])
const loading = ref(false)
const searchText = ref('')

// 权限：培训工程师、科长、部门经理
const hasPermission = computed(() => ['training_admin','section_chief','dept_manager'].includes(props.currentUser.role))

const filteredWorks = computed(() => {
  let data = works.value
  if (searchText.value) {
    const q = searchText.value.trim()
    data = data.filter(it => it.name.includes(q) || it.code.includes(q) || it.type.includes(q) || it.status.includes(q))
  }
  return data
})

function fetchData() {
  if (!hasPermission.value) return
  loading.value = true
  try {
    works.value = listWorksByDept(props.currentUser.department)
  } catch (e) {
    ElMessage.error('加载工作授权数据失败')
  } finally { loading.value = false }
}

// 新增/编辑对话框（分标签）
const showForm = ref(false)
const formMode = ref('create') // create | edit
const editingId = ref('')
const activeTab = ref('basic')

const baseInfo = ref({ name: '', code: '', type: '标准作业', status: '启用', needAudit: true, description: '' })
const conditions = ref({ education: '', minYears: 0 })
const educationOptions = [ '无明确要求', '中专及以上', '高中及以上', '大专及以上', '本科及以上', '硕士及以上' ]

// 课程配置（卡片式，与岗位定义一致）
const selectedCourses = ref([])
function toggleCourse(courseId) {
  const idx = selectedCourses.value.indexOf(courseId)
  if (idx > -1) selectedCourses.value.splice(idx, 1)
  else selectedCourses.value.push(courseId)
}
function getCourseTypeColor(type) {
  const map = { '通用': 'info', '专业': 'success', '安全': 'warning' }
  return map[type] || 'info'
}

// 技术授权（参考岗位定义：带minSelect与列表项）
const mtaAuthorizations = ref({ minSelect: 0, items: [] })
function addMtaAuthorization() {
  mtaAuthorizations.value.items.push({ id: `mta_${Math.random().toString(36).slice(2,8)}`, mtaId: '', isRequired: false })
}
function removeMtaAuthorization(index) {
  mtaAuthorizations.value.items.splice(index, 1)
}

// 岗位条件(任一)
const selectedPositionsAnyOf = ref([])

// 实践配置
const practices = ref({
  skillPractices: { minSelect: 0, minTimes: 0, items: [] },
  operationPractices: { minSelect: 0, minTimes: 0, items: [] }
})
function addPracticeItem(type) {
  const newItem = { id: `p_${Math.random().toString(36).slice(2, 8)}`, workItemId: '', isRequired: false }
  if (type === 'skill') practices.value.skillPractices.items.push(newItem)
  else practices.value.operationPractices.items.push(newItem)
}
function removePracticeItem(type, index) {
  if (type === 'skill') practices.value.skillPractices.items.splice(index, 1)
  else practices.value.operationPractices.items.splice(index, 1)
}

// 工作范围（按部门过滤）
const selectedScopes = ref([])
const deptWorkScopes = computed(() => (WORK_SCOPES || []).filter(s => s.level === 1 && s.department === props.currentUser.department))

// 选项数据
const courseOptions = ref([])
const mtaOptions = ref([])
const positionOptions = ref([])
const workItemOptions = ref([])
const typeOptions = [ '标准作业', '临时作业', '专项作业' ]
const statusOptions = [ '启用', '停用' ]

const skillCandidates = computed(() => (workItemOptions.value || []).filter(w => w.type === '技能'))
const operationCandidates = computed(() => (workItemOptions.value || []).filter(w => w.type === '实践'))

function openCreate() {
  formMode.value = 'create'
  editingId.value = ''
  baseInfo.value = { name: '', code: '', type: '标准作业', status: '启用', needAudit: true, description: '' }
  conditions.value = { education: '', minYears: 0 }
  selectedCourses.value = []
  mtaAuthorizations.value = { minSelect: 0, items: [] }
  selectedPositionsAnyOf.value = []
  practices.value = { skillPractices: { minSelect: 0, minTimes: 0, items: [] }, operationPractices: { minSelect: 0, minTimes: 0, items: [] } }
  selectedScopes.value = []
  activeTab.value = 'basic'
  showForm.value = true
}

function openEdit(row) {
  formMode.value = 'edit'
  editingId.value = row.id
  baseInfo.value = { name: row.name, code: row.code, type: row.type, status: row.status, needAudit: !!row.needAudit, description: row.description || '' }
  conditions.value = { ...(row.conditions || { education: '', minYears: 0 }) }
  selectedCourses.value = [...(row.courses || [])]
  // 将存量数组 mtaAuths 还原为 items 列表，同时兼容已有 mtaAuthorizations
  if (row.mtaAuthorizations && row.mtaAuthorizations.items) {
    mtaAuthorizations.value = JSON.parse(JSON.stringify(row.mtaAuthorizations))
  } else {
    mtaAuthorizations.value = { minSelect: 0, items: (row.mtaAuths || []).map(id => ({ id: `mta_${Math.random().toString(36).slice(2,8)}`, mtaId: id, isRequired: false })) }
  }
  selectedPositionsAnyOf.value = [...(row.positionsAnyOf || [])]
  practices.value = JSON.parse(JSON.stringify(row.practices || { skillPractices: { minSelect: 0, minTimes: 0, items: [] }, operationPractices: { minSelect: 0, minTimes: 0, items: [] } }))
  selectedScopes.value = [...(row.workScopes || [])]
  activeTab.value = 'basic'
  showForm.value = true
}

function handleSubmit() {
  if (!baseInfo.value.name || !baseInfo.value.code) {
    ElMessage.warning('请填写名称和授权编码')
    return
  }
  // 兼容：保存结构既包含 mtaAuths（数组），也包含 mtaAuthorizations（结构化）
  const payload = {
    department: props.currentUser.department,
    name: baseInfo.value.name,
    code: baseInfo.value.code,
    type: baseInfo.value.type,
    status: baseInfo.value.status,
    needAudit: baseInfo.value.needAudit,
    description: baseInfo.value.description,
    conditions: { ...conditions.value },
    courses: [...selectedCourses.value],
    mtaAuths: mtaAuthorizations.value.items.filter(it => it.mtaId).map(it => it.mtaId),
    mtaAuthorizations: JSON.parse(JSON.stringify(mtaAuthorizations.value)),
    positionsAnyOf: [...selectedPositionsAnyOf.value],
    practices: JSON.parse(JSON.stringify(practices.value)),
    workScopes: [...selectedScopes.value]
  }
  try {
    if (formMode.value === 'create') {
      addWork(payload)
      ElMessage.success('新增成功')
    } else {
      updateWork(editingId.value, payload)
      ElMessage.success('更新成功')
    }
    showForm.value = false
    fetchData()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

function handleRemove(row) {
  ElMessageBox.confirm(`确定删除工作授权“${row.name}”吗？`, '删除确认', { type: 'warning' })
    .then(() => {
      if (removeWork(row.id)) {
        ElMessage.success('删除成功')
        fetchData()
      } else {
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {})
}

onMounted(() => {
  courseOptions.value = listCoursesByDept(props.currentUser.department)
  mtaOptions.value = listMtaByDept(props.currentUser.department)
  positionOptions.value = listPositionsByDept(props.currentUser.department)
  workItemOptions.value = listWorkItemsByDept(props.currentUser.department)
  fetchData()
})
</script>

<template>
  <div class="work-definition">
    <template v-if="!hasPermission">
      <el-result icon="warning" title="访问受限" sub-title="只有培训工程师、科长、部门经理可以访问" />
    </template>
    <template v-else>
      <div class="toolbar">
        <div class="left">
          <el-input v-model="searchText" placeholder="搜索名称/编码/类型/状态" style="width: 320px" clearable>
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </div>
        <div class="right">
          <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
        </div>
      </div>

      <el-card class="table-card">
        <el-table :data="filteredWorks" :loading="loading" stripe style="width: 100%">
          <el-table-column prop="name" label="工作授权名称" min-width="200" />
          <el-table-column prop="code" label="授权编码" width="140" />
          <el-table-column prop="type" label="授权类型" width="120" />
          <el-table-column prop="status" label="状态" width="100" />
          <el-table-column prop="needAudit" label="需审核" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.needAudit ? 'warning' : 'info'">{{ row.needAudit ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" :icon="Edit" @click="openEdit(row)">修改</el-button>
              <el-button size="small" type="danger" :icon="Delete" @click="handleRemove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 新增/修改弹窗：选项卡样式对齐岗位定义/MTA授权定义 -->
      <el-dialog v-model="showForm" :title="formMode==='create' ? '新增工作授权' : '修改工作授权'" width="900px" :close-on-click-modal="false">
        <el-tabs v-model="activeTab">
          <el-tab-pane name="basic">
            <template #label><el-icon><Document /></el-icon><span>基本信息</span></template>
            <el-form label-width="120px" label-position="left">
              <el-row :gutter="12">
                <el-col :span="12"><el-form-item label="名称" required><el-input v-model="baseInfo.name" /></el-form-item></el-col>
                <el-col :span="12"><el-form-item label="授权编码" required><el-input v-model="baseInfo.code" /></el-form-item></el-col>
                <el-col :span="12"><el-form-item label="授权类型"><el-select v-model="baseInfo.type" style="width:100%"><el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" /></el-select></el-form-item></el-col>
                <el-col :span="12"><el-form-item label="状态"><el-select v-model="baseInfo.status" style="width:100%"><el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" /></el-select></el-form-item></el-col>
                <el-col :span="12"><el-form-item label="是否需要审核"><el-switch v-model="baseInfo.needAudit" /></el-form-item></el-col>
                <el-col :span="24"><el-form-item label="授权描述"><el-input type="textarea" :rows="3" v-model="baseInfo.description" /></el-form-item></el-col>
              </el-row>
            </el-form>
          </el-tab-pane>

          <el-tab-pane name="conditions">
            <template #label><el-icon><Document /></el-icon><span>工作条件</span></template>
            <el-row :gutter="12">
              <el-col :span="12"><el-form-item label="学历要求" label-width="120px"><el-select v-model="conditions.education" placeholder="请选择" style="width:100%"><el-option v-for="e in educationOptions" :key="e" :label="e" :value="e" /></el-select></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="工龄要求(年)" label-width="120px"><el-input type="number" v-model.number="conditions.minYears" /></el-form-item></el-col>
            </el-row>
          </el-tab-pane>

          <el-tab-pane name="courses">
            <template #label><el-icon><Reading /></el-icon><span>课程配置</span></template>
            <el-card shadow="never" style="border: 1px solid #e4e7ed;">
              <template #header>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span style="font-weight:600;color:#303133;"><el-icon style="margin-right:8px;"><Reading /></el-icon>课程配置</span>
                  <el-tag type="info" size="small">已选择 {{ selectedCourses.length }} 门课程</el-tag>
                </div>
              </template>
              <div style="max-height:400px;overflow-y:auto;">
                <el-row :gutter="16">
                  <el-col v-for="course in courseOptions" :key="course.id" :span="12" style="margin-bottom:16px;">
                    <el-card shadow="hover" :class="{ 'course-selected': selectedCourses.includes(course.id) }" style="cursor:pointer;transition:all .3s;border:2px solid transparent;" @click="toggleCourse(course.id)">
                      <div style="display:flex;align-items:center;justify-content:space-between;">
                        <div style="flex:1;">
                          <div style="font-weight:600;color:#303133;margin-bottom:4px;">{{ course.name }}</div>
                          <el-tag :type="getCourseTypeColor(course.type)" size="small" style="margin-right:8px;">{{ course.type }}</el-tag>
                          <el-tag :type="course.status === '启用' ? 'success' : 'danger'" size="small">{{ course.status }}</el-tag>
                        </div>
                        <el-checkbox :model-value="selectedCourses.includes(course.id)" @click.stop="toggleCourse(course.id)" style="margin-left:12px;" />
                      </div>
                    </el-card>
                  </el-col>
                </el-row>
                <div v-if="courseOptions.length===0" style="text-align:center;padding:40px;color:#909399;">
                  <el-icon size="48" style="margin-bottom:16px;"><Document /></el-icon>
                  <div>暂无可用课程</div>
                </div>
              </div>
            </el-card>
          </el-tab-pane>

          <el-tab-pane name="mta">
            <template #label><el-icon><Trophy /></el-icon><span>技术授权</span></template>
            <el-form label-width="120px">
              <el-form-item label="配置MTA授权">
                <div class="mta-items-container">
                  <div v-for="(item, index) in mtaAuthorizations.items" :key="item.id" class="practice-item">
                    <div style="flex:1; margin-right:12px;">
                      <el-select
                        v-model="item.mtaId"
                        placeholder="请选择MTA授权"
                        filterable
                        clearable
                        size="large"
                        style="width: 100%;"
                      >
                        <el-option
                          v-for="m in mtaOptions"
                          :key="m.id"
                          :label="`${m.techName}（${m.code}｜${m.level}）`"
                          :value="m.id"
                        />
                      </el-select>
                      <div v-if="item.mtaId" class="mta-selected-preview">
                        <el-tag type="info" size="small">{{ mtaOptions.find(mm => mm.id === item.mtaId)?.techName || '' }}</el-tag>
                        <el-tag type="success" size="small" style="margin-left:6px;">{{ mtaOptions.find(mm => mm.id === item.mtaId)?.code || '' }}</el-tag>
                        <el-tag type="warning" size="small" style="margin-left:6px;">{{ mtaOptions.find(mm => mm.id === item.mtaId)?.level || '' }}</el-tag>
                      </div>
                    </div>
                    <el-checkbox v-model="item.isRequired" style="margin-right:12px;">必选</el-checkbox>
                    <el-button type="danger" size="small" :icon="Delete" @click="removeMtaAuthorization(index)">删除</el-button>
                  </div>
                  <el-button type="primary" :icon="Plus" style="width:100%;margin-top:12px;" @click="addMtaAuthorization">添加MTA授权</el-button>
                </div>
              </el-form-item>
              <el-form-item label="至少选择">
                <el-input-number v-model="mtaAuthorizations.minSelect" :min="0" />
                <span style="margin-left:8px;">项</span>
              </el-form-item>
              <div class="selection-info">已配置 {{ mtaAuthorizations.items.length }} 项MTA授权</div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane name="positions">
            <template #label><el-icon><Document /></el-icon><span>岗位条件(任一)</span></template>
            <el-form-item label="岗位" label-width="120px"><el-select v-model="selectedPositionsAnyOf" multiple filterable style="width:100%"><el-option v-for="p in positionOptions" :key="p.id" :label="p.name" :value="p.id" /></el-select></el-form-item>
          </el-tab-pane>

          <el-tab-pane name="practices">
            <template #label><el-icon><Tools /></el-icon><span>实践配置</span></template>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-card header="技能实践配置">
                  <el-form :model="practices.skillPractices" label-width="100px">
                    <el-form-item label="配置技能实践项目">
                      <div class="practice-items-container">
                        <div v-for="(item, index) in practices.skillPractices.items" :key="item.id" class="practice-item">
                          <el-select v-model="item.workItemId" placeholder="请选择工作项" style="flex: 1; margin-right: 12px;">
                            <el-option v-for="workItem in skillCandidates" :key="workItem.id" :label="workItem.name" :value="workItem.id" />
                          </el-select>
                          <el-checkbox v-model="item.isRequired" style="margin-right: 12px;">必填</el-checkbox>
                          <el-button type="danger" size="small" @click="removePracticeItem('skill', index)" :icon="Delete">删除</el-button>
                        </div>
                        <el-button type="primary" @click="addPracticeItem('skill')" :icon="Plus" style="width: 100%; margin-top: 12px;">添加技能实践项目</el-button>
                      </div>
                    </el-form-item>
                    <el-form-item label="至少选择">
                      <el-input-number v-model="practices.skillPractices.minSelect" :min="0" />
                      <span style="margin-left: 8px;">项</span>
                    </el-form-item>
                    <el-form-item label="至少完成">
                      <el-input-number v-model="practices.skillPractices.minTimes" :min="0" />
                      <span style="margin-left: 8px;">次</span>
                    </el-form-item>
                    <div class="selection-info">已配置 {{ practices.skillPractices.items.length }} 项技能实践</div>
                  </el-form>
                </el-card>
              </el-col>

              <el-col :span="12">
                <el-card header="实操实践配置">
                  <el-form :model="practices.operationPractices" label-width="100px">
                    <el-form-item label="配置实操实践项目">
                      <div class="practice-items-container">
                        <div v-for="(item, index) in practices.operationPractices.items" :key="item.id" class="practice-item">
                          <el-select v-model="item.workItemId" placeholder="请选择工作项" style="flex: 1; margin-right: 12px;">
                            <el-option v-for="workItem in operationCandidates" :key="workItem.id" :label="workItem.name" :value="workItem.id" />
                          </el-select>
                          <el-checkbox v-model="item.isRequired" style="margin-right: 12px;">必填</el-checkbox>
                          <el-button type="danger" size="small" @click="removePracticeItem('operation', index)" :icon="Delete">删除</el-button>
                        </div>
                        <el-button type="primary" @click="addPracticeItem('operation')" :icon="Plus" style="width: 100%; margin-top: 12px;">添加实操实践项目</el-button>
                      </div>
                    </el-form-item>
                    <el-form-item label="至少选择">
                      <el-input-number v-model="practices.operationPractices.minSelect" :min="0" />
                      <span style="margin-left: 8px;">项</span>
                    </el-form-item>
                    <el-form-item label="至少完成">
                      <el-input-number v-model="practices.operationPractices.minTimes" :min="0" />
                      <span style="margin-left: 8px;">次</span>
                    </el-form-item>
                    <div class="selection-info">已配置 {{ practices.operationPractices.items.length }} 项实操实践</div>
                  </el-form>
                </el-card>
              </el-col>
            </el-row>
          </el-tab-pane>

          <el-tab-pane name="scopes">
            <template #label><el-icon><Folder /></el-icon><span>工作范围</span></template>
            <el-form-item label="工作范围(多选)" label-width="120px">
              <el-tree
                :data="deptWorkScopes"
                node-key="id"
                show-checkbox
                default-expand-all
                :props="{ children: 'children', label: 'name' }"
                :default-checked-keys="selectedScopes"
                @check="(_, tree)=>{ selectedScopes.value = tree.getCheckedKeys(true) }"
              />
            </el-form-item>
          </el-tab-pane>
        </el-tabs>

        <template #footer>
          <el-button @click="showForm=false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">保存</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<style scoped>
.work-definition { padding: 16px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.table-card { border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
.selection-info { margin-top: 12px; padding: 8px 12px; background: #dbeafe; color: #1e40af; border-radius: 8px; font-size: 12px; font-weight: 500; text-align: center; }
.practice-items-container { width: 100%; }
.practice-item { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
.course-selected { border-color: #409eff !important; background-color: #f0f9ff !important; box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15) !important; }
.mta-selected-preview { margin-top: 6px; }
</style>
