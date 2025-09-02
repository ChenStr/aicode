<script setup>
import SystemMenu from './components/SystemMenu.vue'
import CourseDefinition from './components/CourseDefinition.vue'
import WorkItemDefinition from './components/WorkItemDefinition.vue'
import TrainingOutlineHistory from './components/TrainingOutlineHistory.vue'
import MtaAuthorizationDefinition from './components/MtaAuthorizationDefinition.vue'
import PositionDefinition from './components/PositionDefinition.vue'
import PositionPlan from './components/PositionPlan.vue'
import { currentUser, USERS, setCurrentUser } from './user'
import { ref } from 'vue'

const currentPage = ref('')
</script>

<template>
  <div class="layout">
    <SystemMenu :current-user="currentUser" @select="(k)=> currentPage = k" />
    <main class="content">
      <div class="topbar">
        <div class="topbar-left">
          <el-form-item label="当前人员">
            <el-select :value="currentUser.id" @change="setCurrentUser" placeholder="选择用户">
              <el-option
                v-for="u in USERS"
                :key="u.id"
                :value="u.id"
                :label="`${u.name}（${u.department}｜${u.roleLabel}）`"
              />
            </el-select>
          </el-form-item>
        </div>
        <div class="topbar-right">
          <el-avatar :src="currentUser.avatar" :size="32" />
          <span class="user">{{ currentUser.name }}（{{ currentUser.department }}｜{{ currentUser.roleLabel }}）</span>
        </div>
      </div>

      <template v-if="currentPage === '工作项定义'">
        <WorkItemDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '课程定义'">
        <CourseDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '岗位培训大纲历史'">
        <TrainingOutlineHistory :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === 'MTA授权定义'">
        <MtaAuthorizationDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '岗位定义'">
        <PositionDefinition :current-user="currentUser" />
      </template>
      <template v-else-if="currentPage === '岗位规划'">
        <PositionPlan :current-user="currentUser" />
      </template>
      <template v-else>
        <el-card class="welcome-card">
          <template #header>
            <div class="card-header">
              <el-icon><Reading /></el-icon>
              <span>欢迎使用培训管理系统</span>
            </div>
          </template>
          <div class="welcome-content">
            <el-icon class="welcome-icon"><Menu /></el-icon>
            <p>请选择左侧菜单开始使用系统</p>
          </div>
        </el-card>
      </template>
    </main>
  </div>
  
</template>

<style scoped>
.layout {
  display: flex;
  width: 100vw;
  height: 100vh;
}
.content {
  flex: 1;
  padding: 24px;
  text-align: left;
}
.topbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.06);
  margin-bottom: 16px;
}
.topbar-left { display: flex; align-items: center; gap: 12px; }
.field { display: inline-flex; align-items: center; gap: 8px; color: #213547; }
.label { font-size: 14px; opacity: .8; }
.select { height: 32px; padding: 0 8px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; }
.topbar-right { display: flex; align-items: center; gap: 8px; color: #213547; }
.avatar-img { width: 28px; height: 28px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.avatar { font-size: 18px; }
.user { font-weight: 600; }

.welcome-card {
  margin-top: 40px;
  text-align: center;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
}

.welcome-content {
  padding: 40px 20px;
}

.welcome-icon {
  font-size: 64px;
  color: #409eff;
  margin-bottom: 20px;
}

.welcome-content p {
  font-size: 16px;
  color: #666;
  margin: 0;
}
</style>
