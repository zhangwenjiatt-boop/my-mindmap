Write-Host "================ 开始全流程端到端自动化验证 ================"

# 1. 打开登录页
Write-Host "1. 打开系统登录页..."
agent-browser open "http://localhost:8080/#/login"
Start-Sleep -Milliseconds 800

# 2. 切换到注册页并注册新用户
Write-Host "2. 切换到注册新账号..."
agent-browser click '@e3'
Start-Sleep -Milliseconds 500
agent-browser snapshot -i

$testUser = "auto_user_" + (Get-Date -Format "HHmmss")
Write-Host "注册新用户: $testUser"
agent-browser fill '@e7' $testUser
agent-browser fill '@e8' "pass123456"
# 昵称输入框
agent-browser fill '@e9' "测试架构师"
# 点击立即注册
agent-browser click '@e5'
Start-Sleep -Seconds 2

# 3. 验证进入工作区
Write-Host "3. 验证进入工作区与干净项目..."
agent-browser wait --url "http://localhost:8080/#/"
Start-Sleep -Seconds 1
$evalClean = agent-browser eval @"
(() => {
  const map = window.$mindMap;
  if (!map) return 'No mindmap';
  const data = map.getData();
  const rootText = data.root?.data?.text;
  const childCount = data.root?.children?.length || 0;
  return JSON.stringify({ rootText, childCount });
})()
"@
Write-Host "工作区初始导图状态: $evalClean"

# 4. 截图 1: 干净初始工作区与左上角【新建项目】按钮
Write-Host "4. 截取干净初始工作区截图..."
agent-browser screenshot "workspace_clean.png"

# 5. 测试删除根节点
Write-Host "5. 测试根节点删除能力..."
$deleteTest = agent-browser eval @"
(() => {
  const map = window.$mindMap;
  // 激活根节点
  const root = map.renderer.root;
  if (!root) return 'No root';
  map.renderer.clearActiveNodeList();
  map.renderer.addNodeToActiveList(root);
  // 执行删除节点命令
  map.execCommand('REMOVE_NODE');
  // 检查是否已被清空
  const isEmpty = !map.renderer.renderTree && !map.renderer.root;
  return JSON.stringify({ isEmpty });
})()
"@
Write-Host "删除根节点执行结果: $deleteTest"
Start-Sleep -Milliseconds 800

# 6. 截图 2: 根节点删除后的空画布提示状态
Write-Host "6. 截取根节点删除后的空状态提示..."
agent-browser screenshot "canvas_empty_state.png"

# 7. 测试重建根节点
Write-Host "7. 测试空画布下一键恢复根节点..."
$recreateTest = agent-browser eval @"
(() => {
  const map = window.$mindMap;
  map.execCommand('CREATE_ROOT_NODE', '中心主题');
  const hasRoot = !!(map.renderer.renderTree && map.renderer.root);
  const text = map.renderer.root?.nodeData?.data?.text;
  return JSON.stringify({ hasRoot, text });
})()
"@
Write-Host "重建根节点结果: $recreateTest"
Start-Sleep -Milliseconds 800

# 8. 截图 3: 恢复根节点后的画布
Write-Host "8. 截取恢复根节点后的画布..."
agent-browser screenshot "canvas_recreated.png"

Write-Host "================ 验证完成 ================"
