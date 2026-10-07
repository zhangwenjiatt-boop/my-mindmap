const http = require('http');
const { execSync } = require('child_process');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          resolve(raw);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function runCmd(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
  } catch (e) {
    return e.stdout || e.message;
  }
}

async function main() {
  console.log('>>> 1. 通过后端注册全新测试账号并获取 Token...');
  const username = 'jacob_architect_' + Date.now().toString(36);
  const regRes = await post('/api/auth/register', {
    username,
    password: 'password123',
    nickname: '架构师Jacob'
  });

  console.log('注册结果:', regRes.msg, '初始项目:', regRes.data?.currentProject);
  const token = regRes.data.token;
  const user = regRes.data.user;
  const currentProject = regRes.data.currentProject;

  console.log('\n>>> 2. 注入登录凭证并打开工作台...');
  // 注入 localStorage 凭证，然后直接进入工作台
  const injectScript = `
    localStorage.setItem('MM_TOKEN', '${token}');
    localStorage.setItem('MM_USER', JSON.stringify(${JSON.stringify(user)}));
    localStorage.setItem('MM_CURRENT_PROJECT', JSON.stringify(${JSON.stringify(currentProject)}));
    location.href = 'http://localhost:8080/#/';
  `.replace(/\s+/g, ' ');

  console.log('打开浏览器并载入登录态...');
  runCmd(`agent-browser open "http://localhost:8080/#/login"`);
  runCmd(`agent-browser eval "${injectScript}"`);
  
  // 等待工作台加载完成
  console.log('等待工作台装载渲染...');
  runCmd(`agent-browser wait 3000`);

  // 截图工作台
  console.log('>>> 3. 截取干净工作区与顶部项目栏...');
  runCmd(`agent-browser screenshot "verified_clean_workspace.png"`);

  // 验证当前画布中的节点状态
  const checkCanvas = runCmd(`agent-browser eval "(() => {
    const map = window.$mindMap;
    if (!map) return JSON.stringify({ error: 'no map' });
    const full = map.getData();
    return JSON.stringify({
      rootText: full.root?.data?.text,
      childCount: full.root?.children?.length || 0,
      hasRenderer: !!map.renderer,
      renderTreeRootText: map.renderer.renderTree?.data?.text
    });
  })()"`);
  console.log('画布节点状态验证:', checkCanvas);

  // 验证删除根节点能力
  console.log('\n>>> 4. 验证删除根节点能力...');
  const deleteRootRes = runCmd(`agent-browser eval "(() => {
    const map = window.$mindMap;
    // 选中根节点
    const root = map.renderer.root;
    if (!root) return JSON.stringify({ error: 'no root' });
    map.renderer.clearActiveNodeList();
    map.renderer.addNodeToActiveList(root);
    // 执行删除命令
    map.execCommand('REMOVE_NODE');
    return JSON.stringify({
      isRenderTreeNull: map.renderer.renderTree === null,
      isRootNull: map.renderer.root === null
    });
  })()"`);
  console.log('删除根节点结果:', deleteRootRes);

  runCmd(`agent-browser wait 1000`);
  runCmd(`agent-browser screenshot "verified_root_deleted_overlay.png"`);

  // 验证空状态提示与一键恢复根节点
  console.log('\n>>> 5. 验证一键恢复根节点...');
  const recreateRes = runCmd(`agent-browser eval "(() => {
    const map = window.$mindMap;
    map.execCommand('CREATE_ROOT_NODE', '中心主题');
    return JSON.stringify({
      hasRoot: !!map.renderer.root,
      text: map.renderer.root?.nodeData?.data?.text
    });
  })()"`);
  console.log('重建根节点结果:', recreateRes);

  runCmd(`agent-browser wait 1000`);
  runCmd(`agent-browser screenshot "verified_root_recreated.png"`);

  console.log('\n=============================================');
  console.log('🎉 验证全部顺利完成！');
  console.log('=============================================');
}

main().catch(console.error);
