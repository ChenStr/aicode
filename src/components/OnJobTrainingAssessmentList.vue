<template>
  <div class="on-job-training-assessment-list">
    <div class="header">
      <h2>在岗培训考核</h2>
      <div class="header-actions">
        <div class="filter-section">
          <label>状态筛选：</label>
          <select v-model="statusFilter" @change="filterAssessments">
            <option value="">全部</option>
            <option value="进行中">进行中</option>
            <option value="已完成">已完成</option>
          </select>
        </div>
      </div>
    </div>

    <div class="assessment-list">
      <div v-if="filteredAssessments.length === 0" class="empty-state">
        <p>暂无在岗培训考核数据</p>
      </div>
      
      <div v-else class="assessment-cards">
        <div 
          v-for="assessment in filteredAssessments" 
          :key="assessment.id"
          class="assessment-card"
          @click="openAssessmentDetail(assessment)"
        >
          <div class="card-header">
            <h3>{{ assessment.activityName }}</h3>
            <span class="status-badge" :class="assessment.status === '已完成' ? 'completed' : 'in-progress'">
              {{ assessment.status }}
            </span>
          </div>
          
          <div class="card-content">
            <div class="info-row">
              <span class="label">课程：</span>
              <span class="value">{{ assessment.courseName }}</span>
            </div>
            
            <div class="info-row">
              <span class="label">考核方式：</span>
              <span class="value">{{ assessment.assessmentMethods.join('、') }}</span>
            </div>
            
            <div class="info-row">
              <span class="label">讲师：</span>
              <span class="value">{{ assessment.instructorName }}</span>
            </div>
            
            <div class="info-row">
              <span class="label">部门：</span>
              <span class="value">{{ assessment.department }}</span>
            </div>
            
            <div class="info-row">
              <span class="label">创建时间：</span>
              <span class="value">{{ assessment.createdAt }}</span>
            </div>
          </div>
          
          <div class="card-footer">
            <button class="view-detail-btn" @click.stop="openAssessmentDetail(assessment)">
              查看详情
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAssessmentsByUser } from '../onJobTrainingAssessments.js'

const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-detail'])

const assessments = ref([])
const statusFilter = ref('')

const filteredAssessments = computed(() => {
  if (!statusFilter.value) {
    return assessments.value
  }
  return assessments.value.filter(assessment => assessment.status === statusFilter.value)
})

function loadAssessments() {
  assessments.value = getAssessmentsByUser(props.currentUser.id)
}

function filterAssessments() {
  // 筛选逻辑已在 computed 中处理
}

function openAssessmentDetail(assessment) {
  emit('open-detail', assessment)
}

onMounted(() => {
  loadAssessments()
})
</script>

<style scoped>
.on-job-training-assessment-list {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 24px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-section label {
  font-weight: 500;
  color: #374151;
}

.filter-section select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 14px;
}

.assessment-list {
  min-height: 400px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  font-size: 16px;
}

.assessment-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.assessment-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.assessment-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.card-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  flex: 1;
  margin-right: 12px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-badge.in-progress {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.completed {
  background: #d1fae5;
  color: #059669;
}

.card-content {
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
  align-items: flex-start;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  font-weight: 500;
  color: #6b7280;
  min-width: 80px;
  flex-shrink: 0;
}

.info-row .value {
  color: #374151;
  flex: 1;
  word-break: break-word;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.view-detail-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.view-detail-btn:hover {
  background: #2563eb;
}

@media (max-width: 768px) {
  .on-job-training-assessment-list {
    padding: 15px;
  }
  
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .assessment-cards {
    grid-template-columns: 1fr;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .card-header h3 {
    margin-right: 0;
  }
}
</style>
