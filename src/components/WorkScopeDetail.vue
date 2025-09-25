<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Edit, Delete, Folder, Document } from '@element-plus/icons-vue'
import { getWorkScopeById, addWorkScope, updateWorkScope, deleteWorkScope } from '../workScopes'

const props = defineProps({
  currentUser: { type: Object, required: false, default: null },
  scopeId: { type: String, required: true }
})

const emit = defineEmits(['back'])

const workScope = ref(null)
const loading = ref(false)
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const editingScope = ref(null)

// 添加表单
const addForm = ref({
  name: '',
  code: '',
  description: '',
  parentId: null
})

// 编辑表单
const editForm = ref({
  name: '',
  code: '',
  description: ''
})

// 获取工作范围详情
const fetchWorkScope = () => {
  loading.value = true
  try {
    workScope.value = getWorkScopeById(props.scopeId)
  } catch (error) {
    ElMessage.error('获取工作范围详情失败')
  } finally {
    loading.value = false
  }
}

// 树形数据转换
const treeData = computed(() => {
  if (!workScope.value) return []
  return [workScope.value]
})

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

// 添加子级工作范围
const handleAddChild = (parentScope) => {
  addForm.value = {
    name: '',
    code: '',
    description: '',
    parentId: parentScope.id
  }
  showAddDialog.value = true
}

// 编辑工作范围
const handleEdit = (scope) => {
  editingScope.value = scope
  editForm.value = {
    name: scope.name,
    code: scope.code,
    description: scope.description
  }
  showEditDialog.value = true
}

// 删除工作范围
const handleDelete = async (scope) => {
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
      fetchWorkScope()
    } else {
      ElMessage.error('删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
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
      level: getWorkScopeById(addForm.value.parentId)?.level + 1 || 1,
      children: []
    }
    
    addWorkScope(newScope)
    ElMessage.success('添加成功')
    showAddDialog.value = false
    fetchWorkScope()
  } catch (error) {
    ElMessage.error('添加失败')
  }
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
    fetchWorkScope()
  } catch (error) {
    ElMessage.error('更新失败')
  }
}


onMounted(() => {
  fetchWorkScope()
})
</script>

<template>
  <div class="work-scope-detail">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="emit('back')">返回</el-button>
        <h2>{{ workScope?.name || '工作范围详情' }}</h2>
      </div>
      <div class="header-right">
        <el-tag v-if="workScope" type="info">{{ workScope.code }}</el-tag>
      </div>
    </div>

    <div class="page-description" v-if="workScope">
      <p>{{ workScope.description }}</p>
    </div>

    <el-card class="tree-card">
      <template #header>
        <div class="card-header">
          <span>工作范围层级结构</span>
          <el-button 
            v-if="workScope" 
            type="primary" 
            size="small" 
            :icon="Plus"
            @click="handleAddChild(workScope)"
          >
            添加子级
          </el-button>
        </div>
      </template>

      <el-table
        v-if="workScope"
        :data="treeData"
        stripe
        style="width: 100%"
        empty-text="暂无数据"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        row-key="id"
        :default-expand-all="true"
        class="work-scope-table"
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
        
        <el-table-column label="层级深度" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="success" size="small">
              {{ getMaxDepth(row) }} 级
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="子级数量" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ row.children ? row.children.length : 0 }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              :icon="Plus"
              @click="handleAddChild(row)"
            >
              添加子级
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
      
      <el-empty v-else description="暂无数据" />
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
      </el-form>
      
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleEditConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.work-scope-detail {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-description {
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.page-description p {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
}

.tree-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.work-scope-table {
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

/* 树形表格样式 */
:deep(.el-table__expand-icon) {
  color: #c0c4cc;
  font-size: 14px;
}

:deep(.el-table__expand-icon--expanded) {
  color: #409eff;
}

:deep(.el-table__indent) {
  padding-left: 20px;
}
</style>
