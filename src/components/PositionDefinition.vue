<script setup>
import { ref, computed, watch } from 'vue'
import { listPositionsByDept, addPosition, updatePosition } from '../positions'
import { listMtaByDept } from '../mtaAuths'
import { listCoursesByDept } from '../courses'
import { listWorkItemsByDept } from '../workItems'
import { User, Plus, Search, Edit, View, Document, Trophy, Reading, Tools, Delete } from '@element-plus/icons-vue'

const props = defineProps({ currentUser: { type: Object, required: true } })

// 数据源
const mtaOptions = computed(() => listMtaByDept(props.currentUser.department))
const courseOptions = computed(() => listCoursesByDept(props.currentUser.department))
const skillWorkItems = computed(() => listWorkItemsByDept(props.currentUser.department).filter(w => w.type === '技能'))
const parentPositionOptions = computed(() => baseList.value.map(p => ({ value: p.name, label: p.name })))
// 特种作业证书（来自外部系统）：此处仅提供下拉选项占位，后续可对接真实接口
const specialCertOptions = [
  { id: 'spc_001', name: '高压电工证' },
  { id: 'spc_002', name: '低压电工证' },
  { id: 'spc_003', name: '高处作业证' },
  { id: 'spc_004', name: '焊工特种作业证' },
]

// 列表、搜索、分页
const keyword = ref('')
const page = ref(1)
const pageSize = ref(5)
const baseList = computed(() => listPositionsByDept(props.currentUser.department))
const filtered = computed(() => {
  const kw = keyword.value.trim()
  return baseList.value.filter(p => {
    if (!kw) return true
    return `${p.name}${p.parentPosition}${p.level}`.toLowerCase().includes(kw.toLowerCase())
  })
})
const total = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
watch([keyword, pageSize], () => { page.value = 1 })

// 弹窗：新增/编辑
const showEdit = ref(false)
const editingId = ref('')
const activeTab = ref('basic') // 当前激活的标签页
const form = ref({
  name: '',
  parentPosition: '',
  level: '一级',
  description: '',
  requireWorkPlan: false,
  mtaAuthorizations: { minSelect: 0, items: [] },
  specialCertIds: [],
  courses: [],
  skillPractices: { minSelect: 0, minTimes: 0, items: [] }
})

// 详情查看
const showDetail = ref(false)
const detail = ref(null)

function openAdd() { 
  editingId.value = ''
  resetForm()
  activeTab.value = 'basic'
  showEdit.value = true 
}

function openEdit(row) { 
  editingId.value = row.id
  form.value = JSON.parse(JSON.stringify(row))
  // 若为电气部岗位，强制设为true（隐藏编辑）
  if (form.value.department === '电气部') form.value.requireWorkPlan = true
  // 过滤掉非本部门课程
  const allowed = new Set((courseOptions.value || []).map(c => c.id))
  form.value.courses = (form.value.courses || []).filter(id => allowed.has(id))
  // 将运行时结构 specialCertificates 映射回表单字段 specialCertIds（编辑态）
  if (row && row.specialCertificates && Array.isArray(row.specialCertificates.items)) {
    form.value.specialCertIds = row.specialCertificates.items.map(i => i.certId)
    // 兼容保留 minSelect（如未来需要在UI中编辑，可再增加输入框）
    form.value._specialCertMinSelect = row.specialCertificates.minSelect ?? 0
  } else {
    if (!Array.isArray(form.value.specialCertIds)) form.value.specialCertIds = []
    form.value._specialCertMinSelect = 0
  }
  activeTab.value = 'basic'
  showEdit.value = true 
}

function openDetail(row) { 
  detail.value = row
  showDetail.value = true 
}

function resetForm() {
  form.value = { 
    name: '', 
    parentPosition: '', 
    level: '一级', 
    description: '',
    requireWorkPlan: props.currentUser.department === '电气部' ? true : false,
    mtaAuthorizations: { minSelect: 0, items: [] },
    specialCertIds: [],
    _specialCertMinSelect: 0,
    courses: [],
    skillPractices: { minSelect: 0, minTimes: 0, items: [] }
  }
}

function submitEdit() {
  // 构造保存结构：将 specialCertIds 映射为运行时使用的 specialCertificates
  const specialCertificates = {
    minSelect: form.value._specialCertMinSelect ?? 0,
    items: (form.value.specialCertIds || []).map(cid => ({ id: `sc_${Math.random().toString(36).slice(2,8)}`, certId: cid, isRequired: false }))
  }
  const payload = { 
    ...form.value, 
    department: props.currentUser.department,
    specialCertificates,
  }
  // 不把内部字段提交
  delete payload._specialCertMinSelect
  delete payload.specialCertIds
  if (editingId.value) {
    updatePosition(editingId.value, payload)
  } else {
    addPosition(payload)
  }
  showEdit.value = false
}

// MTA授权配置
function addMtaAuthorization() {
  const newItem = {
    id: `mta_${Math.random().toString(36).slice(2, 8)}`,
    mtaId: '',
    isRequired: false
  }
  form.value.mtaAuthorizations.items.push(newItem)
}

function removeMtaAuthorization(index) {
  form.value.mtaAuthorizations.items.splice(index, 1)
}

// 技能实践配置
function addSkillPractice() {
  const newItem = {
    id: `sp_${Math.random().toString(36).slice(2, 8)}`,
    workItemId: '',
    isRequired: false
  }
  form.value.skillPractices.items.push(newItem)
}

function removeSkillPractice(index) {
  form.value.skillPractices.items.splice(index, 1)
}

// 切换课程选择
function toggleCourse(courseId) {
  const index = form.value.courses.indexOf(courseId)
  if (index > -1) {
    form.value.courses.splice(index, 1)
  } else {
    form.value.courses.push(courseId)
  }
}

// 获取课程类型颜色
function getCourseTypeColor(type) {
  const colorMap = {
    '通用': 'info',
    '专业': 'success', 
    '安全': 'warning'
  }
  return colorMap[type] || 'info'
}
</script>

<template>
  <section class="position-panel">
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <el-icon class="title-icon"><User /></el-icon>
          <div>
            <h2 class="page-title">岗位定义</h2>
            <p class="page-subtitle">{{ props.currentUser.department }} · 共 {{ total }} 个岗位</p>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="openAdd" :icon="Plus">新增岗位</el-button>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-group">
        <div class="search-box">
          <el-input
            v-model="keyword"
            placeholder="搜索岗位名称/上级岗位/职级..."
            :prefix-icon="Search"
            clearable
          />
        </div>

      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table :data="paged" stripe style="width: 100%">
        <el-table-column prop="name" label="岗位名称" min-width="150" />
        <el-table-column prop="parentPosition" label="上级岗位" width="150">
          <template #default="{ row }">
            {{ row.parentPosition || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="level" label="职级" width="100">
          <template #default="{ row }">
            <el-tag type="success">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openEdit(row)" :icon="Edit">编辑</el-button>
            <el-button type="info" size="small" @click="openDetail(row)" :icon="View">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-section">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[5, 10, 20]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="showEdit"
      :title="editingId ? '修改岗位' : '新增岗位'"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <template #label>
            <el-icon><Document /></el-icon>
            <span>基本信息</span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="MTA授权" name="mta">
          <template #label>
            <el-icon><Trophy /></el-icon>
            <span>MTA授权</span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="特种作业证书" name="special">
          <template #label>
            <el-icon><Trophy /></el-icon>
            <span>特种作业证书</span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="课程配置" name="courses">
          <template #label>
            <el-icon><Reading /></el-icon>
            <span>课程配置</span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="实践配置" name="practices">
          <template #label>
            <el-icon><Tools /></el-icon>
            <span>实践配置</span>
          </template>
        </el-tab-pane>
      </el-tabs>
      <!-- 基本信息标签页 -->
      <div v-if="activeTab === 'basic'">
        <el-form :model="form" label-width="120px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="岗位名称" required>
                <el-input v-model="form.name" placeholder="请输入岗位名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="上级岗位">
                <el-select v-model="form.parentPosition" placeholder="请选择上级岗位" clearable>
                  <el-option
                    v-for="option in parentPositionOptions"
                    :key="option.value"
                    :value="option.value"
                    :label="option.label"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="职级">
                <el-select v-model="form.level" placeholder="请选择职级">
                  <el-option label="一级" value="一级" />
                  <el-option label="二级" value="二级" />
                  <el-option label="三级" value="三级" />
                  <el-option label="四级" value="四级" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="所属部门">
                <el-input :value="props.currentUser.department" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="props.currentUser.department !== '电气部'">
              <el-form-item label="是否需填工作设想">
                <el-radio-group v-model="form.requireWorkPlan">
                  <el-radio :label="true">是</el-radio>
                  <el-radio :label="false">否</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="岗位描述">
            <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入岗位描述" />
          </el-form-item>
        </el-form>
      </div>

      <!-- MTA授权配置标签页 -->
      <div v-if="activeTab === 'mta'">
        <el-form :model="form" label-width="120px">
          <el-form-item label="配置MTA授权">
            <div class="mta-items-container">
              <div v-for="(item, index) in form.mtaAuthorizations.items" :key="item.id" class="mta-item">
                <el-select v-model="item.mtaId" placeholder="请选择MTA授权" style="flex: 1; margin-right: 12px;">
                  <el-option
                    v-for="mta in mtaOptions"
                    :key="mta.id"
                    :value="mta.id"
                    :label="`${mta.techName} (${mta.level})`"
                  />
                </el-select>
                <el-checkbox v-model="item.isRequired" style="margin-right: 12px;">必选</el-checkbox>
                <el-button type="danger" size="small" @click="removeMtaAuthorization(index)" :icon="Delete">删除</el-button>
              </div>
              <el-button type="primary" @click="addMtaAuthorization" :icon="Plus" style="width: 100%; margin-top: 12px;">
                添加MTA授权
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="至少选择">
            <el-input-number v-model="form.mtaAuthorizations.minSelect" :min="0" />
            <span style="margin-left: 8px;">项</span>
          </el-form-item>
          <div class="selection-info">
            已配置 {{ form.mtaAuthorizations.items.length }} 项MTA授权
          </div>
        </el-form>
      </div>

      <!-- 特种作业证书（来自外部系统，多选） -->
      <div v-if="activeTab === 'special'">
        <el-form :model="form" label-width="140px">
          <el-form-item label="选择特种作业证书">
            <el-select v-model="form.specialCertIds" multiple placeholder="请选择特种作业证书" style="width: 100%" filterable collapse-tags collapse-tags-tooltip>
              <el-option v-for="op in specialCertOptions" :key="op.id" :value="op.id" :label="op.name" />
            </el-select>
          </el-form-item>
          <div class="selection-info">已选择 {{ form.specialCertIds.length }} 项特种作业证书</div>
        </el-form>
      </div>

      <!-- 课程配置标签页 -->
      <div v-if="activeTab === 'courses'">
        <el-card shadow="never" style="border: 1px solid #e4e7ed;">
          <template #header>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: 600; color: #303133;">
                <el-icon style="margin-right: 8px;"><Reading /></el-icon>
                课程配置
              </span>
              <el-tag type="info" size="small">
                已选择 {{ form.courses.length }} 门课程
              </el-tag>
            </div>
          </template>
          
          <div style="max-height: 400px; overflow-y: auto;">
            <el-row :gutter="16">
              <el-col 
                v-for="course in courseOptions" 
                :key="course.id" 
                :span="12" 
                style="margin-bottom: 16px;"
              >
                <el-card 
                  shadow="hover" 
                  :class="{ 'course-selected': form.courses.includes(course.id) }"
                  style="cursor: pointer; transition: all 0.3s; border: 2px solid transparent;"
                  @click="toggleCourse(course.id)"
                >
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600; color: #303133; margin-bottom: 4px;">
                        {{ course.name }}
                      </div>
                      <el-tag 
                        :type="getCourseTypeColor(course.type)" 
                        size="small"
                        style="margin-right: 8px;"
                      >
                        {{ course.type }}
                      </el-tag>
                      <el-tag 
                        :type="course.status === '启用' ? 'success' : 'danger'" 
                        size="small"
                      >
                        {{ course.status }}
                      </el-tag>
                    </div>
                    <el-checkbox 
                      :model-value="form.courses.includes(course.id)"
                      @click.stop="toggleCourse(course.id)"
                      style="margin-left: 12px;"
                    />
                  </div>
                </el-card>
              </el-col>
            </el-row>
            
            <div v-if="courseOptions.length === 0" style="text-align: center; padding: 40px; color: #909399;">
              <el-icon size="48" style="margin-bottom: 16px;"><Document /></el-icon>
              <div>暂无可用课程</div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 实践配置标签页 -->
      <div v-if="activeTab === 'practices'">
        <el-form :model="form" label-width="120px">
          <el-form-item label="配置技能实践项目">
            <div class="practice-items-container">
              <div v-for="(item, index) in form.skillPractices.items" :key="item.id" class="practice-item">
                <el-select v-model="item.workItemId" placeholder="请选择工作项" style="flex: 1; margin-right: 12px;">
                  <el-option
                    v-for="workItem in skillWorkItems"
                    :key="workItem.id"
                    :value="workItem.id"
                    :label="workItem.name"
                  />
                </el-select>
                <el-checkbox v-model="item.isRequired" style="margin-right: 12px;">必填</el-checkbox>
                <el-button type="danger" size="small" @click="removeSkillPractice(index)" :icon="Delete">删除</el-button>
              </div>
              <el-button type="primary" @click="addSkillPractice" :icon="Plus" style="width: 100%; margin-top: 12px;">
                添加技能实践项目
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="至少选择">
            <el-input-number v-model="form.skillPractices.minSelect" :min="0" />
            <span style="margin-left: 8px;">项</span>
          </el-form-item>
          <el-form-item label="至少完成">
            <el-input-number v-model="form.skillPractices.minTimes" :min="0" />
            <span style="margin-left: 8px;">次</span>
          </el-form-item>
          <div class="selection-info">
            已配置 {{ form.skillPractices.items.length }} 项技能实践
          </div>
        </el-form>
      </div>
      
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">{{ editingId ? '保存修改' : '确认新增' }}</el-button>
      </template>
    </el-dialog>

    <!-- 详情查看弹窗 -->
    <div v-if="showDetail" class="modal-overlay" @click="showDetail = false">
      <div class="modal-dialog detail-dialog" @click.stop>
        <div class="modal-header">
          <div class="modal-title">
            <span class="modal-icon">📋</span>
            <span>岗位详情</span>
          </div>
          <button class="close-btn" @click="showDetail = false">✕</button>
        </div>
        
        <div class="modal-body detail-body">
          <div class="detail-row">
            <span class="detail-label">岗位名称：</span>
            <span class="detail-value">{{ detail?.name }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">上级岗位：</span>
            <span class="detail-value">{{ detail?.parentPosition || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">职级：</span>
            <span class="detail-value">
              <span class="level-badge">{{ detail?.level }}</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">所属部门：</span>
            <span class="detail-value">{{ detail?.department }}</span>
          </div>
          <div class="detail-row" v-if="detail?.description">
            <span class="detail-label">岗位描述：</span>
            <span class="detail-value">{{ detail.description }}</span>
          </div>
          
          <!-- MTA授权信息 -->
          <div class="detail-row" v-if="detail?.mtaAuthorizations && detail.mtaAuthorizations.items && detail.mtaAuthorizations.items.length > 0">
            <span class="detail-label">MTA授权：</span>
            <span class="detail-value">
              <div class="mta-items-display">
                <div class="mta-summary">
                  <span class="summary-text">至少选择 {{ detail.mtaAuthorizations.minSelect }} 项</span>
                </div>
                <div v-for="item in detail.mtaAuthorizations.items" :key="item.id" class="mta-item-display">
                  <span class="mta-name">{{ mtaOptions.find(m => m.id === item.mtaId)?.techName || '未知MTA' }}</span>
                  <span class="mta-level">{{ mtaOptions.find(m => m.id === item.mtaId)?.level || '' }}</span>
                  <span v-if="item.isRequired" class="required-badge">必选</span>
                </div>
              </div>
            </span>
          </div>
          
          <!-- 课程配置信息 -->
          <div class="detail-row" v-if="detail?.courses && detail.courses.length > 0">
            <span class="detail-label">配置课程：</span>
            <span class="detail-value">
              <div class="courses-display">
                <div v-for="courseId in detail.courses" :key="courseId" class="course-item-display">
                  {{ courseOptions.find(c => c.id === courseId)?.name || '未知课程' }}
                  <span class="course-type-badge">{{ courseOptions.find(c => c.id === courseId)?.type || '' }}</span>
                </div>
              </div>
            </span>
          </div>
          
          <!-- 技能实践项目信息 -->
          <div class="detail-row" v-if="detail?.skillPractices && detail.skillPractices.items && detail.skillPractices.items.length > 0">
            <span class="detail-label">技能实践项目：</span>
            <span class="detail-value">
              <div class="practice-items-display">
                <div class="practice-summary">
                  <span class="summary-text">至少选择 {{ detail.skillPractices.minSelect }} 项，至少完成 {{ detail.skillPractices.minTimes }} 次</span>
                </div>
                <div v-for="item in detail.skillPractices.items" :key="item.id" class="practice-item-display">
                  <span class="work-item-name">{{ skillWorkItems.find(w => w.id === item.workItemId)?.name || '未知工作项' }}</span>
                  <span v-if="item.isRequired" class="required-badge">必填</span>
                </div>
              </div>
            </span>
          </div>

          <!-- 特种作业证书信息（外部系统） -->
          <div class="detail-row" v-if="detail?.specialCertIds && detail.specialCertIds.length > 0">
            <span class="detail-label">特种作业证书：</span>
            <span class="detail-value">
              <div class="courses-display">
                <div v-for="cid in detail.specialCertIds" :key="cid" class="course-item-display">
                  {{ (specialCertOptions.find(o => o.id === cid) || {}).name || cid }}
                </div>
              </div>
            </span>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-primary" @click="showDetail = false">知道了</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 统一UI样式，沿用其他组件 */
.position-panel { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 20px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,.08); }

/* 课程选择卡片样式 */
.course-selected {
  border-color: #409eff !important;
  background-color: #f0f9ff !important;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15) !important;
}

.course-selected:hover {
  border-color: #337ecc !important;
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.2) !important;
}
.page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; padding:20px; background:linear-gradient(135deg,#fff 0%,#f1f5f9 100%); border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,.06); }
.title-section { display:flex; align-items:center; gap:16px; }
.icon-wrapper { width:60px; height:60px; background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%); border-radius:16px; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 25px rgba(59,130,246,.3); }
.title-icon { font-size:28px; }
.page-title { font-size:24px; font-weight:700; color:#1e293b; margin:0 0 4px 0; }
.page-subtitle { font-size:14px; color:#64748b; margin:0; }
.add-btn { display:flex; align-items:center; gap:8px; padding:12px 20px; background:linear-gradient(135deg,#10b981 0%,#059669 100%); color:#fff; border:none; border-radius:12px; font-weight:600; cursor:pointer; transition:.3s; box-shadow:0 4px 15px rgba(16,185,129,.3); }
.add-btn:hover { transform: translateY(-2px); box-shadow:0 8px 25px rgba(16,185,129,.4); }

.filter-section { margin-bottom:24px; padding:20px; background:#fff; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,.06); }
.filter-group { display:flex; flex-direction:column; gap:16px; }
.search-box { position:relative; max-width:400px; }
.search-icon { position:absolute; left:16px; top:50%; transform:translateY(-50%); font-size:18px; color:#94a3b8; }
.search-input { width:100%; padding:14px 16px 14px 48px; border:2px solid #e2e8f0; border-radius:12px; font-size:14px; transition:.3s; background:#f8fafc; }
.search-input:focus { outline:none; border-color:#3b82f6; background:#fff; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
.filter-controls { display:flex; gap:20px; flex-wrap:wrap; }
.filter-item { display:flex; flex-direction:column; gap:6px; }
.filter-label { font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
.filter-select { padding:10px 12px; border:2px solid #e2e8f0; border-radius:8px; background:#fff; font-size:14px; min-width:120px; transition:.3s; }
.filter-select:focus { outline:none; border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.1); }

.table-container { margin-bottom:24px; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.06); }
.table-header { display:flex; align-items:center; justify-content:space-between; padding:20px; background:linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%); border-bottom:1px solid #e2e8f0; }
.table-title { font-size:18px; font-weight:600; color:#1e293b; }
.table-stats { font-size:14px; color:#64748b; }
.data-table { overflow:hidden; }
.table-row { display:grid; grid-template-columns: 2fr 1.5fr 1fr 1fr 1.5fr; align-items:center; padding:16px 20px; border-bottom:1px solid #f1f5f9; transition:.2s; }
.table-row.header { background:#f8fafc; font-weight:600; color:#475569; font-size:14px; text-transform:uppercase; letter-spacing:.5px; }
.table-row:not(.header):hover { background:#f8fafc; transform: translateX(4px); }
.level-badge { display:inline-block; padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; background:#e0e7ff; color:#3730a3; }
.action-btn { display:inline-flex; align-items:center; gap:4px; padding:6px 12px; border:none; border-radius:8px; font-size:12px; font-weight:500; cursor:pointer; transition:.2s; margin-right:8px; }
.action-btn.edit { background:#dbeafe; color:#1e40af; }
.action-btn.edit:hover { background:#bfdbfe; transform: translateY(-1px); }
.action-btn.view { background:#f3e8ff; color:#7c3aed; }
.action-btn.view:hover { background:#e9d5ff; transform: translateY(-1px); }
.action-icon { font-size:14px; }
.empty-state { padding:60px 20px; text-align:center; color:#94a3b8; }
.empty-icon { font-size:48px; margin-bottom:16px; opacity:.5; }

.pagination-section { display:flex; align-items:center; justify-content:space-between; padding:20px; background:#fff; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,.06); }
.pagination-info { display:flex; align-items:center; gap:12px; color:#64748b; font-size:14px; }
.divider { color:#cbd5e1; }
.pagination-controls { display:flex; align-items:center; gap:16px; }
.page-btn { display:flex; align-items:center; gap:6px; padding:10px 16px; border:2px solid #e2e8f0; background:#fff; color:#475569; border-radius:10px; font-weight:500; cursor:pointer; transition:.2s; }
.page-btn:hover:not(:disabled) { border-color:#3b82f6; color:#3b82f6; transform: translateY(-1px); }
.page-btn:disabled { opacity:.5; cursor:not-allowed; }
.page-icon { font-size:12px; }
.page-numbers { display:flex; align-items:center; gap:4px; font-weight:600; }
.current-page { color:#3b82f6; font-size:18px; }
.page-separator { color:#cbd5e1; }
.total-pages { color:#64748b; }

.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:1000; backdrop-filter: blur(4px); }
.modal-dialog { width: 900px; max-width: 95vw; max-height: 90vh; background:#fff; border-radius:20px; box-shadow:0 25px 50px rgba(0,0,0,.25); overflow:hidden; animation: modalSlideIn .3s ease; display: flex; flex-direction: column; }
@keyframes modalSlideIn { from { opacity:0; transform: translateY(-20px) scale(.95);} to { opacity:1; transform: translateY(0) scale(1);} }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:linear-gradient(135deg,#f8fafc 0%, #e2e8f0 100%); border-bottom:1px solid #e2e8f0; flex-shrink: 0; }
.modal-title { display:flex; align-items:center; gap:10px; font-size:18px; font-weight:600; color:#1e293b; }
.modal-icon { font-size:20px; }
.close-btn { width:32px; height:32px; border:none; background:#f1f5f9; color:#64748b; border-radius:8px; cursor:pointer; transition:.2s; display:flex; align-items:center; justify-content:center; }
.close-btn:hover { background:#e2e8f0; color:#475569; }

/* 标签页样式 */
.modal-tabs { display: flex; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
.tab-btn { display: flex; align-items: center; gap: 8px; padding: 16px 24px; background: transparent; border: none; color: #64748b; font-weight: 500; cursor: pointer; transition: all 0.3s; border-bottom: 3px solid transparent; }
.tab-btn:hover { color: #3b82f6; background: #f1f5f9; }
.tab-btn.active { color: #3b82f6; background: #fff; border-bottom-color: #3b82f6; }
.tab-icon { font-size: 16px; }
.tab-btn span:last-child { font-size: 14px; }

.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.tab-content { min-height: 400px; }
.grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { margin-bottom: 12px; }
.form-label { display:block; margin-bottom:6px; font-weight:600; color:#374151; }
.form-input, .form-select, textarea.form-input { width:100%; padding:10px 12px; border:2px solid #e5e7eb; border-radius:10px; font-size:14px; transition:.3s; background:#fff; }
.form-input:focus, .form-select:focus, textarea.form-input:focus { outline:none; border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
.form-input.disabled { background: #f9fafb; color: #6b7280; cursor: not-allowed; }

/* MTA授权配置样式 */
.mta-items-container {
  width: 100%;
}

.mta-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.mta-select {
  flex: 1;
  min-width: 200px;
}

/* 实践项配置样式 */
.practice-items-container {
  width: 100%;
}

.practice-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.practice-select {
  flex: 1;
  min-width: 200px;
}

.required-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #374151;
  white-space: nowrap;
}

.required-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
}

.remove-btn {
  padding: 6px 12px;
  border: 1px solid #ef4444;
  background: white;
  color: #ef4444;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: #ef4444;
  color: white;
}

.add-mta-btn, .add-practice-btn {
  width: 100%;
  padding: 12px;
  border: 2px dashed #d1d5db;
  background: white;
  color: #6b7280;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-mta-btn:hover, .add-practice-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #f0f9ff;
}

/* 改进的芯片容器样式 */
.chips-container { display: flex; flex-wrap: wrap; gap: 8px; max-height: 200px; overflow-y: auto; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 20px; background: #fff; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.chip:hover { border-color: #3b82f6; background: #eff6ff; }
.chip input[type="checkbox"] { margin: 0; }
.chip-text { color: #374151; }

/* 选择信息样式 */
.selection-info { margin-top: 12px; padding: 8px 12px; background: #dbeafe; color: #1e40af; border-radius: 8px; font-size: 12px; font-weight: 500; text-align: center; }

.inline-conds { display: flex; align-items: center; gap: 12px; color: #475569; font-size: 13px; margin-top: 12px; flex-wrap: wrap; }
.cond-item { display: flex; align-items: center; gap: 6px; }
.cond-item .num { width: 64px; padding: 6px 8px; border: 2px solid #e5e7eb; border-radius: 8px; text-align: center; }

.modal-footer { display:flex; gap:10px; justify-content:flex-end; padding:16px 20px; border-top:1px solid #e5e7eb; background:#f9fafb; }
.btn-primary, .btn-secondary { padding:10px 18px; border:none; border-radius:10px; font-weight:600; cursor:pointer; transition:.2s; }
.btn-primary { background:linear-gradient(135deg,#3b82f6 0%, #1d4ed8 100%); color:#fff; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(59,130,246,.3); }
.btn-secondary { background:#fff; color:#6b7280; border:2px solid #e5e7eb; }
.btn-secondary:hover { background:#f9fafb; border-color:#d1d5db; }

/* 详情弹窗样式 */
.detail-dialog {
  width: 700px;
  max-width: 95vw;
}

.detail-body {
  padding: 0;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  width: 140px;
  font-weight: 600;
  color: #374151;
  flex-shrink: 0;
}

.detail-value {
  flex: 1;
  color: #1f2937;
  line-height: 1.5;
}

/* MTA授权显示样式 */
.mta-items-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mta-summary {
  padding: 8px 12px;
  background: #fef3c7;
  border-radius: 6px;
  border: 1px solid #fde68a;
  margin-bottom: 4px;
}

.summary-text {
  font-size: 12px;
  color: #92400e;
  font-weight: 500;
}

.mta-item-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.mta-name {
  font-weight: 500;
  color: #374151;
}

.mta-level {
  display: inline-block;
  padding: 2px 8px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

/* 课程显示样式 */
.courses-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.course-item-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 6px;
  border: 1px solid #bae6fd;
}

.course-type-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

/* 实践项显示样式 */
.practice-items-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.practice-summary {
  padding: 8px 12px;
  background: #fef3c7;
  border-radius: 6px;
  border: 1px solid #fde68a;
  margin-bottom: 4px;
}

.practice-item-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.work-item-name {
  font-weight: 500;
  color: #374151;
}

.required-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #dcfce7;
  color: #166534;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
</style>
