/**
 * Cloudflare Pages Function: /api/* 全栈后端接口处理
 * 基于 Cloudflare D1 (Serverless SQLite) 提供完整的用户认证与思维导图持久化
 */

// 默认纯净单中心主题导图数据
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

// 辅助：清洗 HTML 标签，返回纯文本
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

// 辅助：计算节点数量
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

// 辅助：生成随机 ID
function generateId(prefix = '') {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return prefix + Date.now().toString(36) + '_' + hex;
}

// 辅助：生成 64 字符随机 Token
function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 辅助：生成 32 字符随机 Salt
function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 辅助：Web Crypto PBKDF2 密码哈希（与 Node.js pbkdf2Sync 100% 兼容）
async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const saltBytes = enc.encode(saltHex);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 1000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 辅助：脱敏用户信息
function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username,
    createdAt: user.created_at || user.createdAt
  };
}

// 辅助：统一 JSON 响应封装
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

let isDbInitialized = false;
async function ensureTables(db) {
  if (isDbInitialized || !db) return;
  try {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        nickname TEXT NOT NULL,
        salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        desc TEXT DEFAULT '',
        node_count INTEGER DEFAULT 1,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`)
    ]);
    isDbInitialized = true;
  } catch (err) {
    console.error('Error ensuring D1 tables via batch:', err);
    // 降级尝试逐条执行
    try {
      await db.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, nickname TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, desc TEXT DEFAULT '', node_count INTEGER DEFAULT 1, data TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`).run();
      isDbInitialized = true;
    } catch (fallbackErr) {
      console.error('Error ensuring D1 tables via fallback:', fallbackErr);
    }
  }
}

// 辅助：获取当前会话用户
async function getSessionUser(request, db) {
  const authHeader = request.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();

  const session = await db.prepare('SELECT user_id FROM sessions WHERE token = ?').bind(token).first();
  if (!session || !session.user_id) return null;

  const user = await db.prepare('SELECT id, username, nickname, created_at FROM users WHERE id = ?').bind(session.user_id).first();
  return user || null;
}

// Cloudflare Pages Function 主处理入口
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 1. 处理 OPTIONS 跨域预检
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // 2. 检查 Cloudflare D1 数据库绑定
  const db = env.DB;
  if (!db) {
    // 若未绑定 D1 数据库，给出友好的引导提示
    return jsonResponse({
      code: 500,
      msg: 'Cloudflare D1 数据库尚未绑定！请在 Cloudflare Pages 设置中的【D1 Database Bindings】绑定变量名为 DB 的数据库。'
    }, 500);
  }

  // 确保数据表已就绪
  await ensureTables(db);

  // 3. 健康检查接口: GET /api/health
  if (path === '/api/health') {
    return jsonResponse({
      code: 0,
      status: 'ok',
      database: 'Cloudflare D1 Connected',
      time: new Date().toISOString()
    });
  }

  // 4. 用户注册: POST /api/auth/register
  if (path === '/api/auth/register' && method === 'POST') {
    try {
      const body = await request.json();
      const username = (body.username || '').trim();
      const password = (body.password || '').trim();
      const nickname = (body.nickname || '').trim() || username;

      if (!username || username.length < 2 || username.length > 32) {
        return jsonResponse({ code: 400, msg: '账号长度需在 2 到 32 个字符之间' }, 400);
      }
      if (!password || password.length < 4) {
        return jsonResponse({ code: 400, msg: '密码长度不能少于 4 位' }, 400);
      }

      // 检查账号是否已被注册
      const existing = await db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').bind(username).first();
      if (existing) {
        return jsonResponse({ code: 400, msg: '该账号已被注册，请直接登录或更换账号' }, 400);
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const userId = generateId('u_');
      const now = Date.now();

      // 插入用户记录
      await db.prepare(`
        INSERT INTO users (id, username, nickname, salt, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(userId, username, nickname, salt, passwordHash, now).run();

      // 初始化默认新项目
      const initialProjId = generateId('proj_');
      const initialTitle = '新项目';
      const initialData = JSON.parse(JSON.stringify(defaultMindMapData));
      initialData.root.data.text = initialTitle;

      await db.prepare(`
        INSERT INTO projects (id, user_id, title, desc, node_count, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        initialProjId,
        userId,
        initialTitle,
        '新建的空白思维导图',
        1,
        JSON.stringify(initialData),
        now,
        now
      ).run();

      // 生成登录 Token 会话
      const token = generateToken();
      await db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').bind(token, userId, now).run();

      return jsonResponse({
        code: 0,
        msg: '注册成功',
        data: {
          token,
          user: {
            id: userId,
            username,
            nickname,
            createdAt: now
          },
          currentProject: {
            id: initialProjId,
            title: initialTitle,
            desc: '新建的空白思维导图',
            nodeCount: 1,
            createdAt: now,
            updatedAt: now
          }
        }
      });
    } catch (e) {
      console.error('Register error:', e);
      return jsonResponse({ code: 500, msg: '注册处理异常: ' + e.message }, 500);
    }
  }

  // 5. 用户登录: POST /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    try {
      const body = await request.json();
      const username = (body.username || '').trim();
      const password = (body.password || '').trim();

      if (!username || !password) {
        return jsonResponse({ code: 400, msg: '请输入账号和密码' }, 400);
      }

      const user = await db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').bind(username).first();
      if (!user) {
        return jsonResponse({ code: 400, msg: '账号不存在，请先注册' }, 400);
      }

      const testHash = await hashPassword(password, user.salt);
      if (testHash !== user.password_hash) {
        return jsonResponse({ code: 400, msg: '密码错误，请重新输入' }, 400);
      }

      const token = generateToken();
      const now = Date.now();
      await db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').bind(token, user.id, now).run();

      // 获取最近的项目
      const latestProject = await db.prepare(`
        SELECT id, title, desc, node_count as nodeCount, created_at as createdAt, updated_at as updatedAt
        FROM projects
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `).bind(user.id).first();

      return jsonResponse({
        code: 0,
        msg: '登录成功',
        data: {
          token,
          user: sanitizeUser(user),
          currentProject: latestProject || null
        }
      });
    } catch (e) {
      console.error('Login error:', e);
      return jsonResponse({ code: 500, msg: '登录处理异常: ' + e.message }, 500);
    }
  }

  // 6. 用户登出: POST /api/auth/logout
  if (path === '/api/auth/logout' && method === 'POST') {
    const authHeader = request.headers.get('Authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      await db.prepare('DELETE FROM sessions WHERE token = ?').bind(match[1].trim()).run();
    }
    return jsonResponse({ code: 0, msg: '已成功退出登录' });
  }

  // 7. 当前用户信息: GET /api/auth/me
  if (path === '/api/auth/me' && method === 'GET') {
    const user = await getSessionUser(request, db);
    if (!user) {
      return jsonResponse({ code: 401, msg: '未登录或登录会话已过期' }, 401);
    }
    return jsonResponse({ code: 0, data: { user: sanitizeUser(user) } });
  }

  // 8. AI 聊天代理接口: POST /api/ai/chat
  if (path === '/api/ai/chat' && method === 'POST') {
    try {
      const body = await request.json();
      const provider = body.provider || 'deepseek';
      const apiKey = body.apiKey || env.AI_API_KEY || '';
      let apiUrl = body.api || '';

      if (!apiUrl) {
        if (provider === 'deepseek') apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        else if (provider === 'openai') apiUrl = 'https://api.openai.com/v1/chat/completions';
      }

      if (apiKey && apiUrl) {
        // 直连供应商
        const aiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: body.model || 'deepseek-chat',
            messages: body.messages || [],
            temperature: body.temperature || 0.7,
            stream: false
          })
        });
        const aiJson = await aiRes.json();
        return jsonResponse(aiJson, aiRes.status);
      }

      // 未配置 API Key 时返回模拟演示内容
      return jsonResponse({
        choices: [
          {
            message: {
              role: 'assistant',
              content: '已成功接入 Cloudflare 边缘环境！在思维导图侧边栏配置您的 API Key 即可使用 AI 智能功能。'
            }
          }
        ]
      });
    } catch (e) {
      return jsonResponse({ code: 500, msg: 'AI 代理请求异常: ' + e.message }, 500);
    }
  }

  // --- 以下接口均需要登录态 ---
  const currentUser = await getSessionUser(request, db);
  if (!currentUser) {
    return jsonResponse({ code: 401, msg: '请先登录账号' }, 401);
  }
  const userId = currentUser.id;

  // 9. 获取项目列表: GET /api/projects
  if (path === '/api/projects' && method === 'GET') {
    const { results } = await db.prepare(`
      SELECT id, title, desc, node_count as nodeCount, created_at as createdAt, updated_at as updatedAt
      FROM projects
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).bind(userId).all();

    return jsonResponse({ code: 0, data: results || [] });
  }

  // 10. 创建新项目: POST /api/projects
  if (path === '/api/projects' && method === 'POST') {
    try {
      const body = await request.json();
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
      const now = Date.now();
      const nodeCount = countNodes(data.root);

      await db.prepare(`
        INSERT INTO projects (id, user_id, title, desc, node_count, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        projId,
        userId,
        title,
        desc,
        nodeCount,
        JSON.stringify(data),
        now,
        now
      ).run();

      const projectMeta = {
        id: projId,
        title,
        desc,
        nodeCount,
        createdAt: now,
        updatedAt: now
      };

      return jsonResponse({ code: 0, msg: '创建项目成功', data: projectMeta });
    } catch (e) {
      console.error('Create project error:', e);
      return jsonResponse({ code: 500, msg: '创建项目异常: ' + e.message }, 500);
    }
  }

  // 11. 复制副本: POST /api/projects/:id/duplicate
  const duplicateMatch = path.match(/^\/api\/projects\/([^\/]+)\/duplicate$/);
  if (duplicateMatch && method === 'POST') {
    const sourceId = duplicateMatch[1];
    const source = await db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').bind(sourceId, userId).first();
    if (!source) {
      return jsonResponse({ code: 404, msg: '源项目不存在' }, 404);
    }

    const newProjId = generateId('proj_');
    const newTitle = stripHtml(source.title) + ' (副本)';
    const now = Date.now();

    await db.prepare(`
      INSERT INTO projects (id, user_id, title, desc, node_count, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      newProjId,
      userId,
      newTitle,
      source.desc,
      source.node_count,
      source.data,
      now,
      now
    ).run();

    const newMeta = {
      id: newProjId,
      title: newTitle,
      desc: source.desc,
      nodeCount: source.node_count,
      createdAt: now,
      updatedAt: now
    };

    return jsonResponse({ code: 0, msg: '副本创建成功', data: newMeta });
  }

  // 12. 单个项目操作: /api/projects/:id
  const projectMatch = path.match(/^\/api\/projects\/([^\/]+)$/);
  if (projectMatch) {
    const projId = projectMatch[1];

    // GET: 读取详情与导图完整数据
    if (method === 'GET') {
      const project = await db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').bind(projId, userId).first();
      if (!project) {
        return jsonResponse({ code: 404, msg: '项目不存在' }, 404);
      }

      let parsedData = null;
      try {
        parsedData = JSON.parse(project.data);
      } catch (e) {
        parsedData = defaultMindMapData;
      }

      return jsonResponse({
        code: 0,
        data: {
          id: project.id,
          title: stripHtml(project.title),
          desc: project.desc,
          nodeCount: project.node_count,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          data: parsedData
        }
      });
    }

    // PUT: 更新保存项目
    if (method === 'PUT') {
      try {
        const body = await request.json();
        const existing = await db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').bind(projId, userId).first();

        const now = Date.now();
        let title = existing ? existing.title : '未命名思维导图';
        if (body.title) {
          title = stripHtml(body.title) || title;
        }

        let desc = existing ? existing.desc : '';
        if (body.desc !== undefined) {
          desc = stripHtml(body.desc);
        }

        let dataStr = existing ? existing.data : JSON.stringify(defaultMindMapData);
        let nodeCount = existing ? existing.node_count : 1;

        if (body.data) {
          dataStr = JSON.stringify(body.data);
          if (body.data.root) {
            nodeCount = countNodes(body.data.root);
          }
        }

        if (existing) {
          await db.prepare(`
            UPDATE projects
            SET title = ?, desc = ?, node_count = ?, data = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
          `).bind(title, desc, nodeCount, dataStr, now, projId, userId).run();
        } else {
          await db.prepare(`
            INSERT INTO projects (id, user_id, title, desc, node_count, data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(projId, userId, title, desc, nodeCount, dataStr, now, now).run();
        }

        return jsonResponse({
          code: 0,
          msg: '保存成功',
          data: {
            id: projId,
            title,
            updatedAt: now,
            nodeCount
          }
        });
      } catch (e) {
        console.error('Update project error:', e);
        return jsonResponse({ code: 500, msg: '保存项目异常: ' + e.message }, 500);
      }
    }

    // DELETE: 删除项目
    if (method === 'DELETE') {
      await db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').bind(projId, userId).run();

      // 查询剩余项目
      const { results } = await db.prepare(`
        SELECT id, title, desc, node_count as nodeCount, created_at as createdAt, updated_at as updatedAt
        FROM projects
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `).bind(userId).all();

      let remaining = results || [];

      // 若所有项目被清空，则自动初始化一个空白项目
      if (remaining.length === 0) {
        const fallbackId = generateId('proj_');
        const fallbackTitle = '未命名思维导图';
        const now = Date.now();
        await db.prepare(`
          INSERT INTO projects (id, user_id, title, desc, node_count, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          fallbackId,
          userId,
          fallbackTitle,
          '',
          1,
          JSON.stringify(defaultMindMapData),
          now,
          now
        ).run();

        remaining = [
          {
            id: fallbackId,
            title: fallbackTitle,
            desc: '',
            nodeCount: 1,
            createdAt: now,
            updatedAt: now
          }
        ];
      }

      return jsonResponse({ code: 0, msg: '项目已删除', data: { remaining } });
    }
  }

  return jsonResponse({ code: 404, msg: 'Not Found' }, 404);
}
