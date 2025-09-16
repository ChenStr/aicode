<script setup>
import { computed, ref } from 'vue'
import { USERS } from '../user'
import { coursesStore } from '../courses'
import { DEPARTMENTS, trainingGuidancesStore, listTrainingGuidancesForUser, createTrainingGuidances, getStageLabel, getStatusLabel, advanceGuidanceStage } from '../trainingGuidances'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({ currentUser: { type: Object, required: true } })
const emit = defineEmits(['open-detail'])

const rows = computed(() => listTrainingGuidancesForUser(props.currentUser))
const keyword = ref('')
const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return rows.value
  return rows.value.filter(r => (r.basicInfo?.name || '').includes(kw))
})

// 添加弹窗（仅培训工程师可见）
const dialogVisible = ref(false)
const form = ref({
  receiverIds: [],
  plans: [ { dateRange: [], courseIds: [], responsibleDept: '' } ]
})

const canCreate = computed(() => props.currentUser.role === 'training_admin')

function addPlan() {
  form.value.plans.push({ dateRange: [], courseIds: [], responsibleDept: props.currentUser.department })
}
function removePlan(i) {
  form.value.plans.splice(i, 1)
}

function submitCreate() {
  if (!canCreate.value) return
  if (!form.value.receiverIds.length) { ElMessage.warning('请选择接收人'); return }
  if (!form.value.plans.length) { ElMessage.warning('请至少添加一个培训实习计划'); return }
  createTrainingGuidances({
    creatorId: props.currentUser.id,
    receiverIds: form.value.receiverIds,
    plans: form.value.plans
  })
  dialogVisible.value = false
  form.value = { receiverIds: [], plans: [ { dateRange: [], courseIds: [], responsibleDept: '' } ] }
  ElMessage.success('已为所选接收人创建培训指导')
}

function openDetail(row) { emit('open-detail', row.id) }

function getUserLabel(u) { return `${u.name}（${u.department}｜${u.role === 'training_admin' ? '培训工程师' : u.role === 'dept_manager' ? '部门经理' : u.role === 'section_chief' ? '科长' : '普通员工'}）` }
function getCourseName(id) { const c = coursesStore.courses.find(c => c.id === id); return c ? c.name : id }

</script>

<template>
  <section>
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div style="font-weight:600;font-size:18px;">培训指导</div>
      <div v-if="canCreate">
        <el-button type="primary" @click="dialogVisible = true">新增培训指导</el-button>
      </div>
    </div>

    <div class="filters" style="background:#fff;padding:10px;border-radius:8px;margin-bottom:10px;">
      <el-form inline>
        <el-form-item label="关键字">
          <el-input v-model="keyword" placeholder="按姓名搜索" clearable style="width:240px" />
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="filtered" stripe>
      <el-table-column label="姓名" min-width="160">
        <template #default="{ row }">{{ row.basicInfo?.name }}</template>
      </el-table-column>
      <el-table-column label="当前流程" min-width="180">
        <template #default="{ row }">{{ getStageLabel(row.currentStage) }}</template>
      </el-table-column>
      <el-table-column label="状态" min-width="140">
        <template #default="{ row }">
          <el-tag :type="row.currentStage === 'completed' ? 'success' : 'info'">{{ getStatusLabel(row.currentStage) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openDetail(row)">查看详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="新增培训指导" width="720px">
      <el-form label-width="110px">
        <el-form-item label="接收人">
          <el-select v-model="form.receiverIds" multiple filterable placeholder="选择接收人（可多选）" style="width:100%">
            <el-option v-for="u in USERS.filter(u => u.role === 'employee')" :key="u.id" :label="getUserLabel(u)" :value="u.id" />
          </el-select>
        </el-form-item>
        <div style="margin:8px 0 4px 110px;color:#666;">为每位接收人生成一份独立的培训指导</div>

        <el-divider content-position="left">培训实习计划</el-divider>
        <div v-for="(p, idx) in form.plans" :key="idx" style="background:#f9fafb;border:1px dashed #e5e7eb;border-radius:8px;padding:12px;margin-bottom:12px;">
          <el-form-item label="时间">
            <el-date-picker v-model="p.dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" style="width:100%" />
          </el-form-item>
          <el-form-item label="主要培训内容">
            <el-select v-model="p.courseIds" multiple filterable placeholder="从课程定义选择（可多选）" style="width:100%">
              <el-option v-for="c in coursesStore.courses" :key="c.id" :label="getCourseName(c.id)" :value="c.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="责任部门">
            <el-select v-model="p.responsibleDept" filterable placeholder="选择部门" style="width:100%">
              <el-option v-for="d in DEPARTMENTS" :key="d" :label="d" :value="d" />
            </el-select>
          </el-form-item>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <el-button size="small" type="danger" plain @click="removePlan(idx)" v-if="form.plans.length > 1">删除</el-button>
            <el-button size="small" type="primary" plain @click="addPlan">再添一条</el-button>
          </div>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitCreate">创建</el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
</style>


