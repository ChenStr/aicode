import { reactive } from 'vue'

// 在岗培训活动数据存储
const STORAGE_KEY = 'on_job_training_store'
const persisted = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null

export const onJobTrainingStore = reactive({
  activities: persisted?.activities || [
    // 测试数据
    {
      id: 'ojt_001',
      name: '高压设备安全操作在岗培训',
      courseId: 'c_004',
      courseName: '高压设备在岗实操培训',
      type: '在岗培训',
      status: '未开始',
      startTime: '2024-02-01 09:00',
      endTime: '2024-02-01 17:00',
      department: '电气部',
      hours: 8,
      location: '电气车间',
      classroom: '培训室A',
      provider: '电气部',
      assessmentMethods: ['笔试', '面试'],
      instructorId: 'u_003',
      instructorName: '张飞',
      createdAt: '2024-01-15',
      createdBy: 'u_003'
    },
    {
      id: 'ojt_002',
      name: '电气设备维护在岗培训',
      courseId: 'c_005',
      courseName: '电气设备维护实操',
      type: '在岗培训',
      status: '考核中',
      startTime: '2024-01-20 08:30',
      endTime: '2024-01-20 16:30',
      department: '电气部',
      hours: 8,
      location: '电气车间',
      classroom: '维修实训室',
      provider: '电气部',
      assessmentMethods: ['笔试', '报告', '面试'],
      instructorId: 'u_003',
      instructorName: '张飞',
      createdAt: '2024-01-10',
      createdBy: 'u_003'
    }
  ],
  attendances: persisted?.attendances || [
    // 考核中活动的签到数据 - 使用电气部人员
    {
      id: 'att_001',
      activityId: 'ojt_002',
      userId: 'u_001',
      userName: '刘备',
      signedIn: true,
      signedInAt: '2024-01-20 08:25'
    },
    {
      id: 'att_002',
      activityId: 'ojt_002',
      userId: 'u_004',
      userName: '赵云',
      signedIn: true,
      signedInAt: '2024-01-20 08:30'
    },
    {
      id: 'att_003',
      activityId: 'ojt_002',
      userId: 'u_005',
      userName: '马超',
      signedIn: true,
      signedInAt: '2024-01-20 08:35'
    }
  ],
  scores: persisted?.scores || [
    // 考核中活动的成绩单数据 - 使用电气部人员
    {
      id: 'score_001',
      activityId: 'ojt_002',
      userId: 'u_001',
      userName: '刘备',
      writtenScore: 85,
      reportScore: 90,
      interviewScore: 88,
      passed: true,
      instructorComment: '表现优秀，各项技能掌握良好',
      completedAt: '2024-01-20 16:00'
    },
    {
      id: 'score_002',
      activityId: 'ojt_002',
      userId: 'u_004',
      userName: '赵云',
      writtenScore: 78,
      reportScore: 82,
      interviewScore: null,
      passed: false,
      instructorComment: '笔试和报告成绩良好，待完成面试考核',
      completedAt: ''
    },
    {
      id: 'score_003',
      activityId: 'ojt_002',
      userId: 'u_005',
      userName: '马超',
      writtenScore: null,
      reportScore: null,
      interviewScore: null,
      passed: false,
      instructorComment: '待完成各项考核',
      completedAt: ''
    }
  ]
})

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activities: onJobTrainingStore.activities,
      attendances: onJobTrainingStore.attendances,
      scores: onJobTrainingStore.scores
    }))
  } catch {}
}

// 获取部门的所有在岗培训活动
export function listActivitiesByDept(department) {
  return onJobTrainingStore.activities.filter(a => a.department === department)
}

// 获取用户作为讲师的活动
export function listActivitiesByInstructor(instructorId) {
  return onJobTrainingStore.activities.filter(a => a.instructorId === instructorId)
}

// 创建在岗培训活动
export function createActivity(payload) {
  const id = `ojt_${Math.random().toString(36).slice(2, 8)}`
  const activity = {
    id,
    status: '未开始',
    createdAt: new Date().toISOString().slice(0, 10),
    ...payload
  }
  onJobTrainingStore.activities.unshift(activity)
  persist()
  return id
}

// 更新活动状态
export function updateActivityStatus(id, status) {
  const idx = onJobTrainingStore.activities.findIndex(a => a.id === id)
  if (idx === -1) return false
  onJobTrainingStore.activities[idx].status = status
  persist()
  return true
}

// 签到
export function signIn(activityId, userId, userName) {
  const existing = onJobTrainingStore.attendances.find(a => a.activityId === activityId && a.userId === userId)
  if (existing) {
    existing.signedIn = true
    existing.signedInAt = new Date().toISOString().slice(0, 16)
  } else {
    const attendance = {
      id: `att_${Math.random().toString(36).slice(2, 8)}`,
      activityId,
      userId,
      userName,
      signedIn: true,
      signedInAt: new Date().toISOString().slice(0, 16)
    }
    onJobTrainingStore.attendances.push(attendance)
  }
  persist()
  return true
}

// 获取活动的签到列表
export function getActivityAttendances(activityId) {
  return onJobTrainingStore.attendances.filter(a => a.activityId === activityId && a.signedIn)
}

// 开始考核时创建成绩单
export function createScoreSheets(activityId) {
  const attendances = getActivityAttendances(activityId)
  const existingScores = onJobTrainingStore.scores.filter(s => s.activityId === activityId)
  
  // 为每个签到的学员创建成绩单
  attendances.forEach(attendance => {
    const existing = existingScores.find(s => s.userId === attendance.userId)
    if (!existing) {
      const score = {
        id: `score_${Math.random().toString(36).slice(2, 8)}`,
        activityId,
        userId: attendance.userId,
        userName: attendance.userName,
        writtenScore: null,
        reportScore: null,
        interviewScore: null,
        passed: false,
        instructorComment: '',
        completedAt: ''
      }
      onJobTrainingStore.scores.push(score)
    }
  })
  persist()
}

// 获取活动的成绩单
export function getActivityScores(activityId) {
  return onJobTrainingStore.scores.filter(s => s.activityId === activityId)
}

// 更新学员成绩
export function updateStudentScore(scoreId, scoreData) {
  const idx = onJobTrainingStore.scores.findIndex(s => s.id === scoreId)
  if (idx === -1) return false
  onJobTrainingStore.scores[idx] = { ...onJobTrainingStore.scores[idx], ...scoreData }
  persist()
  return true
}

// 归档活动
export function archiveActivity(activityId) {
  return updateActivityStatus(activityId, '已归档')
}

// 获取活动详情
export function getActivityById(id) {
  return onJobTrainingStore.activities.find(a => a.id === id) || null
}
