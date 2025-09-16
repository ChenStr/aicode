<script setup>
import { ref, computed } from 'vue'
import { certTemplatesStore, listTemplatesByDepartment, createTemplate, updateTemplate, removeTemplate } from '../certTemplates'
import { mtaAuthsStore } from '../mtaAuths'
import { ElMessage } from 'element-plus'

const props = defineProps({ currentUser: { type: Object, required: true } })

const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)

const visible = computed(() => listTemplatesByDepartment(props.currentUser.department))

function getMtaName(mtaId) {
  const m = mtaAuthsStore.items.find(m => m.id === mtaId)
  return m ? `${m.techName}（${m.code}）` : mtaId
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return visible.value.filter(t => {
    return !kw || t.name.toLowerCase().includes(kw) || (t.description||'').toLowerCase().includes(kw) || getMtaName(t.mtaId).toLowerCase().includes(kw)
  })
})
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

// 编辑/新增
const editDialog = ref(false)
const editing = ref(null)
const form = ref({ id: '', department: '', mtaId: '', name: '', description: '', backgroundUrl: '', defaultExpireYears: 5, contentTemplate: '', variables: [] })

function openCreate() {
  editing.value = null
  form.value = { id: '', department: props.currentUser.department, mtaId: '', name: '', description: '', backgroundUrl: '', defaultExpireYears: 5, contentTemplate: '【标题】\n{{applicantName}} 同志已完成{{mtaName}}对应培训项目……\n签发日期：{{issuedAt}}  有效期至：{{expireAt}}', variables: [
    { key: 'applicantName', label: '获取人', type: 'built_in' },
    { key: 'issuedAt', label: '签发时间', type: 'built_in' },
    { key: 'expireAt', label: '有效期至', type: 'built_in' },
    { key: 'mtaName', label: '授权名称', type: 'built_in' }
  ] }
  editDialog.value = true
}
function openEdit(row) {
  editing.value = row
  form.value = { ...row }
  editDialog.value = true
}
function saveEdit() {
  if (!form.value.mtaId) { ElMessage.error('请选择关联的MTA授权'); return }
  if (!form.value.name.trim()) { ElMessage.error('请输入模版名称'); return }
  if (editing.value) {
    updateTemplate(editing.value.id, { ...form.value })
    ElMessage.success('已保存')
  } else {
    const id = createTemplate({ ...form.value })
    ElMessage.success('已创建')
  }
  editDialog.value = false
}
function doRemove(row) {
  removeTemplate(row.id)
  ElMessage.success('已删除')
}

// 预览
const previewDialog = ref(false)
const previewData = ref({})
function openPreview(row) {
  previewData.value = { ...row }
  previewDialog.value = true
}
</script>

<template>
  <section class="cert-template-page">
    <div class="page-header">
      <div class="title">授权证书模版定义</div>
      <el-button type="primary" @click="openCreate">新增模版</el-button>
    </div>

    <div class="filters">
      <el-form inline>
        <el-form-item label="关键字">
          <el-input v-model="keyword" placeholder="模版名称/描述/MTA" clearable style="width: 260px" />
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="paged" stripe>
      <el-table-column prop="name" label="模版名称" min-width="160" />
      <el-table-column label="关联MTA" min-width="220">
        <template #default="{ row }">{{ getMtaName(row.mtaId) }}</template>
      </el-table-column>
      <el-table-column prop="defaultExpireYears" label="默认年限" width="100" />
      <el-table-column prop="description" label="说明" min-width="200" />
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" @click="openPreview(row)">预览</el-button>
          <el-button size="small" type="danger" @click="doRemove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        layout="prev, pager, next, jumper, total"
        :total="filtered.length"
        :current-page="page"
        :page-size="pageSize"
        @current-change="(p)=> page = p"
      />
    </div>

    <!-- 新增/编辑 -->
    <el-dialog v-model="editDialog" :title="editing ? '编辑模版' : '新增模版'" width="760px">
      <el-form label-width="120px">
        <el-form-item label="关联MTA">
          <el-select v-model="form.mtaId" filterable placeholder="选择所属MTA" style="width: 100%">
            <el-option v-for="m in mtaAuthsStore.items.filter(m=>m.department===props.currentUser.department)" :key="m.id" :label="getMtaName(m.id)" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="模版名称">
          <el-input v-model="form.name" placeholder="请输入模版名称" />
        </el-form-item>
        <el-form-item label="默认有效年限">
          <el-input-number v-model="form.defaultExpireYears" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="背景图片URL">
          <el-input v-model="form.backgroundUrl" placeholder="可粘贴图片URL" />
        </el-form-item>
        <el-form-item label="变量说明">
          <el-tag v-for="v in form.variables" :key="v.key" style="margin-right:6px">
            {{ v.label }}：{{ '{' }}{{ '{' }}{{ v.key }}{{ '}' }}{{ '}' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="内容模版">
          <el-input v-model="form.contentTemplate" type="textarea" :rows="8" placeholder="可在文本中使用 {{applicantName}}、{{issuedAt}}、{{expireAt}}、{{mtaName}} 等变量" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="模版说明（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog=false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览（统一样式：仅背景 + 内容） -->
    <el-dialog v-model="previewDialog" title="模版预览" width="820px">
      <div class="preview" :style="{ backgroundImage: previewData.backgroundUrl ? `url(${previewData.backgroundUrl})` : 'none' }">
        <pre class="content">{{ previewData.contentTemplate }}</pre>
      </div>
      <template #footer>
        <el-button @click="previewDialog=false">关闭</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.cert-template-page { display: flex; flex-direction: column; gap: 12px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.title { font-weight: 600; font-size: 18px; }
.filters { background: #fff; padding: 10px; border-radius: 8px; }
.pagination { display: flex; justify-content: flex-end; padding: 10px 0; }
.preview { min-height: 200px; background-size: cover; background-position: center; padding: 12px; border: 1px dashed #e5e7eb; }
.content { white-space: pre-wrap; background: #f8fafc; padding: 8px; border-radius: 6px; }
</style>
