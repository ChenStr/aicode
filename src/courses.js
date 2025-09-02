import { reactive } from 'vue'

const STORAGE_KEY = 'courses_store'

const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const coursesStore = reactive({
  courses: persisted?.courses || [
    { 
      id: 'c_001', 
      name: '电气安全基础', 
      type: '安全', 
      status: '启用', 
      department: '电气部',
      skillPracticeItems: [
        { id: 'p_001', workItemId: 'w_001', isRequired: true }
      ],
      operationPracticeItems: [
        { id: 'p_002', workItemId: 'w_002', isRequired: false }
      ]
    },
    { 
      id: 'c_002', 
      name: '配电系统入门', 
      type: '专业', 
      status: '启用', 
      department: '电气部',
      skillPracticeItems: [],
      operationPracticeItems: []
    },
    { 
      id: 'c_003', 
      name: '教学设计基础', 
      type: '通用', 
      status: '停用', 
      department: '培训部',
      skillPracticeItems: [
        { id: 'p_003', workItemId: 'w_003', isRequired: true }
      ],
      operationPracticeItems: []
    },
  ]
})

export function listCoursesByDept(dept) {
  return coursesStore.courses.filter(c => c.department === dept)
}

export function addCourse({ name, type, status, department }) {
  const id = `c_${Math.random().toString(36).slice(2, 8)}`
  coursesStore.courses.push({ id, name, type, status, department })
  persist()
  return id
}

export function updateCourse(id, patch) {
  const idx = coursesStore.courses.findIndex(c => c.id === id)
  if (idx === -1) return false
  coursesStore.courses[idx] = { ...coursesStore.courses[idx], ...patch }
  persist()
  return true
}

export function removeCourse(id) {
  const before = coursesStore.courses.length
  coursesStore.courses = coursesStore.courses.filter(c => c.id !== id)
  persist()
  return coursesStore.courses.length !== before
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ courses: coursesStore.courses }))
  } catch {}
}
