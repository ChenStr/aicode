<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, View, Search, Folder } from '@element-plus/icons-vue'
import { getTopLevelWorkScopes, deleteWorkScope, addWorkScope, updateWorkScope } from '../workScopes'

const props = defineProps({
  currentUser: { type: Object, required: false, default: null }
})

const emit = defineEmits(['open-detail'])

const workScopes = ref([])
const loading = ref(false)
const searchText = ref('')
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const editingScope = ref(null)
const addForm = ref({
  name: '',
  code: '',
  description: '',
  department: ''
})
const editForm = ref({
  name: '',
  code: '',
  description: ''
})

// 权限检查
const hasPermission = computed(() => {
  if (!props.currentUser) return false
  const allowedRoles = ['training_admin', 'section_chief', 'dept_manager']
  return allowedRoles.includes(props.currentUser.role)
})

// 过滤部门数据
const filteredWorkScopes = computed(() => {
  let scopes = workScopes.value
  
  // 按搜索文本过滤
  if (searchText.value) {
    scopes = scopes.filter(scope => 
      scope.name.includes(searchText.value) || 
      scope.code.includes(searchText.value) ||
      scope.description.includes(searchText.value)
    )
  }
  
  // 按部门过滤（只有培训工程师、科长、部门经理可以访问，且只能看自己部门的数据）
  if (hasPermission.value && props.currentUser.department) {
    scopes = scopes.filter(scope => scope.department === props.currentUser.department)
  }
  
  return scopes
})

// 获取工作范围列表
const fetchWorkScopes = () => {
  loading.value = true
  try {
    workScopes.value = getTopLevelWorkScopes()
  } catch (error) {
    ElMessage.error('获取工作范围列表失败')
  } finally {
    loading.value = false
  }
}

// 查看详情
const handleViewDetail = (scope) => {
  emit('open-detail', scope.id)
}

// 编辑工作范围
const handleEdit = (scope) => {
  if (!hasPermission.value) {
    ElMessage.warning('您没有权限编辑工作范围')
    return
  }
  
  // 检查是否属于当前用户部门
  if (scope.department !== props.currentUser.department) {
    ElMessage.warning('您只能编辑本部门的工作范围')
    return
  }
  
  editingScope.value = scope
  editForm.value = {
    name: scope.name,
    code: scope.code,
    description: scope.description
  }
  showEditDialog.value = true
}

// 确认编辑
const handleEditConfirm = () => {
  if (!editForm.value.name || !editForm.value.code) {
    ElMessage.warning('请填写工作范围名称和编码')
    return
  }
  
  try {
    updateWorkScope(editingScope.value.id, editForm.value)
    ElMessage.success('更新成功')
    showEditDialog.value = false
    fetchWorkScopes()
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

// 删除工作范围
const handleDelete = async (scope) => {
  if (!hasPermission.value) {
    ElMessage.warning('您没有权限删除工作范围')
    return
  }
  
  // 检查是否属于当前用户部门
  if (scope.department !== props.currentUser.department) {
    ElMessage.warning('您只能删除本部门的工作范围')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除工作范围"${scope.name}"吗？删除后其所有子级工作范围也将被删除。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const deleted = deleteWorkScope(scope.id)
    if (deleted) {
      ElMessage.success('删除成功')
      fetchWorkScopes()
    } else {
      ElMessage.error('删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 添加工作范围
const handleAdd = () => {
  if (!hasPermission.value) {
    ElMessage.warning('您没有权限添加工作范围')
    return
  }
  
  addForm.value = {
    name: '',
    code: '',
    description: '',
    department: props.currentUser.department
  }
  showAddDialog.value = true
}

// 确认添加
const handleAddConfirm = () => {
  if (!addForm.value.name || !addForm.value.code) {
    ElMessage.warning('请填写工作范围名称和编码')
    return
  }
  
  try {
    const newScope = {
      ...addForm.value,
      level: 1,
      parentId: null,
      children: []
    }
    
    addWorkScope(newScope)
    ElMessage.success('添加成功')
    showAddDialog.value = false
    fetchWorkScopes()
  } catch (error) {
    ElMessage.error('添加失败')
  }
}

onMounted(() => {
  fetchWorkScopes()
})
</script>

<template>
  <div class="work-scope-definition">
    <!-- 权限检查 -->
    <template v-if="!hasPermission">
      <el-result
        icon="warning"
        title="访问受限"
        sub-title="您没有权限访问工作范围定义功能，只有培训工程师、科长、部门经理可以访问"
      >
        <template #extra>
          <el-button type="primary" @click="$emit('back')">返回</el-button>
        </template>
      </el-result>
    </template>
    
    <template v-else>
      <div class="page-header">
        <h2>工作范围定义</h2>
        <p class="page-description">管理工作范围层级结构，为工作授权划定精确的工作范围</p>
        <div class="permission-info">
          <el-tag type="info" size="small">
            当前部门：{{ currentUser.department }} | 角色：{{ currentUser.roleLabel }}
          </el-tag>
        </div>
      </div>

      <div class="toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="searchText"
            placeholder="搜索工作范围名称、编码或描述"
            clearable
            style="width: 300px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" :icon="Plus" @click="handleAdd">
            添加工作范围
          </el-button>
        </div>
      </div>

    <el-card class="table-card">
      <el-table
        :data="filteredWorkScopes"
        :loading="loading"
        stripe
        style="width: 100%"
        empty-text="暂无工作范围数据"
      >
        <el-table-column prop="name" label="工作范围名称" min-width="200">
          <template #default="{ row }">
            <div class="scope-name">
              <el-icon class="scope-icon"><Folder /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="code" label="编码" width="120" />
        
        <el-table-column prop="description" label="描述" min-width="250" />
        
        <el-table-column prop="department" label="所属部门" width="120" />
        
        <el-table-column label="子级数量" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ row.children ? row.children.length : 0 }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="层级深度" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="success" size="small">
              {{ getMaxDepth(row) }} 级
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              :icon="View"
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
            <el-button
              type="warning"
              size="small"
              :icon="Edit"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              :icon="Delete"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加对话框 -->
    <el-dialog
      v-model="showAddDialog"
      title="添加工作范围"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="addForm" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="addForm.name" placeholder="请输入工作范围名称" />
        </el-form-item>
        <el-form-item label="编码" required>
          <el-input v-model="addForm.code" placeholder="请输入工作范围编码" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="addForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入工作范围描述"
          />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-input v-model="addForm.department" disabled />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddConfirm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑工作范围"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="editForm.name" placeholder="请输入工作范围名称" />
        </el-form-item>
        <el-form-item label="编码" required>
          <el-input v-model="editForm.code" placeholder="请输入工作范围编码" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入工作范围描述"
          />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-input :value="editingScope?.department" disabled />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleEditConfirm">确定</el-button>
      </template>
    </el-dialog>
    </template>
  </div>
</template>

<script>
import { computed } from 'vue'
import { Search, Folder } from '@element-plus/icons-vue'

// 计算树的最大深度
function getMaxDepth(node) {
  if (!node.children || node.children.length === 0) {
    return 1
  }
  let maxChildDepth = 0
  for (const child of node.children) {
    const childDepth = getMaxDepth(child)
    maxChildDepth = Math.max(maxChildDepth, childDepth)
  }
  return maxChildDepth + 1
}
</script>

<style scoped>
.work-scope-definition {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-description {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 14px;
}

.permission-info {
  margin-top: 8px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.scope-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scope-icon {
  color: #409eff;
  font-size: 16px;
}

:deep(.el-table) {
  border-radius: 8px;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  color: #303133;
  font-weight: 600;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #fafafa;
}
</style>
