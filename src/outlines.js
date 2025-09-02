import { reactive } from 'vue'

const STORAGE_KEY = 'training_outlines_history'

// 仅模拟读取：初始化若无则放入示例数据；无新增入口
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const outlinesStore = reactive({
  records: persisted?.records || [
    { id: 't_001', title: '电气安全培训大纲', version: 'v1.0', updatedAt: '2024-07-10', department: '电气部', fileName: '电气安全培训大纲_v1.0.pdf' },
    { id: 't_002', title: '电气安全培训大纲', version: 'v1.1', updatedAt: '2024-10-02', department: '电气部', fileName: '电气安全培训大纲_v1.1.pdf' },
    { id: 't_003', title: '教学设计培训大纲', version: 'v3.2', updatedAt: '2025-01-15', department: '培训部', fileName: '教学设计培训大纲_v3.2.pdf' },
  ]
})

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ records: outlinesStore.records })) } catch {}
}
// 初始化一次
persist()

export function listOutlinesByDept(dept) {
  return outlinesStore.records.filter(r => r.department === dept)
}

export function downloadOutline(record) {
  // 模拟下载：生成简单文本/占位PDF内容并触发浏览器下载
  const content = `标题: ${record.title}\n版本: ${record.version}\n部门: ${record.department}\n更新时间: ${record.updatedAt}`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = record.fileName || `${record.title}_${record.version}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
