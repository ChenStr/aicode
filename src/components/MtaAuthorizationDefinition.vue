<script setup>
import { ref, computed, watch } from 'vue'
import { listCoursesByDept } from '../courses'
import { listWorkItemsByDept } from '../workItems'
import { listMtaByDept, addMta, updateMta } from '../mtaAuths'
import { Trophy, Plus, Search, Edit, View, Document, Reading, Tools, Delete } from '@element-plus/icons-vue'

const props = defineProps({ currentUser: { type: Object, required: true } })

// 数据源
const courseOptions = computed(() => listCoursesByDept(props.currentUser.department))
const workItemOptions = computed(() => listWorkItemsByDept(props.currentUser.department))

// 列表、搜索、分页
const keyword = ref('')
const page = ref(1)
const pageSize = ref(5)
const baseList = computed(() => listMtaByDept(props.currentUser.department))
const filtered = computed(() => {
  const kw = keyword.value.trim()
  return baseList.value.filter(r => {
    if (!kw) return true
    return `${r.techName}${r.projectName}${r.code}${r.level}`.toLowerCase().includes(kw.toLowerCase())
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
const activeTab = ref('basic') // 新增：当前激活的标签页
const showDetail = ref(false)
const detail = ref(null)
const form = ref({
  techName: '', projectName: '', code: '', hours: 8, level: '初级',
  targetAudience: '', instructors: '', assessmentMethod: '面试',
  objective: '', materials: '', references: '',
  courses: [],
  skillPractices: { minSelect: 0, minTimes: 0, items: [] },
  operationPractices: { minSelect: 0, minTimes: 0, items: [] },
})

function openAdd() { editingId.value=''; resetForm(); activeTab.value='basic'; showEdit.value=true }
function openEdit(row) { 
  editingId.value = row.id; 
  form.value = JSON.parse(JSON.stringify(row)); 
  // 过滤掉非本部门课程
  const allowed = new Set((courseOptions.value || []).map(c => c.id))
  form.value.courses = (form.value.courses || []).filter(id => allowed.has(id))
  activeTab.value = 'basic'; 
  showEdit.value = true 
}
function openDetail(row) { detail.value = row; showDetail.value = true }
function resetForm() {
  form.value = { techName: '', projectName: '', code: '', hours: 8, level: '初级', targetAudience: '', instructors: '', assessmentMethod: '面试', objective: '', materials: '', references: '', prerequisites: '', trainingStrategy: '', courses: [], skillPractices: { minSelect: 0, minTimes: 0, items: [] }, operationPractices: { minSelect: 0, minTimes: 0, items: [] } }
}
function submitEdit() {
  const payload = { ...form.value, department: props.currentUser.department }
  if (editingId.value) updateMta(editingId.value, payload); else addMta(payload)
  showEdit.value = false
}

// 多选选择器的候选数据
const skillCandidates = computed(() => workItemOptions.value.filter(w => w.type === '技能'))
const operationCandidates = computed(() => workItemOptions.value.filter(w => w.type === '实践'))

// 添加实践项到对应类型
function addPracticeItem(type) {
  const newItem = {
    id: `p_${Math.random().toString(36).slice(2, 8)}`,
    workItemId: '',
    isRequired: false
  }
  
  if (type === 'skill') {
    form.value.skillPractices.items.push(newItem)
  } else {
    form.value.operationPractices.items.push(newItem)
  }
}

// 删除实践项
function removePracticeItem(type, index) {
  if (type === 'skill') {
    form.value.skillPractices.items.splice(index, 1)
  } else {
    form.value.operationPractices.items.splice(index, 1)
  }
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
  <section class="course-panel">
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <el-icon class="title-icon"><Trophy /></el-icon>
          <div>
            <h2 class="page-title">MTA 授权定义</h2>
            <p class="page-subtitle">{{ props.currentUser.department }} · 共 {{ total }} 条</p>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="openAdd" :icon="Plus">新增授权</el-button>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-group">
        <div class="search-box">
          <el-input
            v-model="keyword"
            placeholder="搜索授权名称/项目/编号/等级..."
            :prefix-icon="Search"
            clearable
          />
        </div>

      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table :data="paged" stripe style="width: 100%">
        <el-table-column prop="techName" label="授权名称" min-width="200" />
        <el-table-column prop="level" label="等级" width="120">
          <template #default="{ row }">
            <el-tag :type="row.level === '初级' ? 'info' : row.level === '中级' ? 'warning' : 'success'">
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="编号" width="150" />
        <el-table-column prop="hours" label="课时" width="100" />
        <el-table-column prop="updatedAt" label="更新时间" width="120" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openEdit(row)" :icon="Edit">编辑</el-button>
            <el-button type="info" size="small" @click="openDetail(row)" :icon="View">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

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
      :title="editingId ? '修改授权' : '新增授权'"
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
              <el-form-item label="单项技术授权名称" required>
                <el-input v-model="form.techName" placeholder="请输入" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="培训项目名称">
                <el-input v-model="form.projectName" placeholder="请输入" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="编号">
                <el-input v-model="form.code" placeholder="如 MTA-E-001" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="课时">
                <el-input-number v-model="form.hours" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="授权等级">
                <el-select v-model="form.level" placeholder="请选择">
                  <el-option label="初级" value="初级" />
                  <el-option label="中级" value="中级" />
                  <el-option label="高级" value="高级" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="培训对象">
                <el-input v-model="form.targetAudience" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="教员配置">
                <el-input v-model="form.instructors" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="考核方式">
                <el-select v-model="form.assessmentMethod" placeholder="请选择">
                  <el-option label="面试" value="面试" />
                  <el-option label="面试+笔试" value="面试+笔试" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="培训目标">
            <el-input v-model="form.objective" type="textarea" :rows="3" placeholder="请输入培训目标" />
          </el-form-item>
          <el-form-item label="培训教材">
            <el-input v-model="form.materials" type="textarea" :rows="2" placeholder="请输入培训教材" />
          </el-form-item>
          <el-form-item label="参考资料">
            <el-input v-model="form.references" type="textarea" :rows="2" placeholder="请输入参考资料" />
          </el-form-item>
          <el-form-item label="学员先决条件">
            <el-input v-model="form.prerequisites" type="textarea" :rows="3" placeholder="请输入学员需要具备的先决条件，如技能要求、经验要求等" />
          </el-form-item>
          <el-form-item label="培训策略/方式">
            <el-input v-model="form.trainingStrategy" type="textarea" :rows="3" placeholder="请输入培训策略和方式，如理论授课、实操训练、案例分析等" />
          </el-form-item>
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
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card header="技能实践配置">
              <el-form :model="form.skillPractices" label-width="100px">
                <el-form-item label="配置技能实践项目">
                  <div class="practice-items-container">
                    <div v-for="(item, index) in form.skillPractices.items" :key="item.id" class="practice-item">
                      <el-select v-model="item.workItemId" placeholder="请选择工作项" style="flex: 1; margin-right: 12px;">
                        <el-option
                          v-for="workItem in skillCandidates"
                          :key="workItem.id"
                          :label="workItem.name"
                          :value="workItem.id"
                        />
                      </el-select>
                      <el-checkbox v-model="item.isRequired" style="margin-right: 12px;">必填</el-checkbox>
                      <el-button type="danger" size="small" @click="removePracticeItem('skill', index)" :icon="Delete">删除</el-button>
                </div>
                    <el-button type="primary" @click="addPracticeItem('skill')" :icon="Plus" style="width: 100%; margin-top: 12px;">
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
            </el-card>
          </el-col>

          <el-col :span="12">
            <el-card header="实操实践配置">
              <el-form :model="form.operationPractices" label-width="100px">
                <el-form-item label="配置实操实践项目">
                  <div class="practice-items-container">
                    <div v-for="(item, index) in form.operationPractices.items" :key="item.id" class="practice-item">
                      <el-select v-model="item.workItemId" placeholder="请选择工作项" style="flex: 1; margin-right: 12px;">
                        <el-option
                          v-for="workItem in operationCandidates"
                          :key="workItem.id"
                          :label="workItem.name"
                          :value="workItem.id"
                        />
                      </el-select>
                      <el-checkbox v-model="item.isRequired" style="margin-right: 12px;">必填</el-checkbox>
                      <el-button type="danger" size="small" @click="removePracticeItem('operation', index)" :icon="Delete">删除</el-button>
                    </div>
                    <el-button type="primary" @click="addPracticeItem('operation')" :icon="Plus" style="width: 100%; margin-top: 12px;">
                      添加实操实践项目
                    </el-button>
                </div>
                </el-form-item>
                <el-form-item label="至少选择">
                  <el-input-number v-model="form.operationPractices.minSelect" :min="0" />
                  <span style="margin-left: 8px;">项</span>
                </el-form-item>
                <el-form-item label="至少完成">
                  <el-input-number v-model="form.operationPractices.minTimes" :min="0" />
                  <span style="margin-left: 8px;">次</span>
                </el-form-item>
                <div class="selection-info">
                  已配置 {{ form.operationPractices.items.length }} 项实操实践
                </div>
              </el-form>
            </el-card>
          </el-col>
        </el-row>
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
            <span>MTA授权详情</span>
          </div>
          <button class="close-btn" @click="showDetail = false">✕</button>
        </div>
        
        <div class="modal-body detail-body">
          <div class="detail-row">
            <span class="detail-label">授权名称：</span>
            <span class="detail-value">{{ detail?.techName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">培训项目：</span>
            <span class="detail-value">{{ detail?.projectName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">编号：</span>
            <span class="detail-value">{{ detail?.code }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">课时：</span>
            <span class="detail-value">{{ detail?.hours }} 小时</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">授权等级：</span>
            <span class="detail-value">
              <span class="type-badge">{{ detail?.level }}</span>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">培训对象：</span>
            <span class="detail-value">{{ detail?.targetAudience }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">教员配置：</span>
            <span class="detail-value">{{ detail?.instructors }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">考核方式：</span>
            <span class="detail-value">{{ detail?.assessmentMethod }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">培训目标：</span>
            <span class="detail-value">{{ detail?.objective }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">培训教材：</span>
            <span class="detail-value">{{ detail?.materials }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">参考资料：</span>
            <span class="detail-value">{{ detail?.references }}</span>
          </div>
          <div class="detail-row" v-if="detail?.prerequisites">
            <span class="detail-label">学员先决条件：</span>
            <span class="detail-value">{{ detail.prerequisites }}</span>
          </div>
          <div class="detail-row" v-if="detail?.trainingStrategy">
            <span class="detail-label">培训策略/方式：</span>
            <span class="detail-value">{{ detail.trainingStrategy }}</span>
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
                  <span class="work-item-name">{{ workItemOptions.find(w => w.id === item.workItemId)?.name || '未知工作项' }}</span>
                  <span v-if="item.isRequired" class="required-badge">必填</span>
                </div>
              </div>
            </span>
          </div>
          
          <!-- 实操实践项目信息 -->
          <div class="detail-row" v-if="detail?.operationPractices && detail.operationPractices.items && detail.operationPractices.items.length > 0">
            <span class="detail-label">实操实践项目：</span>
            <span class="detail-value">
              <div class="practice-items-display">
                <div class="practice-summary">
                  <span class="summary-text">至少选择 {{ detail.operationPractices.minSelect }} 项，至少完成 {{ detail.operationPractices.minTimes }} 次</span>
                </div>
                <div v-for="item in detail.operationPractices.items" :key="item.id" class="practice-item-display">
                  <span class="work-item-name">{{ workItemOptions.find(w => w.id === item.workItemId)?.name || '未知工作项' }}</span>
                  <span v-if="item.isRequired" class="required-badge">必填</span>
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
/* 统一UI样式，沿用课程/工作项 */
.course-panel { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 20px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,.08); }

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
.table-row { display:grid; grid-template-columns: 2fr 0.8fr 1fr 0.8fr 1fr 1.2fr; align-items:center; padding:16px 20px; border-bottom:1px solid #f1f5f9; transition:.2s; }
.table-row.header { background:#f8fafc; font-weight:600; color:#475569; font-size:14px; text-transform:uppercase; letter-spacing:.5px; }
.table-row:not(.header):hover { background:#f8fafc; transform: translateX(4px); }
.type-badge { display:inline-block; padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; background:#e0e7ff; color:#3730a3; }
.action-btn { display:inline-flex; align-items:center; gap:4px; padding:6px 12px; border:none; border-radius:8px; font-size:12px; font-weight:500; cursor:pointer; transition:.2s; margin-right:8px; }
.action-btn.edit { background:#dbeafe; color:#1e40af; }
.action-btn.edit:hover { background:#bfdbfe; transform: translateY(-1px); }
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
.divider-line { height:1px; background:#e5e7eb; margin: 12px 0; }

/* 改进的芯片容器样式 */
.chips-container { display: flex; flex-wrap: wrap; gap: 8px; max-height: 200px; overflow-y: auto; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 20px; background: #fff; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.chip:hover { border-color: #3b82f6; background: #eff6ff; }
.chip input[type="checkbox"] { margin: 0; }
.chip-text { color: #374151; }

/* 选择信息样式 */
.selection-info { margin-top: 12px; padding: 8px 12px; background: #dbeafe; color: #1e40af; border-radius: 8px; font-size: 12px; font-weight: 500; text-align: center; }

/* 实践部分样式 */
.practice-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
.section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-weight: 600; color: #1e293b; font-size: 14px; }
.section-icon { font-size: 16px; }

.inline-conds { display: flex; align-items: center; gap: 12px; color: #475569; font-size: 13px; margin-top: 12px; flex-wrap: wrap; }
.cond-item { display: flex; align-items: center; gap: 6px; }
.cond-item .num { width: 64px; padding: 6px 8px; border: 2px solid #e5e7eb; border-radius: 8px; text-align: center; }
.modal-footer { display:flex; gap:10px; justify-content:flex-end; padding:16px 20px; border-top:1px solid #e5e7eb; background:#f9fafb; }
.btn-primary, .btn-secondary { padding:10px 18px; border:none; border-radius:10px; font-weight:600; cursor:pointer; transition:.2s; }
.btn-primary { background:linear-gradient(135deg,#3b82f6 0%, #1d4ed8 100%); color:#fff; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(59,130,246,.3); }
.btn-secondary { background:#fff; color:#6b7280; border:2px solid #e5e7eb; }
.btn-secondary:hover { background:#f9fafb; border-color:#d1d5db; }

/* 新增/删除实践项按钮样式 */
.add-practice-btn { display:flex; align-items:center; gap:8px; padding:8px 16px; background:linear-gradient(135deg,#4f46e5 0%,#4338ca 100%); color:#fff; border:none; border-radius:10px; font-weight:600; cursor:pointer; transition:.3s; box-shadow:0 4px 15px rgba(79,70,229,.3); }
.add-practice-btn:hover { transform: translateY(-2px); box-shadow:0 8px 25px rgba(79,70,229,.4); }
.add-icon { font-size:16px; }

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

.summary-text {
  font-size: 12px;
  color: #92400e;
  font-weight: 500;
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
