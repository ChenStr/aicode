import { reactive } from 'vue'

export const ROLE_OPTIONS = [
  { key: 'employee', label: '普通员工' },
  { key: 'training_admin', label: '培训工程师' },
  { key: 'assessor', label: '考核组成员' },
  { key: 'section_chief', label: '科长' },
  { key: 'dept_manager', label: '部门经理' },
]

function createAvatarDataUri(text, bg = '#4F46E5') {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>` +
      `<rect width='100%' height='100%' rx='12' ry='12' fill='${bg}'/>` +
      `<text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='28' font-family='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial' fill='#fff'>${text}</text>` +
    `</svg>`
  )
  return `data:image/svg+xml;charset=UTF-8,${svg}`
}

export const USERS = [
  { id: 'u_001', name: '刘备', department: '电气部', role: 'employee', roleLabel: '普通员工', avatar: createAvatarDataUri('刘备', '#2563EB') },
  { id: 'u_002', name: '关羽', department: '电气部', role: 'section_chief', roleLabel: '科长', avatar: createAvatarDataUri('关羽', '#16A34A') },
  { id: 'u_003', name: '张飞', department: '电气部', role: 'training_admin', roleLabel: '培训工程师', avatar: createAvatarDataUri('张飞', '#EA580C') },
  { id: 'u_004', name: '赵云', department: '电气部', role: 'assessor', roleLabel: '考核组成员', avatar: createAvatarDataUri('赵云', '#9333EA') },
  { id: 'u_005', name: '马超', department: '电气部', role: 'assessor', roleLabel: '考核组成员', avatar: createAvatarDataUri('马超', '#0EA5E9') },
  { id: 'u_006', name: '黄忠', department: '电气部', role: 'assessor', roleLabel: '考核组成员', avatar: createAvatarDataUri('黄忠', '#E11D48') },
  { id: 'u_007', name: '诸葛亮', department: '培训部', role: 'dept_manager', roleLabel: '部门经理', avatar: createAvatarDataUri('诸葛', '#10B981') },
  { id: 'u_008', name: '曹操', department: '电气部', role: 'dept_manager', roleLabel: '部门经理', avatar: createAvatarDataUri('曹操', '#F59E0B') },
]

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || 'null') : null

export const currentUser = reactive(
  persisted || { ...USERS[0] }
)

export function setCurrentUser(userId) {
  const found = USERS.find(u => u.id === userId)
  if (!found) return
  Object.assign(currentUser, found)
  persist()
}

export function setUser(partial) {
  Object.assign(currentUser, partial)
  persist()
}

function persist() {
  try {
    localStorage.setItem('currentUser', JSON.stringify({ ...currentUser }))
  } catch (e) {
    // no-op
  }
}
