<script setup>
import { computed } from 'vue'
import { coursesStore } from '../courses'
import { getTrainingGuidanceById, getStageLabel, getStatusLabel, advanceGuidanceStage } from '../trainingGuidances'
import { ElMessage } from 'element-plus'

const props = defineProps({ currentUser: { type: Object, required: true }, guidanceId: { type: String, required: true } })
const emit = defineEmits(['back', 'approved'])

const item = computed(() => getTrainingGuidanceById(props.guidanceId))

function getCourseName(id) { const c = coursesStore.courses.find(c => c.id === id); return c ? c.name : id }

function formatDate(val) {
  if (!val) return ''
  if (typeof val === 'string') {
    // 取前10位确保为 YYYY-MM-DD
    return val.slice(0, 10)
  }
  try {
    return new Date(val).toISOString().slice(0, 10)
  } catch (e) {
    return ''
  }
}

function tryApprove() {
  if (!item.value) return
  const ok = advanceGuidanceStage(item.value, props.currentUser.role, props.currentUser)
  if (ok) {
    ElMessage.success('操作成功，流程已推进')
    emit('approved')
  } else {
    ElMessage.warning('您无权或当前阶段不可进行该操作')
  }
}
</script>

<template>
  <section v-if="item">
    <el-page-header @back="$emit('back')" content="培训指导详情" />

    <el-card style="margin-top:12px;">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>基本信息</div>
          <div>
            <el-tag :type="item.currentStage === 'completed' ? 'success' : 'info'" style="margin-right:8px;">{{ getStatusLabel(item.currentStage) }}</el-tag>
            <el-button type="primary" @click="tryApprove">提交/签字</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="姓名">{{ item.basicInfo?.name }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ item.basicInfo?.gender }}</el-descriptions-item>
        <el-descriptions-item label="出生年月">{{ item.basicInfo?.birthday }}</el-descriptions-item>
        <el-descriptions-item label="学历">{{ item.basicInfo?.education }}</el-descriptions-item>
        <el-descriptions-item label="员工号">{{ item.basicInfo?.employeeNo }}</el-descriptions-item>
        <el-descriptions-item label="毕业院校">{{ item.basicInfo?.university }}</el-descriptions-item>
        <el-descriptions-item label="专业">{{ item.basicInfo?.major }}</el-descriptions-item>
        <el-descriptions-item label="岗位方向">{{ item.basicInfo?.positionDirection }}</el-descriptions-item>
        <el-descriptions-item label="员工类别">{{ item.basicInfo?.employeeCategory }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card style="margin-top:12px;">
      <template #header>培训实习计划</template>
      <el-timeline>
        <el-timeline-item
          v-for="(p, idx) in item.plans"
          :key="idx"
          :timestamp="(p.dateRange && (p.dateRange[0] || p.dateRange[1]))
            ? `${formatDate(p.dateRange[0])} ~ ${formatDate(p.dateRange[1])}`
            : '公司统一安排'"
        >
          <div>责任部门：{{ p.responsibleDept || '-' }}</div>
          <div>主要培训内容：
            <span v-if="(p.courseIds || []).length">{{ p.courseIds.map(getCourseName).join('，') }}</span>
            <span v-else>-</span>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <el-card style="margin-top:12px;">
      <template #header>签字记录</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="员工签字">
          <div v-if="item.signatures.employee.signedAt">
            <div>时间：{{ item.signatures.employee.signedAt }}</div>
            <div v-if="item.signatures.employee.signedImage" style="margin-top:6px;"><img :src="item.signatures.employee.signedImage" alt="签名" style="height:40px;" /></div>
          </div>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="师傅签字">
          <div v-if="item.signatures.mentor.signedAt">
            <div>时间：{{ item.signatures.mentor.signedAt }}</div>
            <div v-if="item.signatures.mentor.signedImage" style="margin-top:6px;"><img :src="item.signatures.mentor.signedImage" alt="签名" style="height:40px;" /></div>
          </div>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="培训工程师签字">
          <div v-if="item.signatures.trainer.signedAt">
            <div>时间：{{ item.signatures.trainer.signedAt }}</div>
            <div v-if="item.signatures.trainer.signedImage" style="margin-top:6px;"><img :src="item.signatures.trainer.signedImage" alt="签名" style="height:40px;" /></div>
          </div>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="部门经理签字">
          <div v-if="item.signatures.manager.signedAt">
            <div>时间：{{ item.signatures.manager.signedAt }}</div>
            <div v-if="item.signatures.manager.signedImage" style="margin-top:6px;"><img :src="item.signatures.manager.signedImage" alt="签名" style="height:40px;" /></div>
          </div>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </section>
  <section v-else>
    <el-empty description="未找到该培训指导" />
  </section>
</template>

<style scoped>
</style>


