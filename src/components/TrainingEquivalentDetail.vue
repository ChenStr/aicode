<template>
  <div class="training-equivalent-detail">
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        ← 返回
      </button>
      <h2>培训项目等效</h2>
    </div>

    <div class="form-container">
      <!-- 发起人信息 -->
      <div class="form-section">
        <h3>发起人信息</h3>
        <div class="form-row">
          <div class="form-item">
            <label>姓名：</label>
            <span class="form-value">{{ processData.initiatorName }}</span>
          </div>
          <div class="form-item">
            <label>所在部门：</label>
            <span class="form-value">{{ processData.initiatorDepartment }}</span>
          </div>
          <div class="form-item">
            <label>现工作岗位：</label>
            <span class="form-value">{{ processData.initiatorPosition }}</span>
          </div>
        </div>
      </div>

      <!-- 等效项目列表 -->
      <div class="form-section">
        <div class="section-header">
          <h3>等效项目列表</h3>
          <button class="add-item-btn" @click="addEquivalentItem">
            + 添加等效项目
          </button>
        </div>
        
        <div class="equivalent-items">
          <div 
            v-for="(item, index) in processData.equivalentItems" 
            :key="item.id"
            class="equivalent-item"
          >
            <div class="item-header">
              <span class="item-title">等效项目 {{ index + 1 }}</span>
              <button 
                v-if="processData.equivalentItems.length > 1"
                class="remove-btn" 
                @click="removeEquivalentItem(index)"
              >
                删除
              </button>
            </div>
            
            <div class="item-content">
              <div class="form-item">
                <label>等效培训项目：</label>
                <select v-model="item.courseId" @change="updateCourseName(item)">
                  <option value="">请选择培训项目</option>
                  <option 
                    v-for="course in onJobTrainingCourses" 
                    :key="course.id" 
                    :value="course.id"
                  >
                    {{ course.name }}
                  </option>
                </select>
              </div>
              
              <div class="form-item">
                <label>等效原因：</label>
                <textarea 
                  v-model="item.equivalentReason" 
                  placeholder="请填写等效原因..."
                  rows="3"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 签名区域 -->
      <div class="form-section">
        <h3>签名确认</h3>
        <div class="signatures">
          <div class="signature-item">
            <div class="signature-label">申请人：</div>
            <div class="signature-content">
              <span class="signature-name">{{ processData.initiatorName }}</span>
              <span class="signature-date">{{ processData.signatures.applicant.date || '未签名' }}</span>
            </div>
          </div>
          
          <div class="signature-item">
            <div class="signature-label">审查（培训工程师）：</div>
            <div class="signature-content">
              <span class="signature-name">{{ processData.signatures.trainingEngineer.name || '待签名' }}</span>
              <span class="signature-date">{{ processData.signatures.trainingEngineer.date || '未签名' }}</span>
            </div>
          </div>
          
          <div class="signature-item">
            <div class="signature-label">批准（部门经理）：</div>
            <div class="signature-content">
              <span class="signature-name">{{ processData.signatures.deptManager.name || '待签名' }}</span>
              <span class="signature-date">{{ processData.signatures.deptManager.date || '未签名' }}</span>
            </div>
          </div>
          
          <div class="signature-item">
            <div class="signature-label">批准（培训部部门经理）：</div>
            <div class="signature-content">
              <span class="signature-name">{{ processData.signatures.trainingDeptManager.name || '待签名' }}</span>
              <span class="signature-date">{{ processData.signatures.trainingDeptManager.date || '未签名' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <button class="cancel-btn" @click="goBack">取消</button>
        <button 
          v-if="!isSubmitted"
          class="submit-btn" 
          @click="submitProcess"
          :disabled="!canSubmit"
        >
          提交
        </button>
        <button 
          v-else
          class="view-btn" 
          @click="viewProcess"
        >
          查看流程状态
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getOnJobTrainingCourses, createProcess, submitProcess as submitProcessAction } from '../trainingProcesses.js'

const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  },
  processData: {
    type: Object,
    default: null
  },
  isNew: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['back', 'view-process'])

const onJobTrainingCourses = ref([])
const processData = ref({
  type: '培训项目等效',
  initiatorId: props.currentUser.id,
  initiatorName: props.currentUser.name,
  initiatorDepartment: props.currentUser.department,
  initiatorPosition: '',
  equivalentItems: [
    {
      id: `ei_${Date.now()}`,
      courseId: '',
      courseName: '',
      equivalentReason: ''
    }
  ],
  signatures: {
    applicant: {
      name: props.currentUser.name,
      date: '',
      signed: false
    },
    trainingEngineer: {
      name: '',
      date: '',
      signed: false
    },
    deptManager: {
      name: '',
      date: '',
      signed: false
    },
    trainingDeptManager: {
      name: '',
      date: '',
      signed: false
    }
  }
})

const isSubmitted = ref(false)

// 计算属性：是否可以提交
const canSubmit = computed(() => {
  return processData.value.equivalentItems.every(item => 
    item.courseId && item.equivalentReason.trim()
  )
})

// 加载在岗培训课程
function loadCourses() {
  onJobTrainingCourses.value = getOnJobTrainingCourses()
}

// 加载用户岗位信息
function loadUserPosition() {
  // 根据用户角色设置岗位信息
  const rolePositionMap = {
    'employee': '普通员工',
    'training_admin': '培训工程师',
    'assessor': '考核组成员',
    'section_chief': '科长',
    'dept_manager': '部门经理'
  }
  
  processData.value.initiatorPosition = rolePositionMap[props.currentUser.role] || props.currentUser.roleLabel || '未设置'
}

// 更新课程名称
function updateCourseName(item) {
  const course = onJobTrainingCourses.value.find(c => c.id === item.courseId)
  if (course) {
    item.courseName = course.name
  }
}

// 添加等效项目
function addEquivalentItem() {
  processData.value.equivalentItems.push({
    id: `ei_${Date.now()}`,
    courseId: '',
    courseName: '',
    equivalentReason: ''
  })
}

// 移除等效项目
function removeEquivalentItem(index) {
  processData.value.equivalentItems.splice(index, 1)
}

// 提交流程
function submitProcess() {
  if (!canSubmit.value) {
    alert('请完善所有必填信息')
    return
  }
  
  if (confirm('确定要提交此培训项目等效申请吗？')) {
    // 如果是新流程，先创建
    if (props.isNew) {
      const newProcess = createProcess(processData.value)
      submitProcessAction(newProcess.id)
    } else {
      submitProcessAction(processData.value.id)
    }
    
    isSubmitted.value = true
    alert('提交成功！流程已进入审查阶段。')
  }
}

// 查看流程状态
function viewProcess() {
  emit('view-process', processData.value)
}

// 返回
function goBack() {
  emit('back')
}

onMounted(() => {
  loadCourses()
  loadUserPosition()
  
  // 如果是编辑现有流程，加载数据
  if (props.processData && !props.isNew) {
    processData.value = { ...props.processData }
    isSubmitted.value = props.processData.submittedAt ? true : false
  }
})
</script>

<style scoped>
.training-equivalent-detail {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.back-btn {
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #e5e7eb;
}

.page-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 28px;
  font-weight: 600;
}

.form-container {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 40px;
}

.form-section h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 20px;
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.add-item-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-item-btn:hover {
  background: #2563eb;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-value {
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #6b7280;
  font-size: 14px;
}

.form-item select,
.form-item textarea {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-item select:focus,
.form-item textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.equivalent-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.equivalent-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.item-title {
  font-weight: 600;
  color: #374151;
  font-size: 16px;
}

.remove-btn {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.remove-btn:hover {
  background: #dc2626;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-item select,
.form-item textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s ease;
}

.form-item select:focus,
.form-item textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-item textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.signatures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.signature-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

.signature-label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  font-size: 14px;
}

.signature-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.signature-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 16px;
}

.signature-date {
  color: #6b7280;
  font-size: 14px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 30px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn {
  padding: 12px 24px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.submit-btn {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #2563eb;
}

.submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.view-btn {
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-btn:hover {
  background: #059669;
}
</style>
