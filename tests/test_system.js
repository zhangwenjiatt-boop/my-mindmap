const http = require('http');

function request(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runComprehensiveTests() {
  console.log('====================================================');
  console.log('       思绪思维导图 - 多用户与项目库完整性测试报告');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now().toString(36);
  const userA = { username: `alice_${timestamp}`, password: 'password_alice', nickname: '爱丽丝' };
  const userB = { username: `bob_${timestamp}`, password: 'password_bob', nickname: '鲍勃' };

  // 测试 1: 未授权访问受保护接口
  console.log('【测试组 1: 安全认证与权限拦截】');
  const unauthRes = await request('/api/projects', 'GET', null);
  assert(unauthRes.status === 401, '未携带 Token 访问 /api/projects 正确返回 401 Unauthorized');

  // 测试 2: 用户 A 注册与自动初始化项目
  console.log('\n【测试组 2: 用户注册与初始化】');
  const regA = await request('/api/auth/register', 'POST', userA);
  assert(regA.status === 200 && regA.data.code === 0, `用户 A (${userA.username}) 注册成功并生成 Token`);
  assert(regA.data.data.token && regA.data.data.user.nickname === '爱丽丝', '用户 A 个人信息返回正确');
  assert(regA.data.data.currentProject && regA.data.data.currentProject.title === '我的首个思维导图', '注册时自动初始化首个专属思维导图');

  const tokenA = regA.data.data.token;

  // 重复账号注册拦截
  const dupReg = await request('/api/auth/register', 'POST', userA);
  assert(dupReg.status === 400, '相同账号重复注册被有效拦截 (返回 400)');

  // 用户 B 注册
  const regB = await request('/api/auth/register', 'POST', userB);
  assert(regB.status === 200 && regB.data.code === 0, `用户 B (${userB.username}) 注册成功`);
  const tokenB = regB.data.data.token;

  // 测试 3: 登录凭证验证
  console.log('\n【测试组 3: 登录认证与密码防伪】');
  const wrongLogin = await request('/api/auth/login', 'POST', { username: userA.username, password: 'wrong_password' });
  assert(wrongLogin.status === 400 && wrongLogin.data.msg.includes('密码错误'), '错误密码登录被准确拦截');

  const correctLogin = await request('/api/auth/login', 'POST', { username: userA.username, password: userA.password });
  assert(correctLogin.status === 200 && correctLogin.data.data.token, '正确凭据登录成功并签发会话 Token');

  // 测试 4: 多用户数据空间物理隔离
  console.log('\n【测试组 4: 多用户多项目物理隔离验证】');
  // 用户 A 创建专属项目
  const projA1 = await request('/api/projects', 'POST', {
    title: '爱丽丝的产品路线图',
    data: {
      root: {
        data: { text: '产品战略 2026' },
        children: [
          { data: { text: '移动端迭代' }, children: [] },
          { data: { text: 'AI 工作台' }, children: [] }
        ]
      }
    }
  }, tokenA);
  assert(projA1.status === 200 && projA1.data.code === 0, '用户 A 成功创建私有导图《爱丽丝的产品路线图》');
  const aliceProjId = projA1.data.data.id;

  // 用户 B 查看自己的项目列表
  const listB = await request('/api/projects', 'GET', null, tokenB);
  const userBHasAliceProj = listB.data.data.some(p => p.id === aliceProjId || p.title === '爱丽丝的产品路线图');
  assert(!userBHasAliceProj, '用户 B 的项目库中完全不可见用户 A 的导图 (数据隔离验证通过)');

  // 用户 B 尝试直接读取用户 A 的项目 ID
  const crossAccess = await request(`/api/projects/${aliceProjId}`, 'GET', null, tokenB);
  assert(crossAccess.status === 404, '用户 B 越权读取用户 A 的导图被物理拦截 (返回 404)');

  // 测试 5: 项目 CRUD 完整性与云端持久化
  console.log('\n【测试组 5: 项目全生命周期管理 (CRUD / 副本 / 删除)】');
  // 5.1 读取详情
  const detailA = await request(`/api/projects/${aliceProjId}`, 'GET', null, tokenA);
  assert(detailA.data.data.data.root.data.text === '产品战略 2026', '完整脑图节点树数据拉取成功');

  // 5.2 更新与自动保存模拟
  const updateA = await request(`/api/projects/${aliceProjId}`, 'PUT', {
    title: '爱丽丝的产品路线图 (已定稿)',
    data: {
      root: {
        data: { text: '产品战略 2026 (定稿)' },
        children: [
          { data: { text: '移动端迭代' }, children: [] },
          { data: { text: 'AI 工作台' }, children: [] },
          { data: { text: '海外版多语言' }, children: [] }
        ]
      }
    }
  }, tokenA);
  assert(updateA.status === 200 && updateA.data.data.nodeCount === 4, '云端自动保存与节点数重算成功 (节点数: 4)');

  // 5.3 复制副本
  const dupA = await request(`/api/projects/${aliceProjId}/duplicate`, 'POST', {}, tokenA);
  assert(dupA.status === 200 && dupA.data.data.title.includes('副本'), '一键另存为副本功能成功');
  const dupId = dupA.data.data.id;

  // 5.4 删除副本
  const delDup = await request(`/api/projects/${dupId}`, 'DELETE', null, tokenA);
  assert(delDup.status === 200 && delDup.data.code === 0, '安全删除项目副本成功');

  // 5.5 登出测试
  console.log('\n【测试组 6: 会话注销与退出登录】');
  const logoutA = await request('/api/auth/logout', 'POST', null, tokenA);
  assert(logoutA.status === 200, '用户安全退出登录成功');

  const afterLogout = await request('/api/projects', 'GET', null, tokenA);
  assert(afterLogout.status === 401, '注销后 Token 立即失效，无法继续访问私有数据');

  console.log('\n====================================================');
  console.log(` 测试总结: 共 ${passed + failed} 项测试 | 通过: ${passed} | 失败: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runComprehensiveTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
