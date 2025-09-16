<script setup>
import { ref, computed, watch } from 'vue'
import { listOutlinesByDept, downloadOutline } from '../outlines'
import { Document, Search, Download } from '@element-plus/icons-vue'

const props = defineProps({ currentUser: { type: Object, required: true } })

// 搜索与分页
const keyword = ref('')
const page = ref(1)
const pageSize = ref(5)

const baseList = computed(() => listOutlinesByDept(props.currentUser.department))

const filtered = computed(() => {
  const kw = keyword.value.trim()
  return baseList.value.filter(r => {
    if (!kw) return true
    return `${r.title}${r.version}${r.updatedAt}`.toLowerCase().includes(kw.toLowerCase())
  })
})

const total = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

watch([keyword, pageSize], () => { page.value = 1 })

function onDownload(row) {
  downloadOutline(row)
}
</script>

<template>
  <section class="course-panel">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <el-icon class="title-icon"><Document /></el-icon>
          <div>
            <h2 class="page-title">培训大纲历史</h2>
            <p class="page-subtitle">{{ props.currentUser.department }} · 共 {{ total }} 条历史记录</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <div class="filter-group">
        <div class="search-box">
          <el-input
            v-model="keyword"
            placeholder="搜索标题、版本或日期..."
            :prefix-icon="Search"
            clearable
          />
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table :data="paged" stripe style="width: 100%">
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="version" label="版本" width="120">
          <template #default="{ row }">
            <el-tag type="info">{{ row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="onDownload(row)" :icon="Download">
              下载附件
            </el-button>
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
  </section>
</template>

<style scoped>
/* 复用统一UI样式（与课程/工作项一致） */
.course-panel { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 20px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.title-section { display: flex; align-items: center; gap: 16px; }
.icon-wrapper { width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(59,130,246,0.3); }
.title-icon { font-size: 28px; }
.page-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }

.filter-section { margin-bottom: 24px; padding: 20px; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.filter-group { display: flex; flex-direction: column; gap: 16px; }
.search-box { position: relative; max-width: 400px; }
.search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 18px; color: #94a3b8; }
.search-input { width: 100%; padding: 14px 16px 14px 48px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 14px; transition: .3s; background: #f8fafc; }
.search-input:focus { outline: none; border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
.filter-controls { display: flex; gap: 20px; flex-wrap: wrap; }
.filter-item { display: flex; flex-direction: column; gap: 6px; }
.filter-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px; }
.filter-select { padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 14px; min-width: 120px; transition: .3s; }
.filter-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }

.table-container { margin-bottom: 24px; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.table-header { display: flex; align-items: center; justify-content: space-between; padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-bottom: 1px solid #e2e8f0; }
.table-title { font-size: 18px; font-weight: 600; color: #1e293b; }
.table-stats { font-size: 14px; color: #64748b; }
.data-table { overflow: hidden; }
.table-row { display: grid; grid-template-columns: 2fr 1fr 1.2fr 1.5fr; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; transition: .2s; }
.table-row.header { background: #f8fafc; font-weight: 600; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: .5px; }
.table-row:not(.header):hover { background: #f8fafc; transform: translateX(4px); }
.row-even { background: #fafbfc; }
.col-title, .col-version, .col-date, .col-actions { padding: 0 8px; }
.type-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #e0e7ff; color: #3730a3; }
.action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border: none; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; transition: .2s; margin-right: 8px; }
.action-btn.detail { background: #f3e8ff; color: #7c3aed; }
.action-btn.detail:hover { background: #e9d5ff; transform: translateY(-1px); }
.action-icon { font-size: 14px; }
.empty-state { padding: 60px 20px; text-align: center; color: #94a3b8; }
.empty-icon { font-size: 48px; margin-bottom: 16px; opacity: .5; }

.pagination-section { display: flex; align-items: center; justify-content: space-between; padding: 20px; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.06); }
.pagination-info { display: flex; align-items: center; gap: 12px; color: #64748b; font-size: 14px; }
.divider { color: #cbd5e1; }
.pagination-controls { display: flex; align-items: center; gap: 16px; }
.page-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: 2px solid #e2e8f0; background: #fff; color: #475569; border-radius: 10px; font-weight: 500; cursor: pointer; transition: .2s; }
.page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; transform: translateY(-1px); }
.page-btn:disabled { opacity: .5; cursor: not-allowed; }
.page-icon { font-size: 12px; }
.page-numbers { display: flex; align-items: center; gap: 4px; font-weight: 600; }
.current-page { color: #3b82f6; font-size: 18px; }
.page-separator { color: #cbd5e1; }
.total-pages { color: #64748b; }
</style>
