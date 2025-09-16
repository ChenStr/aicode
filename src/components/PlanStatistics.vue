<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { annualPlansStore } from '../annualPlans'
import { USERS } from '../user'
import { coursesStore } from '../courses'
import { Calendar } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import NoPermission from './NoPermission.vue'

const props = defineProps({ currentUser: { type: Object, required: true } })

// 访问控制
const allowRoles = new Set(['training_admin','section_chief','dept_manager'])
const canAccess = computed(() => allowRoles.has(props.currentUser.role))

// 年份与部门筛选
const yearOptions = computed(() => {
  const set = new Set(annualPlansStore.items.map(p => p.year).filter(Boolean))
  const arr = Array.from(set).sort((a,b)=>b-a)
  return arr.length ? arr : [new Date().getFullYear()]
})
const selectedYear = ref(yearOptions.value[0])

const isTrainingDept = computed(() => props.currentUser.department === '培训部')
const deptOptions = computed(() => Array.from(new Set(USERS.map(u => u.department))))
const selectedDept = ref(isTrainingDept.value ? '' : props.currentUser.department)

// 基础数据过滤：部门与年份
const basePlans = computed(() => {
  const year = selectedYear.value
  const all = annualPlansStore.items.filter(p => p.year === year)
  if (isTrainingDept.value) {
    if (!selectedDept.value) return all
    const allow = new Set(USERS.filter(u => u.department === selectedDept.value).map(u => u.id))
    return all.filter(p => allow.has(p.userId))
  } else {
    const allow = new Set(USERS.filter(u => u.department === props.currentUser.department).map(u => u.id))
    return all.filter(p => allow.has(p.userId))
  }
})

// KPI
const distinctUserCount = computed(() => new Set(basePlans.value.map(p => p.userId)).size)
const totalCourseSelections = computed(() => basePlans.value.reduce((sum, p) => sum + ((p.selectedCourseIds || []).length), 0))

// 名称工具
function getCourseName(id) { const c = coursesStore.courses.find(c => c.id === id); return c ? c.name : id }

// 分布
const courseDistribution = computed(() => {
  const countMap = new Map()
  for (const p of basePlans.value) for (const cid of (p.selectedCourseIds || [])) countMap.set(cid, (countMap.get(cid) || 0) + 1)
  return Array.from(countMap.entries()).map(([courseId, count]) => ({ courseId, name: getCourseName(courseId), count })).sort((a,b)=>b.count-a.count)
})

const departmentDistribution = computed(() => {
  const map = new Map()
  for (const p of basePlans.value) {
    const u = USERS.find(u => u.id === p.userId)
    const dept = u?.department || '未知部门'
    map.set(dept, (map.get(dept) || 0) + (p.selectedCourseIds?.length || 0))
  }
  return Array.from(map.entries()).map(([department, count]) => ({ department, count })).sort((a,b)=>b.count-a.count)
})

// 图表与交互
const topN = ref(8)
const activeCourseId = ref('')
const activeDept = ref('')

const courseChartRef = ref(null)
const deptChartRef = ref(null)
let courseChart = null
let deptChart = null

function renderCourseChart() {
  const data = courseDistribution.value
  const top = data.slice(0, topN.value)
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 18, right: 12, bottom: 30, top: 24, containLabel: true },
    xAxis: { type: 'category', data: top.map(d=>d.name), axisLabel: { interval: 0, rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: top.map(d=>d.count), itemStyle: { color: '#409eff' } }]
  }
  if (!courseChart) courseChart = echarts.init(courseChartRef.value)
  courseChart.setOption(option)
  courseChart.off('click')
  courseChart.on('click', params => {
    const item = top[params.dataIndex]
    if (!item) return
    activeCourseId.value = activeCourseId.value === item.courseId ? '' : item.courseId
  })
}

function renderDeptChart() {
  const data = departmentDistribution.value
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 18, right: 12, bottom: 30, top: 24, containLabel: true },
    xAxis: { type: 'category', data: data.map(d=>d.department), axisLabel: { interval: 0, rotate: 20 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: data.map(d=>d.count), itemStyle: { color: '#e6a23c' } }]
  }
  if (!deptChart) deptChart = echarts.init(deptChartRef.value)
  deptChart.setOption(option)
  deptChart.off('click')
  deptChart.on('click', params => {
    const dept = data[params.dataIndex]?.department
    if (!dept) return
    if (isTrainingDept.value) {
      if (!selectedDept.value || selectedDept.value === dept) selectedDept.value = selectedDept.value === dept ? '' : dept
    }
    activeDept.value = activeDept.value === dept ? '' : dept
  })
}

function renderCharts() { nextTick(() => { if (courseChartRef.value) renderCourseChart(); if (deptChartRef.value) renderDeptChart() }) }

onMounted(renderCharts)
watch([basePlans, topN], renderCharts, { deep: true })
watch([selectedDept, selectedYear], renderCharts)

// 明细（受图表筛选影响）
const courseUserDetails = computed(() => {
  const map = new Map()
  for (const p of basePlans.value) {
    const user = USERS.find(u => u.id === p.userId)
    for (const cid of (p.selectedCourseIds || [])) {
      if (!map.has(cid)) map.set(cid, [])
      map.get(cid).push({ id: user?.id || p.userId, name: user?.name || p.userId, department: user?.department || '' })
    }
  }
  let rows = Array.from(map.entries()).map(([courseId, users]) => ({ courseId, name: getCourseName(courseId), users }))
    .sort((a,b) => a.name.localeCompare(b.name))
  if (activeCourseId.value) rows = rows.filter(r => r.courseId === activeCourseId.value)
  if (activeDept.value) rows = rows.map(r => ({ ...r, users: r.users.filter(u => u.department === activeDept.value) }))
  return rows
})
</script>

<template>
  <section class="plan-stat-page">
    <div class="page-header">
      <div class="title">
        <el-icon><Calendar /></el-icon>
        <span>计划统计</span>
      </div>
    </div>

    <NoPermission v-if="!canAccess" />
    <template v-else>
      <div class="filters">
        <el-row :gutter="12">
          <el-col :span="16">
            <el-form inline label-width="80px">
              <el-form-item label="年份">
                <el-select v-model="selectedYear" style="width: 120px">
                  <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="isTrainingDept" label="部门">
                <el-select v-model="selectedDept" clearable placeholder="全部部门" style="width: 160px">
                  <el-option v-for="d in deptOptions" :key="d" :label="d" :value="d" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button @click="activeCourseId=''; activeDept='';" size="small">清除图表筛选</el-button>
              </el-form-item>
            </el-form>
          </el-col>
          <el-col :span="8">
            <div class="kpi-cards">
              <el-card class="kpi" shadow="hover">
                <div class="kpi-title">填报人数</div>
                <div class="kpi-value">{{ distinctUserCount }}</div>
              </el-card>
              <el-card class="kpi" shadow="hover">
                <div class="kpi-title">课程总报名数</div>
                <div class="kpi-value">{{ totalCourseSelections }}</div>
              </el-card>
              <el-card class="kpi" shadow="hover">
                <div class="kpi-title">统计范围</div>
                <div class="kpi-value small">{{ isTrainingDept ? (selectedDept || '全部部门') : props.currentUser.department }} · {{ selectedYear }} 年</div>
              </el-card>
            </div>
          </el-col>
        </el-row>
      </div>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <span>课程报名分布</span>
                <div style="display:flex; gap:8px; align-items:center;">
                  <el-select v-model.number="topN" size="small" style="width:120px" placeholder="TopN">
                    <el-option :value="5" label="Top 5" />
                    <el-option :value="8" label="Top 8" />
                    <el-option :value="10" label="Top 10" />
                  </el-select>
                  <el-tag v-if="activeCourseId" type="success" size="small">已选课程：{{ getCourseName(activeCourseId) }}</el-tag>
                </div>
              </div>
            </template>
            <div ref="courseChartRef" style="width:100%; height:300px;" />
            <div class="more-tip" v-if="courseDistribution.length > topN">显示 Top {{ topN }}，更多详见下方列表</div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <span>部门报名分布</span>
                <el-tag v-if="activeDept" type="warning" size="small">已选部门：{{ activeDept }}</el-tag>
              </div>
            </template>
            <div ref="deptChartRef" style="width:100%; height:300px;" />
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="details-card" header="课程报名明细（人员）">
        <el-table :data="courseUserDetails" row-key="courseId" size="small">
          <el-table-column prop="name" label="课程" width="220" />
          <el-table-column label="报名人员">
            <template #default="{ row }">
              <el-tag v-for="u in row.users" :key="u.id + row.courseId + u.name" style="margin: 2px;" size="small">
                {{ u.name }}（{{ u.department }}）
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </section>
</template>

<style scoped>
.plan-stat-page { display: flex; flex-direction: column; gap: 12px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 18px; }
.filters { background: #fff; padding: 12px; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,.06); }
.summary-card { margin-bottom: 12px; }
.no-access { padding: 12px; }
.card-header { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
.kpi-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.kpi { text-align: left; }
.kpi-title { font-size: 12px; color: #64748b; }
.kpi-value { font-size: 20px; font-weight: 700; color: #111827; }
.kpi-value.small { font-size: 14px; font-weight: 600; color: #334155; }
.more-tip { color: #94a3b8; font-size: 12px; margin-top: 6px; }
.details-card { margin-top: 16px; }
</style>


