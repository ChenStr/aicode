<script setup>
import { ref, computed } from 'vue'
import { Reading, ArrowDown, Setting, Calendar, Trophy, User, Tools } from '@element-plus/icons-vue'

const props = defineProps({
  currentUser: { type: Object, required: false, default: null }
})
const emit = defineEmits(['select'])

const openGroups = ref(['后台管理'])
const activeKey = ref('课程定义')

const baseMenu = [
  {
    icon: 'Setting',
    label: '后台管理',
    children: [
      { key: '课程定义', label: '课程定义', roles: ['section_chief','training_admin','dept_manager'] },
      { key: '工作项定义', label: '实践项目定义', roles: ['section_chief','training_admin','dept_manager'] },
      { key: '岗位培训大纲历史', label: '岗位培训大纲历史' },
    ],
  },
  { icon: 'Calendar', label: '计划管理', children: [ { key: '岗位规划', label: '岗位规划' }, { key: '计划定义', label: '计划定义' }, { key: '计划统计', label: '计划统计', roles: ['section_chief','training_admin','dept_manager'] } ] },
  { icon: 'Reading', label: '培训管理', children: [
    { key: '培训管理', label: '培训管理' },
    { key: '在岗培训', label: '在岗培训' },
        { key: '在岗培训考核', label: '在岗培训考核' },
        { key: '在岗培训考核笔试题库', label: '在岗培训考核笔试题库', roles: ['training_admin','section_chief','dept_manager'] },
        { key: '在岗培训考核笔试试卷', label: '在岗培训考核笔试试卷', roles: ['training_admin','section_chief','dept_manager'] },
        { key: '培训发起流程', label: '发起流程' },
    { key: '培训指导', label: '培训指导' },
    { key: '实践考核记录', label: '实践考核记录' },
    { key: '实践考核记录评价', label: '实践考核记录评价', roles: ['training_admin','section_chief','dept_manager','assessor'] },
  ]},
  { icon: 'Trophy', label: 'MTA培训', children: [
    { key: 'MTA授权定义', label: 'MTA授权定义', roles: ['section_chief','training_admin','dept_manager'] },
    { key: '授权证书模版定义', label: '授权证书模版定义', roles: ['section_chief','training_admin','dept_manager'] },
    { key: '我的MTA授权', label: '我的MTA授权' },
    { key: '本部门授权情况', label: '本部门授权情况' },
    { key: '发起流程', label: '发起流程' },
    { key: 'MTA考核', label: 'MTA考核', roles: ['employee','training_admin','section_chief','dept_manager','assessor'] },
    { key: 'MTA考核题目定义', label: 'MTA考核笔试题库', roles: ['training_admin','section_chief','dept_manager'] },
    { key: 'MTA考核笔试试卷', label: 'MTA考核笔试试卷' },
  ]},
  { icon: 'User', label: '岗位管理', children: [
    { key: '岗位定义', label: '岗位定义', roles: ['section_chief','training_admin','dept_manager'] },
    { key: '岗位证书模版定义', label: '岗位证书模版定义', roles: ['section_chief','training_admin','dept_manager'] },
    { key: '岗位发展序列', label: '岗位发展序列' },
    { key: '岗位发起流程', label: '发起流程' },
    { key: '岗位考核', label: '岗位考核' },
    { key: '岗位撤销', label: '岗位撤销' },
    { key: '岗位工作总结设想', label: '岗位工作总结设想' },
    { key: '我的岗位', label: '我的岗位' },
  ]},
  { icon: 'Tools', label: '工作管理', children: [
    { key: '工作定义', label: '工作定义', roles: ['training_admin','section_chief','dept_manager'] },
    { key: '工作证书模版定义', label: '工作证书模版定义' },
    { key: '工作发起流程', label: '发起流程' },
    { key: '工作考核', label: '工作考核' },
    { key: '工作授权', label: '工作授权' },
    { key: '工作范围定义', label: '工作范围定义', roles: ['training_admin','section_chief','dept_manager'] },
  ]},
]

const menu = computed(() => {
  if (!props.currentUser) return baseMenu
  const userRole = props.currentUser.role
  return baseMenu.map(g => ({
    ...g,
    children: (g.children || []).filter(it => !it.roles || it.roles.includes(userRole))
  }))
})

function toggleGroup(label) {
  const i = openGroups.value.indexOf(label)
  if (i > -1) openGroups.value.splice(i, 1)
  else openGroups.value.push(label)
}

function selectItem(key) {
  activeKey.value = key
  emit('select', key)
}
</script>

<template>
  <aside class="sider">
    <div class="brand">
      <el-icon class="brand-icon"><Reading /></el-icon>
      <span class="brand-text">培训授权</span>
    </div>

    <nav class="menu">
      <template v-for="group in menu" :key="group.label">
        <div class="group">
          <div class="group-title" @click="toggleGroup(group.label)">
            <el-icon class="group-icon"><component :is="group.icon" /></el-icon>
            <span class="group-text">{{ group.label }}</span>
            <el-icon class="arrow" :class="{ open: openGroups.includes(group.label) }"><ArrowDown /></el-icon>
          </div>
          <transition name="collapse">
            <ul v-show="openGroups.includes(group.label)" class="sub-list">
              <li v-for="item in group.children" :key="item.key" class="sub-item" :class="{ active: activeKey === item.key }" @click="selectItem(item.key)">
                <span class="dot"/>
                <span class="text">{{ item.label }}</span>
              </li>
            </ul>
          </transition>
        </div>
      </template>
    </nav>
  </aside>
</template>

<style scoped>
.sider {
  width: 260px;
  height: 100vh;
  background: linear-gradient(180deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1976d2;
  padding: 16px 12px;
  box-sizing: border-box;
  overflow-y: auto;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 16px;
  padding: 12px 10px;
  margin-bottom: 8px;
}
.brand-icon { font-size: 20px; }

.menu { display: flex; flex-direction: column; gap: 8px; }
.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px;
  border-radius: 10px;
  color: #1976d2;
  cursor: pointer;
  position: relative;
}
/* 提高 hover 对比度：更亮的蓝色蒙层 */
.group-title:hover { background: rgba(25,118,210,0.1); color: #1565c0; }
.group-icon { width: 20px; text-align: center; font-size: 16px; }
.group-text { flex: 1; }
.arrow { transition: transform .2s ease; opacity: .9; }
.arrow.open { transform: rotate(180deg); }

.sub-list {
  list-style: none;
  padding: 6px 0 6px 34px;
  margin: 0;
}
.sub-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  margin: 4px 6px;
  border-radius: 10px;
  color: rgba(25,118,210,0.8);
  cursor: pointer;
}
.sub-item .dot {
  width: 8px; height: 8px; border-radius: 50%; background: rgba(25,118,210,0.4);
}
/* 子项 hover 更高对比度 */
.sub-item:hover { background: rgba(25,118,210,0.1); color: #1565c0; }
.sub-item.active {
  background: #1976d2;
  color: #ffffff;
}
.sub-item.active .dot { background: #ffffff; }

/* 折叠动画 */
.collapse-enter-from, .collapse-leave-to { height: 0; opacity: 0; }
.collapse-enter-to, .collapse-leave-from { height: auto; opacity: 1; }
.collapse-enter-active, .collapse-leave-active { transition: all .2s ease; overflow: hidden; }
</style>


