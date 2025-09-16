// 调试证书模版选择问题的脚本
// 在浏览器控制台中运行此脚本来诊断问题

console.log('开始调试证书模版选择问题...')

// 检查当前用户
const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}')
console.log('当前用户:', currentUser)

// 检查流程数据
const processesData = JSON.parse(localStorage.getItem('mta_processes_store') || '{"processes":[]}')
console.log('所有流程:', processesData.processes)

// 检查部门经理审核中的普通流程（非等效流程）
const deptManagerProcesses = processesData.processes.filter(p => 
  p.currentNode === '部门经理审核' && p.type !== 'equivalent'
)
console.log('部门经理审核中的普通流程:', deptManagerProcesses)

// 检查MTA授权数据
const mtaAuthsData = JSON.parse(localStorage.getItem('mta_auths_store') || '{"items":[]})
console.log('MTA授权数据:', mtaAuthsData.items)

// 检查证书模版数据
const templatesData = JSON.parse(localStorage.getItem('mta_cert_templates_store') || '{"templates":[]})
console.log('证书模版数据:', templatesData.templates)

if (deptManagerProcesses.length > 0) {
  const process = deptManagerProcesses[0]
  console.log('当前流程详情:', process)
  
  // 检查目标MTA
  const targetMta = mtaAuthsData.items.find(m => m.id === process.targetMtaId)
  console.log('目标MTA:', targetMta)
  
  if (targetMta) {
    // 检查该MTA的证书模版
    const templatesForMta = templatesData.templates.filter(t => t.mtaId === process.targetMtaId)
    console.log('该MTA的证书模版:', templatesForMta)
    
    if (templatesForMta.length === 0) {
      console.log('❌ 没有找到该MTA的证书模版！')
      console.log('请先在"授权证书模版定义"中为该MTA创建证书模版。')
    } else {
      console.log('✅ 找到', templatesForMta.length, '个证书模版')
      
      // 检查模版是否有正确的ID
      templatesForMta.forEach((template, index) => {
        console.log(`模版 ${index + 1}:`, {
          id: template.id,
          name: template.name,
          description: template.description,
          mtaId: template.mtaId,
          department: template.department,
          hasValidId: !!template.id && template.id.trim() !== ''
        })
      })
    }
  } else {
    console.log('❌ 没有找到目标MTA！')
  }
} else {
  console.log('❌ 没有找到部门经理审核中的普通流程！')
  console.log('请先发起一个MTA授权申请并进入部门经理审核阶段。')
}

// 检查Vue组件状态
console.log('请检查以下内容：')
console.log('1. 在浏览器开发者工具中，切换到Elements标签')
console.log('2. 找到证书模版选择的下拉框元素')
console.log('3. 检查该元素的v-model绑定是否正确')
console.log('4. 在Console中输入以下命令来检查Vue组件状态：')
console.log('   - 检查managerCert: console.log("managerCert:", managerCert)')
console.log('   - 检查availableCertTemplates: console.log("availableCertTemplates:", availableCertTemplates)')
console.log('   - 检查selectedTemplate: console.log("selectedTemplate:", selectedTemplate)')

console.log('调试完成！')

