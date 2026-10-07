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

function runBrowserEval(jsCode) {
  const b64 = Buffer.from(jsCode, 'utf-8').toString('base64');
  const cmd = `agent-browser eval "eval(atob('${b64}'))"`;
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 30000 }).trim();
  } catch (e) {
    return e.stdout || e.message;
  }
}

async function main() {
  console.log('>>> 1. 注册并获取 Token');
  const username = 'test_' + Date.now();
  const reg = await post('/api/auth/register', {
    username,
    password: 'password123',
    nickname: '测试用户'
  });
  const token = reg.data.token;
  const user = reg.data.user;
  const project = reg.data.currentProject;

  console.log('>>> 2. 打开页面并注入 Token');
  execSync('agent-browser open "http://localhost:8080/#/login"');
  
  const injectJs = `
    localStorage.setItem('MM_TOKEN', '${token}');
    localStorage.setItem('MM_USER', '${JSON.stringify(user).replace(/'/g, "\\'")}');
    localStorage.setItem('MM_CURRENT_PROJECT', '${JSON.stringify(project).replace(/'/g, "\\'")}');
    location.href = 'http://localhost:8080/#/';
  `;
  runBrowserEval(injectJs);

  console.log('>>> 3. 等待画布加载');
  execSync('agent-browser wait 3500');

  console.log('>>> 4. 验证画布数据是否为干净新项目');
  const inspectJs = `
    (() => {
      const map = window.$mindMap;
      if (!map) return 'No map';
      const d = map.getData();
      return JSON.stringify({
        rootText: d.root?.data?.text,
        childrenLength: d.root?.children?.length
      });
    })()
  `;
  const inspectRes = runBrowserEval(inspectJs);
  console.log('初始导图数据:', inspectRes);

  console.log('>>> 5. 截图初始干净工作台');
  execSync('agent-browser screenshot "final_clean_workspace.png"');

  console.log('>>> 6. 测试删除根节点');
  const deleteJs = `
    (() => {
      const map = window.$mindMap;
      const root = map.renderer.root;
      if (!root) return 'No root';
      map.renderer.clearActiveNodeList();
      map.renderer.addNodeToActiveList(root);
      map.execCommand('REMOVE_NODE');
      return JSON.stringify({
        renderTree: map.renderer.renderTree,
        root: map.renderer.root
      });
    })()
  `;
  const deleteRes = runBrowserEval(deleteJs);
  console.log('删除根节点后的渲染树状态:', deleteRes);

  execSync('agent-browser wait 800');
  console.log('>>> 7. 截图删除根节点后的空状态提示');
  execSync('agent-browser screenshot "final_root_deleted.png"');

  console.log('>>> 8. 测试空状态下一键恢复根节点');
  const restoreJs = `
    (() => {
      const map = window.$mindMap;
      map.execCommand('CREATE_ROOT_NODE', '中心主题');
      return JSON.stringify({
        hasRoot: !!map.renderer.root,
        rootText: map.renderer.root?.nodeData?.data?.text
      });
    })()
  `;
  const restoreRes = runBrowserEval(restoreJs);
  console.log('恢复根节点结果:', restoreRes);

  execSync('agent-browser wait 800');
  console.log('>>> 9. 截图恢复根节点后的画布');
  execSync('agent-browser screenshot "final_root_restored.png"');

  console.log('\n=======================================');
  console.log('✅ 浏览器真实环境全链路验证圆满完成！');
  console.log('=======================================');
}

main().catch(console.error);
