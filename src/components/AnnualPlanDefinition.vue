<script setup>
import { ref, computed, watch } from 'vue'
import { Plus, Search, Edit, View, Delete, Reading } from '@element-plus/icons-vue'
import { annualPlansStore, listMyAnnualPlans, addAnnualPlan, updateAnnualPlan, removeAnnualPlan, listSelectableCoursesForUser } from '../annualPlans'
import { coursesStore } from '../courses'

const props = defineProps({
  currentUser: { type: Object, required: true }
})

const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)

const allMyPlans = computed(() => listMyAnnualPlans(props.currentUser.id))
const filteredPlans = computed(() => {
  const k = keyword.value.trim()
  if (!k) return allMyPlans.value
  return allMyPlans.value.filter(it => (it.name || '').includes(k) || String(it.year || '').includes(k))
})
const pagedPlans = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredPlans.value.slice(start, start + pageSize.value)
})

watch(() => keyword.value, () => { page.value = 1 })

// 课程选择源
const selectableCourseIds = ref([])
watch(() => props.currentUser?.id, (id) => {
  if (!id) return
  selectableCourseIds.value = listSelectableCoursesForUser(id)
}, { immediate: true })

function getCourseName(id) {
  const c = coursesStore.courses.find(c => c.id === id)
  return c ? c.name : id
}

// 弹窗与表单
const addVisible = ref(false)
const editVisible = ref(false)
const detailVisible = ref(false)

const addForm = ref({ name: '', year: new Date().getFullYear(), selectedCourseIds: [] })
const editForm = ref({ id: '', name: '', year: new Date().getFullYear(), selectedCourseIds: [] })
const detailData = ref(null)

function openAdd() {
  addForm.value = { name: '', year: new Date().getFullYear(), selectedCourseIds: [] }
  addVisible.value = true
}
function submitAdd() {
  const name = (addForm.value.name || '').trim()
  if (!name) return
  addAnnualPlan({ userId: props.currentUser.id, name, year: addForm.value.year, selectedCourseIds: addForm.value.selectedCourseIds.slice() })
  addVisible.value = false
}

function openEdit(row) {
  editForm.value = { id: row.id, name: row.name, year: row.year, selectedCourseIds: row.selectedCourseIds ? row.selectedCourseIds.slice() : [] }
  editVisible.value = true
}
function submitEdit() {
  const name = (editForm.value.name || '').trim()
  if (!name) return
  updateAnnualPlan(editForm.value.id, { name, year: editForm.value.year, selectedCourseIds: editForm.value.selectedCourseIds.slice() })
  editVisible.value = false
}

function openDetail(row) {
  detailData.value = row
  detailVisible.value = true
}

function confirmRemove(row) {
  removeAnnualPlan(row.id)
}

function toggleCourseIn(formObj, courseId) {
  const arr = formObj.selectedCourseIds
  const i = arr.indexOf(courseId)
  if (i > -1) arr.splice(i, 1)
  else arr.push(courseId)
}

function isChecked(formObj, courseId) {
  return (formObj.selectedCourseIds || []).includes(courseId)
}
</script>

<template>
  <section class="annual-plan-page">
    <div class="page-header">
      <div class="title">
        <el-icon><Reading /></el-icon>
        <span>计划定义</span>
      </div>
      <div class="actions">
        <el-button type="primary" :icon="Plus" @click="openAdd">新增年度计划</el-button>
      </div>
    </div>

    <div class="filter-section">
      <el-input v-model="keyword" placeholder="搜索计划名称或年份" clearable style="width: 280px">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
    </div>

    <div class="table-container">
      <el-table :data="pagedPlans" border stripe>
        <el-table-column prop="name" label="计划名称" min-width="180" />
        <el-table-column prop="year" label="年份" width="100" />
        <el-table-column label="课程" min-width="260">
          <template #default="{ row }">
            <el-tag v-for="cid in (row.selectedCourseIds || [])" :key="cid" size="small" style="margin: 2px;">
              {{ getCourseName(cid) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="info" :icon="View" @click="openDetail(row)">详情</el-button>
            <el-button size="small" type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-popconfirm title="确认删除该计划？" @confirm="confirmRemove(row)">
              <template #reference>
                <el-button size="small" type="danger" :icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination-section">
      <el-pagination
        layout="prev, pager, next, jumper, total"
        :total="filteredPlans.length"
        :current-page="page"
        :page-size="pageSize"
        @current-change="(p)=> page = p"
      />
    </div>

    <!-- 新增 -->
    <el-dialog v-model="addVisible" title="新增年度计划" width="720px">
      <el-form label-width="120px">
        <el-form-item label="计划名称">
          <el-input v-model="addForm.name" placeholder="请输入计划名称" />
        </el-form-item>
        <el-form-item label="年份">
          <el-input-number v-model="addForm.year" :min="2000" :max="2100" />
        </el-form-item>
        <el-form-item label="课程选择">
          <div class="course-grid">
            <el-card v-for="cid in selectableCourseIds" :key="cid" class="course-card" shadow="hover" @click="toggleCourseIn(addForm, cid)">
              <div class="card-body">
                <el-checkbox :model-value="isChecked(addForm, cid)" @click.stop="toggleCourseIn(addForm, cid)"></el-checkbox>
                <div class="name">{{ getCourseName(cid) }}</div>
              </div>
            </el-card>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">保存</el-button>
      </template>
    </el-dialog>

    <!-- 编辑 -->
    <el-dialog v-model="editVisible" title="编辑年度计划" width="720px">
      <el-form label-width="120px">
        <el-form-item label="计划名称">
          <el-input v-model="editForm.name" placeholder="请输入计划名称" />
        </el-form-item>
        <el-form-item label="年份">
          <el-input-number v-model="editForm.year" :min="2000" :max="2100" />
        </el-form-item>
        <el-form-item label="课程选择">
          <div class="course-grid">
            <el-card v-for="cid in selectableCourseIds" :key="cid" class="course-card" shadow="hover" @click="toggleCourseIn(editForm, cid)">
              <div class="card-body">
                <el-checkbox :model-value="isChecked(editForm, cid)" @click.stop="toggleCourseIn(editForm, cid)"></el-checkbox>
                <div class="name">{{ getCourseName(cid) }}</div>
              </div>
            </el-card>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog v-model="detailVisible" title="年度计划详情" width="640px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="计划名称">{{ detailData?.name }}</el-descriptions-item>
        <el-descriptions-item label="年份">{{ detailData?.year }}</el-descriptions-item>
        <el-descriptions-item label="课程">
          <el-tag v-for="cid in (detailData?.selectedCourseIds || [])" :key="cid" style="margin: 2px;">
            {{ getCourseName(cid) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button type="primary" @click="detailVisible = false">知道了</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.annual-plan-page { display: flex; flex-direction: column; gap: 12px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 18px; }
.filter-section { display: flex; align-items: center; gap: 12px; }
.table-container { background: #fff; border-radius: 8px; overflow: hidden; }
.pagination-section { display: flex; justify-content: flex-end; padding: 12px 0; }

.course-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; width: 100%; }
.course-card { cursor: pointer; }
.card-body { display: flex; align-items: center; gap: 10px; }
.card-body .name { flex: 1; }
</style>


