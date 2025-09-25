<script setup>
import { computed } from 'vue'
import { getById, signByEmployee, signByDeptManager, signByVp, submitRevocation } from '../positionRevocations'
import { positionsStore } from '../positions'
import { ElMessage } from 'element-plus'

const props = defineProps({ currentUser: { type: Object, required: true }, revocationId: { type: String, required: true } })
const emit = defineEmits(['back'])

const record = computed(() => getById(props.revocationId) || {})

function getPositionName(positionId) {
  const p = positionsStore.items.find(p => p.id === positionId)
  return p ? p.name : positionId
}

const canEmployeeSign = computed(() => props.currentUser.role === 'employee' && record.value.userId === props.currentUser.id && !record.value.employeeSigned)
const canDeptManagerSign = computed(() => ['training_admin','section_chief','dept_manager'].includes(props.currentUser.role) && record.value.department === props.currentUser.department && !record.value.deptManagerSigned)
// 由于当前角色集中，暂以部门经理同角色执行“分管领导签字”示例
const canVpSign = computed(() => ['dept_manager'].includes(props.currentUser.role) && record.value.department === props.currentUser.department && !record.value.vpSigned)

function doEmployeeSign() {
  signByEmployee(record.value.id)
  ElMessage.success('已签字')
}
function doDeptManagerSign() {
  signByDeptManager(record.value.id)
  ElMessage.success('已签字')
}
function doVpSign() {
  signByVp(record.value.id)
  ElMessage.success('已签字')
}
function doSubmit() {
  if (!record.value.employeeSigned) { ElMessage.error('请先由被撤销者签字确认'); return }
  submitRevocation(record.value.id)
  ElMessage.success('流程已提交')
}

function statusLabel(status) {
  if (status === 'submitted') return '已提交'
  if (status === 'completed') return '已完成'
  return '待提交'
}
function statusType(status) {
  if (status === 'submitted') return 'warning'
  if (status === 'completed') return 'success'
  return 'info'
}
</script>

<template>
  <section class="revocation-detail">
    <el-descriptions title="岗位撤销信息" :column="2" border>
      <el-descriptions-item label="姓名">{{ record.userName }}</el-descriptions-item>
      <el-descriptions-item label="所在部门">{{ record.department }}</el-descriptions-item>
      <el-descriptions-item label="撤销岗位技术授权名称" :span="2">{{ getPositionName(record.revokedPositionId) }}</el-descriptions-item>
      <el-descriptions-item label="授权日期">{{ record.authorizedAt }}</el-descriptions-item>
      <el-descriptions-item label="撤销授权日期">{{ record.revokedAt }}</el-descriptions-item>
      <el-descriptions-item label="状态"><el-tag :type="statusType(record.status)">{{ statusLabel(record.status) }}</el-tag></el-descriptions-item>
    </el-descriptions>

    <el-card class="sign-card" header="签字信息">
      <div class="sign-row">
        <div class="sign-item">
          <div class="label">被撤销者签字确认</div>
          <div class="value">
            <el-tag v-if="record.employeeSigned" type="success">已签字（{{ record.employeeSignedAt }}）</el-tag>
            <el-button v-else type="primary" :disabled="!canEmployeeSign" @click="doEmployeeSign">签字</el-button>
          </div>
        </div>
        <div class="sign-item">
          <div class="label">部门经理签字</div>
          <div class="value">
            <el-tag v-if="record.deptManagerSigned" type="success">已签字（{{ record.deptManagerSignedAt }}）</el-tag>
            <el-button v-else type="primary" :disabled="!canDeptManagerSign" @click="doDeptManagerSign">签字</el-button>
          </div>
        </div>
        <div class="sign-item">
          <div class="label">总经理部分管领导签字</div>
          <div class="value">
            <el-tag v-if="record.vpSigned" type="success">已签字（{{ record.vpSignedAt }}）</el-tag>
            <el-button v-else type="primary" :disabled="!canVpSign" @click="doVpSign">签字</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <div class="footer-actions">
      <el-button @click="emit('back')">返回</el-button>
      <el-button type="primary" @click="doSubmit">提交</el-button>
    </div>
  </section>
</template>

<style scoped>
.revocation-detail { display: flex; flex-direction: column; gap: 12px; }
.sign-card { }
.sign-row { display: grid; grid-template-columns: 1fr; gap: 12px; }
.sign-item { display: flex; align-items: center; justify-content: space-between; padding: 8px; border: 1px dashed #e5e7eb; border-radius: 8px; }
.label { font-weight: 600; }
.footer-actions { display: flex; gap: 8px; justify-content: flex-start; margin-top: 4px; }
</style>


