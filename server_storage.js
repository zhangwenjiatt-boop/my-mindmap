const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');

// 确保目录和核心数据文件存在
function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]', 'utf-8');
  }
  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, '{}', 'utf-8');
  }
}

initStorage();

// 工具函数
function readJson(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
  }
  return fallback;
}

function writeJson(filePath, data) {
  try {
    const tempFile = filePath + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);
    return true;
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
    return false;
  }
}

function generateId(prefix = '') {
  return prefix + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
}

function countNodes(node) {
  if (!node) return 0;
  let count = 1;
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    createdAt: user.createdAt
  };
}

// 过滤去除 HTML 标签，返回纯文本标题
function stripHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// 默认新导图数据（纯净单中心主题，干净清爽）
const defaultMindMapData = {
  root: {
    data: {
      text: '中心主题'
    },
    children: []
  },
  theme: {
    template: 'classic4',
    config: {}
  },
  layout: 'logicalStructure',
  view: null
};

// 会话管理
function getSessionUser(req) {
  const authHeader = req.headers['authorization'] || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  const sessions = readJson(SESSIONS_FILE, {});
  const session = sessions[token];
  if (!session || !session.userId) return null;

  const users = readJson(USERS_FILE, []);
  const user = users.find(u => u.id === session.userId);
  return user || null;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessions = readJson(SESSIONS_FILE, {});
  sessions[token] = {
    userId,
    createdAt: Date.now()
  };
  writeJson(SESSIONS_FILE, sessions);
  return token;
}

function removeSession(req) {
  const authHeader = req.headers['authorization'] || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const token = match[1].trim();
  const sessions = readJson(SESSIONS_FILE, {});
  if (sessions[token]) {
    delete sessions[token];
    writeJson(SESSIONS_FILE, sessions);
    return true;
  }
  return false;
}

// 用户项目目录管理
function getUserProjectsDir(userId) {
  const dir = path.join(PROJECTS_DIR, userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getUserProjectIndex(userId) {
  const dir = getUserProjectsDir(userId);
  const indexFile = path.join(dir, 'index.json');
  const list = readJson(indexFile, []);
  let hasDirty = false;
  for (const item of list) {
    if (item.title && /<[^>]+>/.test(item.title)) {
      item.title = stripHtml(item.title);
      hasDirty = true;
    }
  }
  if (hasDirty) {
    writeJson(indexFile, list);
  }
  return list;
}

function saveUserProjectIndex(userId, list) {
  const dir = getUserProjectsDir(userId);
  const indexFile = path.join(dir, 'index.json');
  if (Array.isArray(list)) {
    list.forEach(item => {
      if (item.title) {
        item.title = stripHtml(item.title);
      }
    });
  }
  return writeJson(indexFile, list);
}

// 统一响应辅助函数
function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(body));
}

// 读取请求 Body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 50 * 1024 * 1024) {
        // 50MB 保护
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', err => reject(err));
  });
}

// 主请求处理器
async function handleApiRequest(req, res, decodedUrl) {
  if (!decodedUrl.startsWith('/api/')) {
    return false;
  }

  // 跨域预检
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end();
    return true;
  }

  // 1. 用户注册: POST /api/auth/register
  if (decodedUrl === '/api/auth/register' && req.method === 'POST') {
    const body = await parseBody(req);
    const username = (body.username || '').trim();
    const password = (body.password || '').trim();
    const nickname = (body.nickname || '').trim() || username;

    if (!username || username.length < 2 || username.length > 32) {
      sendJson(res, 400, { code: 400, msg: '账号长度需在 2 到 32 个字符之间' });
      return true;
    }
    if (!password || password.length < 4) {
      sendJson(res, 400, { code: 400, msg: '密码长度不能少于 4 位' });
      return true;
    }

    const users = readJson(USERS_FILE, []);
    const exists = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      sendJson(res, 400, { code: 400, msg: '该账号已被注册，请直接登录或更换账号' });
      return true;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const userId = generateId('u_');
    const newUser = {
      id: userId,
      username,
      nickname,
      salt,
      passwordHash,
      createdAt: Date.now()
    };

    users.push(newUser);
    writeJson(USERS_FILE, users);

    // 为新用户初始化默认项目
    const userDir = getUserProjectsDir(userId);
    const initialProjId = generateId('proj_');
    const initialTitle = '新项目';
    const initialData = JSON.parse(JSON.stringify(defaultMindMapData));
    initialData.root.data.text = initialTitle;
    const initialProjFile = path.join(userDir, `${initialProjId}.json`);
    writeJson(initialProjFile, initialData);

    const initialIndex = [
      {
        id: initialProjId,
        title: initialTitle,
        desc: '新建的空白思维导图',
        nodeCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
    saveUserProjectIndex(userId, initialIndex);

    const token = createSession(userId);
    sendJson(res, 200, {
      code: 0,
      msg: '注册成功',
      data: {
        token,
        user: sanitizeUser(newUser),
        currentProject: initialIndex[0]
      }
    });
    return true;
  }

  // 2. 用户登录: POST /api/auth/login
  if (decodedUrl === '/api/auth/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const username = (body.username || '').trim();
    const password = (body.password || '').trim();

    if (!username || !password) {
      sendJson(res, 400, { code: 400, msg: '请输入账号和密码' });
      return true;
    }

    const users = readJson(USERS_FILE, []);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      sendJson(res, 400, { code: 400, msg: '账号不存在，请先注册' });
      return true;
    }

    const testHash = hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      sendJson(res, 400, { code: 400, msg: '密码错误，请重新输入' });
      return true;
    }

    const token = createSession(user.id);
    const projects = getUserProjectIndex(user.id);
    const latestProject = projects.length > 0 ? projects[0] : null;

    sendJson(res, 200, {
      code: 0,
      msg: '登录成功',
      data: {
        token,
        user: sanitizeUser(user),
        currentProject: latestProject
      }
    });
    return true;
  }

  // 3. 用户登出: POST /api/auth/logout
  if (decodedUrl === '/api/auth/logout' && req.method === 'POST') {
    removeSession(req);
    sendJson(res, 200, { code: 0, msg: '已成功退出登录' });
    return true;
  }

  // 4. 当前用户信息: GET /api/auth/me
  if (decodedUrl === '/api/auth/me' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) {
      sendJson(res, 401, { code: 401, msg: '未登录或登录会话已过期' });
      return true;
    }
    sendJson(res, 200, { code: 0, data: { user: sanitizeUser(user) } });
    return true;
  }

  // 以下接口均需用户登录态认证
  const currentUser = getSessionUser(req);
  if (!currentUser) {
    sendJson(res, 401, { code: 401, msg: '请先登录账号' });
    return true;
  }
  const userId = currentUser.id;
  const userDir = getUserProjectsDir(userId);

  // 5. 获取项目列表: GET /api/projects
  if (decodedUrl === '/api/projects' && req.method === 'GET') {
    const list = getUserProjectIndex(userId);
    // 按最后修改时间倒序排列
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    sendJson(res, 200, { code: 0, data: list });
    return true;
  }

  // 6. 创建新项目: POST /api/projects
  if (decodedUrl === '/api/projects' && req.method === 'POST') {
    const body = await parseBody(req);
    const rawTitle = (body.title || '').trim() || (body.data?.root?.data?.text) || '未命名思维导图';
    const title = stripHtml(rawTitle) || '未命名思维导图';
    let data = body.data;
    if (!data) {
      data = JSON.parse(JSON.stringify(defaultMindMapData));
      if (data.root && data.root.data) {
        data.root.data.text = title;
      }
    }
    const desc = stripHtml(body.desc || '');

    const projId = generateId('proj_');
    const projFile = path.join(userDir, `${projId}.json`);
    writeJson(projFile, data);

    const projectMeta = {
      id: projId,
      title,
      desc,
      nodeCount: countNodes(data.root),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const list = getUserProjectIndex(userId);
    list.unshift(projectMeta);
    saveUserProjectIndex(userId, list);

    sendJson(res, 200, { code: 0, msg: '创建项目成功', data: projectMeta });
    return true;
  }

  // 7. 复制副本: POST /api/projects/:id/duplicate
  const duplicateMatch = decodedUrl.match(/^\/api\/projects\/([^\/]+)\/duplicate$/);
  if (duplicateMatch && req.method === 'POST') {
    const sourceId = duplicateMatch[1];
    const sourceFile = path.join(userDir, `${sourceId}.json`);
    if (!fs.existsSync(sourceFile)) {
      sendJson(res, 404, { code: 404, msg: '源项目不存在' });
      return true;
    }

    const sourceData = readJson(sourceFile, defaultMindMapData);
    const list = getUserProjectIndex(userId);
    const sourceMeta = list.find(p => p.id === sourceId);

    const newProjId = generateId('proj_');
    const newTitle = (sourceMeta ? sourceMeta.title : '导图') + ' (副本)';
    const newProjFile = path.join(userDir, `${newProjId}.json`);
    writeJson(newProjFile, sourceData);

    const newMeta = {
      id: newProjId,
      title: newTitle,
      desc: sourceMeta ? sourceMeta.desc : '',
      nodeCount: countNodes(sourceData.root),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    list.unshift(newMeta);
    saveUserProjectIndex(userId, list);

    sendJson(res, 200, { code: 0, msg: '副本创建成功', data: newMeta });
    return true;
  }

  // 8. 单个项目操作: /api/projects/:id
  const projectMatch = decodedUrl.match(/^\/api\/projects\/([^\/]+)$/);
  if (projectMatch) {
    const projId = projectMatch[1];
    const projFile = path.join(userDir, `${projId}.json`);

    // GET: 读取项目详情与完整脑图数据
    if (req.method === 'GET') {
      if (!fs.existsSync(projFile)) {
        sendJson(res, 404, { code: 404, msg: '项目不存在' });
        return true;
      }
      const data = readJson(projFile, null);
      const list = getUserProjectIndex(userId);
      const meta = list.find(p => p.id === projId) || { id: projId };

      sendJson(res, 200, {
        code: 0,
        data: {
          ...meta,
          data
        }
      });
      return true;
    }

    // PUT: 更新项目数据或标题
    if (req.method === 'PUT') {
      const body = await parseBody(req);
      const list = getUserProjectIndex(userId);
      let metaIndex = list.findIndex(p => p.id === projId);

      // 读取当前已有数据或准备更新
      let existingData = fs.existsSync(projFile) ? readJson(projFile, {}) : {};
      if (body.data) {
        existingData = {
          ...existingData,
          ...body.data
        };
        writeJson(projFile, existingData);
      }

      const now = Date.now();
      const nodeCount = existingData.root ? countNodes(existingData.root) : (list[metaIndex]?.nodeCount || 1);

      if (metaIndex >= 0) {
        if (body.title) {
          list[metaIndex].title = stripHtml(body.title) || '未命名思维导图';
        }
        if (body.desc !== undefined) {
          list[metaIndex].desc = stripHtml(body.desc);
        }
        list[metaIndex].nodeCount = nodeCount;
        list[metaIndex].updatedAt = now;
      } else {
        // 若元数据缺失则自动补全
        list.unshift({
          id: projId,
          title: stripHtml(body.title) || '思维导图',
          desc: stripHtml(body.desc || ''),
          nodeCount,
          createdAt: now,
          updatedAt: now
        });
      }

      saveUserProjectIndex(userId, list);

      sendJson(res, 200, {
        code: 0,
        msg: '保存成功',
        data: {
          id: projId,
          title: list[metaIndex]?.title,
          updatedAt: now,
          nodeCount
        }
      });
      return true;
    }

    // DELETE: 删除项目
    if (req.method === 'DELETE') {
      if (fs.existsSync(projFile)) {
        fs.unlinkSync(projFile);
      }
      let list = getUserProjectIndex(userId);
      list = list.filter(p => p.id !== projId);

      // 若所有项目被清空，则自动初始化一个空白项目保证用户空间可用
      if (list.length === 0) {
        const fallbackId = generateId('proj_');
        const fallbackTitle = '未命名思维导图';
        writeJson(path.join(userDir, `${fallbackId}.json`), defaultMindMapData);
        list.push({
          id: fallbackId,
          title: fallbackTitle,
          desc: '',
          nodeCount: countNodes(defaultMindMapData.root),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      saveUserProjectIndex(userId, list);
      sendJson(res, 200, { code: 0, msg: '项目已删除', data: { remaining: list } });
      return true;
    }
  }

  return false;
}

module.exports = {
  handleApiRequest
};
