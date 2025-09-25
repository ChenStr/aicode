// 工作范围数据
export const WORK_SCOPES = [
  {
    id: '1',
    name: '管理文档',
    code: 'AD',
    description: '管理类文档工作范围',
    level: 1,
    parentId: null,
    department: '电气部',
    children: [
      {
        id: '1-1',
        name: '顶层文件',
        code: 'TD',
        description: '顶层文件工作范围',
        level: 2,
        parentId: '1',
        children: [
          {
            id: '1-1-1',
            name: '编写',
            code: 'TD-WRITE',
            description: '顶层文件编写工作',
            level: 3,
            parentId: '1-1',
            children: []
          },
          {
            id: '1-1-2',
            name: '校核',
            code: 'TD-REVIEW',
            description: '顶层文件校核工作',
            level: 3,
            parentId: '1-1',
            children: []
          },
          {
            id: '1-1-3',
            name: '审查',
            code: 'TD-AUDIT',
            description: '顶层文件审查工作',
            level: 3,
            parentId: '1-1',
            children: []
          },
          {
            id: '1-1-4',
            name: '批准',
            code: 'TD-APPROVE',
            description: '顶层文件批准工作',
            level: 3,
            parentId: '1-1',
            children: []
          }
        ]
      },
      {
        id: '1-2',
        name: '管理制度',
        code: 'AD',
        description: '管理制度工作范围',
        level: 2,
        parentId: '1',
        children: [
          {
            id: '1-2-1',
            name: '编写',
            code: 'AD-WRITE',
            description: '管理制度编写工作',
            level: 3,
            parentId: '1-2',
            children: []
          },
          {
            id: '1-2-2',
            name: '校核',
            code: 'AD-REVIEW',
            description: '管理制度校核工作',
            level: 3,
            parentId: '1-2',
            children: []
          },
          {
            id: '1-2-3',
            name: '审查',
            code: 'AD-AUDIT',
            description: '管理制度审查工作',
            level: 3,
            parentId: '1-2',
            children: []
          },
          {
            id: '1-2-4',
            name: '批准',
            code: 'AD-APPROVE',
            description: '管理制度批准工作',
            level: 3,
            parentId: '1-2',
            children: []
          }
        ]
      },
      {
        id: '1-3',
        name: '管理规定',
        code: 'MC',
        description: '管理规定工作范围',
        level: 2,
        parentId: '1',
        children: [
          {
            id: '1-3-1',
            name: '编写',
            code: 'MC-WRITE',
            description: '管理规定编写工作',
            level: 3,
            parentId: '1-3',
            children: []
          },
          {
            id: '1-3-2',
            name: '校核',
            code: 'MC-REVIEW',
            description: '管理规定校核工作',
            level: 3,
            parentId: '1-3',
            children: []
          },
          {
            id: '1-3-3',
            name: '审查',
            code: 'MC-AUDIT',
            description: '管理规定审查工作',
            level: 3,
            parentId: '1-3',
            children: []
          },
          {
            id: '1-3-4',
            name: '批准',
            code: 'MC-APPROVE',
            description: '管理规定批准工作',
            level: 3,
            parentId: '1-3',
            children: []
          }
        ]
      },
      {
        id: '1-4',
        name: '部门内部程序',
        code: 'BP',
        description: '部门内部程序工作范围',
        level: 2,
        parentId: '1',
        children: [
          {
            id: '1-4-1',
            name: '编写',
            code: 'BP-WRITE',
            description: '部门内部程序编写工作',
            level: 3,
            parentId: '1-4',
            children: []
          },
          {
            id: '1-4-2',
            name: '校核',
            code: 'BP-REVIEW',
            description: '部门内部程序校核工作',
            level: 3,
            parentId: '1-4',
            children: []
          },
          {
            id: '1-4-3',
            name: '审查',
            code: 'BP-AUDIT',
            description: '部门内部程序审查工作',
            level: 3,
            parentId: '1-4',
            children: []
          },
          {
            id: '1-4-4',
            name: '批准',
            code: 'BP-APPROVE',
            description: '部门内部程序批准工作',
            level: 3,
            parentId: '1-4',
            children: []
          }
        ]
      }
    ]
  },
  {
    id: '2',
    name: '维修文档',
    code: 'MD',
    description: '维修类文档工作范围',
    level: 1,
    parentId: null,
    department: '电气部',
    children: [
      {
        id: '2-1',
        name: '维修手册',
        code: 'RM',
        description: '维修手册工作范围',
        level: 2,
        parentId: '2',
        children: [
          {
            id: '2-1-1',
            name: '编写',
            code: 'RM-WRITE',
            description: '维修手册编写工作',
            level: 3,
            parentId: '2-1',
            children: []
          },
          {
            id: '2-1-2',
            name: '校核',
            code: 'RM-REVIEW',
            description: '维修手册校核工作',
            level: 3,
            parentId: '2-1',
            children: []
          },
          {
            id: '2-1-3',
            name: '审查',
            code: 'RM-AUDIT',
            description: '维修手册审查工作',
            level: 3,
            parentId: '2-1',
            children: []
          },
          {
            id: '2-1-4',
            name: '批准',
            code: 'RM-APPROVE',
            description: '维修手册批准工作',
            level: 3,
            parentId: '2-1',
            children: []
          }
        ]
      },
      {
        id: '2-2',
        name: '维修规程',
        code: 'RP',
        description: '维修规程工作范围',
        level: 2,
        parentId: '2',
        children: [
          {
            id: '2-2-1',
            name: '编写',
            code: 'RP-WRITE',
            description: '维修规程编写工作',
            level: 3,
            parentId: '2-2',
            children: []
          },
          {
            id: '2-2-2',
            name: '校核',
            code: 'RP-REVIEW',
            description: '维修规程校核工作',
            level: 3,
            parentId: '2-2',
            children: []
          },
          {
            id: '2-2-3',
            name: '审查',
            code: 'RP-AUDIT',
            description: '维修规程审查工作',
            level: 3,
            parentId: '2-2',
            children: []
          },
          {
            id: '2-2-4',
            name: '批准',
            code: 'RP-APPROVE',
            description: '维修规程批准工作',
            level: 3,
            parentId: '2-2',
            children: []
          }
        ]
      },
      {
        id: '2-3',
        name: '预防性维护',
        code: 'PM',
        description: '预防性维护工作范围',
        level: 2,
        parentId: '2',
        children: [
          {
            id: '2-3-1',
            name: '编写',
            code: 'PM-WRITE',
            description: '预防性维护编写工作',
            level: 3,
            parentId: '2-3',
            children: []
          },
          {
            id: '2-3-2',
            name: '校核',
            code: 'PM-REVIEW',
            description: '预防性维护校核工作',
            level: 3,
            parentId: '2-3',
            children: []
          },
          {
            id: '2-3-3',
            name: '审查',
            code: 'PM-AUDIT',
            description: '预防性维护审查工作',
            level: 3,
            parentId: '2-3',
            children: []
          },
          {
            id: '2-3-4',
            name: '批准',
            code: 'PM-APPROVE',
            description: '预防性维护批准工作',
            level: 3,
            parentId: '2-3',
            children: []
          }
        ]
      },
      {
        id: '2-4',
        name: '纠正性维护',
        code: 'CM',
        description: '纠正性维护工作范围',
        level: 2,
        parentId: '2',
        children: [
          {
            id: '2-4-1',
            name: '编写',
            code: 'CM-WRITE',
            description: '纠正性维护编写工作',
            level: 3,
            parentId: '2-4',
            children: []
          },
          {
            id: '2-4-2',
            name: '校核',
            code: 'CM-REVIEW',
            description: '纠正性维护校核工作',
            level: 3,
            parentId: '2-4',
            children: []
          },
          {
            id: '2-4-3',
            name: '审查',
            code: 'CM-AUDIT',
            description: '纠正性维护审查工作',
            level: 3,
            parentId: '2-4',
            children: []
          },
          {
            id: '2-4-4',
            name: '批准',
            code: 'CM-APPROVE',
            description: '纠正性维护批准工作',
            level: 3,
            parentId: '2-4',
            children: []
          }
        ]
      }
    ]
  },
  {
    id: '3',
    name: '培训文档',
    code: 'TD',
    description: '培训类文档工作范围',
    level: 1,
    parentId: null,
    department: '培训部',
    children: [
      {
        id: '3-1',
        name: '培训大纲',
        code: 'TO',
        description: '培训大纲工作范围',
        level: 2,
        parentId: '3',
        children: [
          {
            id: '3-1-1',
            name: '编写',
            code: 'TO-WRITE',
            description: '培训大纲编写工作',
            level: 3,
            parentId: '3-1',
            children: []
          },
          {
            id: '3-1-2',
            name: '审核',
            code: 'TO-REVIEW',
            description: '培训大纲审核工作',
            level: 3,
            parentId: '3-1',
            children: []
          }
        ]
      },
      {
        id: '3-2',
        name: '培训计划',
        code: 'TP',
        description: '培训计划工作范围',
        level: 2,
        parentId: '3',
        children: [
          {
            id: '3-2-1',
            name: '制定',
            code: 'TP-CREATE',
            description: '培训计划制定工作',
            level: 3,
            parentId: '3-2',
            children: []
          },
          {
            id: '3-2-2',
            name: '执行',
            code: 'TP-EXECUTE',
            description: '培训计划执行工作',
            level: 3,
            parentId: '3-2',
            children: []
          }
        ]
      }
    ]
  }
]

// 获取顶级工作范围（用于列表显示）
export function getTopLevelWorkScopes() {
  return WORK_SCOPES.filter(scope => scope.level === 1)
}

// 根据ID获取工作范围详情
export function getWorkScopeById(id) {
  function findScope(scopes, targetId) {
    for (const scope of scopes) {
      if (scope.id === targetId) {
        return scope
      }
      if (scope.children && scope.children.length > 0) {
        const found = findScope(scope.children, targetId)
        if (found) return found
      }
    }
    return null
  }
  return findScope(WORK_SCOPES, id)
}

// 添加新的工作范围
export function addWorkScope(scope) {
  // 生成新的ID
  const newId = Date.now().toString()
  scope.id = newId
  
  if (scope.parentId) {
    // 添加到父级
    const parent = getWorkScopeById(scope.parentId)
    if (parent) {
      if (!parent.children) parent.children = []
      parent.children.push(scope)
    }
  } else {
    // 添加到顶级
    WORK_SCOPES.push(scope)
  }
  
  return scope
}

// 更新工作范围
export function updateWorkScope(id, updates) {
  const scope = getWorkScopeById(id)
  if (scope) {
    Object.assign(scope, updates)
    return scope
  }
  return null
}

// 删除工作范围
export function deleteWorkScope(id) {
  function removeFromParent(scopes, targetId) {
    for (let i = 0; i < scopes.length; i++) {
      if (scopes[i].id === targetId) {
        return scopes.splice(i, 1)[0]
      }
      if (scopes[i].children && scopes[i].children.length > 0) {
        const removed = removeFromParent(scopes[i].children, targetId)
        if (removed) return removed
      }
    }
    return null
  }
  return removeFromParent(WORK_SCOPES, id)
}
