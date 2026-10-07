const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== 开始测试 1: 注册新用户与干净初始项目 ===');
  const testUser = 'tester_' + Date.now();
  const regRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: testUser,
    password: 'password123',
    nickname: '测试用户'
  });

  console.log('注册状态:', regRes.status, regRes.data.msg);
  if (regRes.status !== 200 || !regRes.data.data) {
    throw new Error('注册失败');
  }

  const { token, currentProject } = regRes.data.data;
  console.log('新用户初始项目:', currentProject);
  if (currentProject.nodeCount !== 1) {
    throw new Error(`预期初始节点数为 1 (干净工作区)，实际为: ${currentProject.nodeCount}`);
  }
  console.log('✓ 验证通过: 初始项目为纯净单节点空间');

  console.log('\n=== 开始测试 2: 获取初始项目详情 ===');
  const projDetailRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/projects/${currentProject.id}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('项目详情根节点文字:', projDetailRes.data.data.data.root.data.text);
  console.log('项目子节点数:', projDetailRes.data.data.data.root.children.length);
  if (projDetailRes.data.data.data.root.children.length !== 0) {
    throw new Error('初始项目不应有子分支，必须是干净工作区');
  }
  console.log('✓ 验证通过: 初始项目无杂乱子分支');

  console.log('\n=== 开始测试 3: 新建命名项目 ===');
  const customTitle = '2026年度业务规划总图';
  const createProjRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/projects',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    title: customTitle
  });

  console.log('新建项目响应:', createProjRes.data);
  const newProjId = createProjRes.data.data.id;

  const newProjDetailRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/projects/${newProjId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const rootText = newProjDetailRes.data.data.data.root.data.text;
  const childCount = newProjDetailRes.data.data.data.root.children.length;
  console.log('新建项目根节点标题:', rootText, '子分支数:', childCount);
  if (rootText !== customTitle) {
    throw new Error(`新建项目根节点文字应为 ${customTitle}，实际为 ${rootText}`);
  }
  if (childCount !== 0) {
    throw new Error(`新建项目应为纯净画布，实际子分支数: ${childCount}`);
  }
  console.log('✓ 验证通过: 新建命名项目自动为纯净单中心主题，名称与项目名完全对齐！');

  console.log('\n========================================');
  console.log('🎉 所有后端干净项目与命名验证 100% 通过！');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
