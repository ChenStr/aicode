import { reactive } from 'vue'

const STORAGE_KEY = 'training_records_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

// 课程成绩：{ id, userId, courseId, score, result, startAt, endAt }
// 实践完成：{ id, userId, workItemId, source: 'position' | 'mta', finishedAt }
// 实践审核记录：{ id, userId, workItemId, status, submittedAt, attachments, trainingEngineerId, trainingEngineerComment, assessorId, assessorComment, assessedAt }
export const trainingRecordsStore = reactive({
  courseScores: persisted?.courseScores || [
    { id: 'cs_001', userId: 'u_001', courseId: 'c_001', score: 86, result: '通过', startAt: '2025-02-01', endAt: '2025-02-10' },
  ],
  practiceDone: persisted?.practiceDone || [
    { id: 'pd_001', userId: 'u_001', workItemId: 'w_004', source: 'position', finishedAt: '2025-02-18' },
  ],
  practiceAudits: persisted?.practiceAudits || [
    { 
      id: 'pa_001', 
      userId: 'u_001', 
      workItemId: 'w_004', 
      status: 'submitted', 
      submittedAt: '2025-02-15', 
      attachments: ['attachment1.pdf'], 
      trainingEngineerId: null, 
      trainingEngineerComment: '', 
      assessorId: null, 
      assessorComment: '', 
      assessedAt: null 
    }
  ]
})

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ courseScores: trainingRecordsStore.courseScores, practiceDone: trainingRecordsStore.practiceDone, practiceAudits: trainingRecordsStore.practiceAudits })) } catch {}
}

export function listMyCourseScores(userId) {
  return trainingRecordsStore.courseScores.filter(r => r.userId === userId)
}

export function listMyPractices(userId) {
  return trainingRecordsStore.practiceDone.filter(r => r.userId === userId)
}

export function addCourseScore(payload) {
  const id = `cs_${Math.random().toString(36).slice(2,8)}`
  trainingRecordsStore.courseScores.unshift({ id, ...payload })
  persist()
  return id
}

export function addPracticeDone(payload) {
  const id = `pd_${Math.random().toString(36).slice(2,8)}`
  trainingRecordsStore.practiceDone.unshift({ id, ...payload })
  persist()
  return id
}

// 实践审核相关
export function listMyPracticeAudits(userId) {
  return trainingRecordsStore.practiceAudits.filter(r => r.userId === userId)
}

export function addPracticeAudit(payload) {
  const id = `pa_${Math.random().toString(36).slice(2,8)}`
  trainingRecordsStore.practiceAudits.unshift({ 
    id, 
    status: 'submitted', 
    submittedAt: new Date().toISOString().slice(0,10), 
    attachments: [], 
    trainingEngineerId: null, 
    trainingEngineerComment: '', 
    assessorId: null, 
    assessorComment: '', 
    assessedAt: null,
    ...payload 
  })
  persist()
  return id
}

export function updatePracticeAudit(id, patch) {
  const idx = trainingRecordsStore.practiceAudits.findIndex(r => r.id === id)
  if (idx === -1) return false
  trainingRecordsStore.practiceAudits[idx] = { ...trainingRecordsStore.practiceAudits[idx], ...patch }
  persist()
  return true
}


