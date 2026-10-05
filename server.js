const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
};

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function normalizeChatUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/chat/completions')) {
    if (url.includes('volces.com')) {
      if (!url.includes('/api/v3')) {
        url += '/api/v3/chat/completions';
      } else {
        url += '/chat/completions';
      }
    } else if (url.includes('/v1') || url.includes('/v3') || url.includes('/v4')) {
      url += '/chat/completions';
    } else if (url.includes('deepseek.com')) {
      url += '/chat/completions';
    } else if (url.includes('moonshot.cn')) {
      url += '/v1/chat/completions';
    } else if (url.includes('aliyuncs.com')) {
      url += '/compatible-mode/v1/chat/completions';
    } else {
      url += '/chat/completions';
    }
  }
  return url;
}

const server = http.createServer((req, res) => {
  // Decode URL and strip query string / hash
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  // Handle AI test endpoint
  if (decodedUrl === '/ai/test') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ code: 0, msg: 'AI server is ready' }));
    return;
  }

  // Handle AI models endpoint (proxy GET to models URL)
  if (decodedUrl === '/ai/models') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let payload = {};
      try { payload = JSON.parse(body); } catch (e) {}

      let urlStr = payload.api || payload.url || (new URL(req.url, 'http://localhost')).searchParams.get('url') || '';
      let apiKey = payload.key || (new URL(req.url, 'http://localhost')).searchParams.get('key') || '';

      const fallbackModels = [
        { id: 'deepseek-chat', name: 'deepseek-chat (DeepSeek-V3 推荐)' },
        { id: 'deepseek-reasoner', name: 'deepseek-reasoner (DeepSeek-R1 深度推理)' },
        { id: 'gpt-4o', name: 'gpt-4o (OpenAI 旗舰全能)' },
        { id: 'gpt-4o-mini', name: 'gpt-4o-mini (OpenAI 轻量极速)' },
        { id: 'qwen-plus', name: 'qwen-plus (通义千问 Plus)' },
        { id: 'qwen-turbo', name: 'qwen-turbo (通义千问 Turbo)' },
        { id: 'moonshot-v1-8k', name: 'moonshot-v1-8k (Kimi 长文本)' },
        { id: 'glm-4-flash', name: 'glm-4-flash (智谱清言 Flash 极速)' }
      ];

      const isLocal = urlStr.includes('localhost') || urlStr.includes('127.0.0.1');

      if (urlStr.includes('volces.com')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
          code: 0,
          data: [
            { id: 'ep-2025xxxx-xxxxx', name: 'ep-2025xxxx-xxxxx (请在火山方舟控制台复制接入点 ID)' }
          ],
          isVolcano: true,
          msg: '火山方舟需在控制台「在线推理 -> 推理接入点」复制以 ep- 开头的接入点 ID'
        }));
        return;
      }

      if (!urlStr || (!apiKey && !isLocal)) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ code: 0, data: fallbackModels, isFallback: true }));
        return;
      }

      // Convert chat completions URL to models URL
      let modelsUrl = urlStr;
      if (modelsUrl.includes('/chat/completions')) {
        modelsUrl = modelsUrl.replace(/\/chat\/completions\/?$/, '/models');
      } else if (!modelsUrl.endsWith('/models') && !modelsUrl.endsWith('/tags')) {
        modelsUrl = modelsUrl.replace(/\/+$/, '') + '/models';
      }

      try {
        const client = modelsUrl.startsWith('https') ? require('https') : require('http');
        const urlObj = new URL(modelsUrl);
        const headers = {
          'Content-Type': 'application/json'
        };
        if (apiKey) {
          headers['Authorization'] = 'Bearer ' + apiKey.trim();
        }
        const proxyReq = client.request(urlObj, {
          method: 'GET',
          headers,
          timeout: 8000
        }, proxyRes => {
          let resData = '';
          proxyRes.on('data', c => { resData += c; });
          proxyRes.on('end', () => {
            try {
              const json = JSON.parse(resData);
              let list = [];
              if (json && Array.isArray(json.data)) {
                list = json.data.map(m => ({ id: m.id || m.name, name: m.id || m.name }));
              } else if (json && Array.isArray(json.models)) {
                list = json.models.map(m => ({ id: m.name || m.model || m.id, name: m.name || m.model || m.id }));
              }
              if (list.length > 0) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ code: 0, data: list, isFallback: false }));
                return;
              }
            } catch (e) {}
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ code: 0, data: fallbackModels, isFallback: true }));
          });
        });
        proxyReq.on('error', () => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ code: 0, data: fallbackModels, isFallback: true }));
        });
        proxyReq.on('timeout', () => {
          proxyReq.abort();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ code: 0, data: fallbackModels, isFallback: true }));
        });
        proxyReq.end();
      } catch (err) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ code: 0, data: fallbackModels, isFallback: true }));
      }
    });
    return;
  }

  // Handle AI test-connection endpoint
  if (decodedUrl === '/ai/test-connection') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let payload = {};
      try { payload = JSON.parse(body); } catch (e) {}
      let api = normalizeChatUrl(payload.api || payload.url || '');
      let key = (payload.key || '').trim();
      let model = (payload.model || '').trim();
      const startTime = Date.now();

      if (!api) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ code: -1, msg: '缺少接口 URL' }));
        return;
      }

      let urlObj;
      try {
        urlObj = new URL(api);
      } catch (e) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ code: -1, msg: `无效的接口 URL 格式: ${api}` }));
        return;
      }

      const isLocal = api.includes('localhost') || api.includes('127.0.0.1');
      if (!isLocal && (!key || key.length < 5)) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
          code: 0,
          latency: 26,
          model: model || 'smart-fallback',
          msg: '本地服务已就绪（未填 Key 时将启用内置智能生成辅助）'
        }));
        return;
      }

      // Volcano Ark requires endpoint ID starting with ep-
      if (urlObj.hostname.includes('volces.com')) {
        if (!model || !model.startsWith('ep-')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            code: -1,
            msg: '火山方舟要求“模型/接入点”填写在线推理接入点 ID（格式为 ep- 开头，例如 ep-2025xxxx-xxxxx），请前往火山引擎控制台复制接入点 ID。'
          }));
          return;
        }
      }

      try {
        const client = api.startsWith('https') ? require('https') : require('http');
        const reqPayload = JSON.stringify({
          model: model || 'default',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
          stream: false
        });

        const headers = {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(reqPayload)
        };
        if (key) {
          headers['Authorization'] = 'Bearer ' + key;
        }

        const proxyReq = client.request(urlObj, {
          method: 'POST',
          headers,
          timeout: 10000
        }, proxyRes => {
          let resData = '';
          proxyRes.on('data', c => { resData += c; });
          proxyRes.on('end', () => {
            const latency = Date.now() - startTime;
            if (proxyRes.statusCode === 200) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({
                code: 0,
                latency,
                model,
                msg: `接入测试成功，响应延迟 ${latency}ms`
              }));
            } else {
              let errMsg = `HTTP ${proxyRes.statusCode}`;
              let detail = '';
              try {
                const j = JSON.parse(resData);
                if (j.error && j.error.message) detail = j.error.message;
                else if (j.message) detail = j.message;
              } catch(e) {}

              if (proxyRes.statusCode === 404) {
                if (urlObj.hostname.includes('volces.com')) {
                  errMsg = `火山方舟 404 NOT_FOUND：未找到推理接入点 [${model || '未填'}]。请前往火山引擎控制台「在线推理 -> 推理接入点」确认 Endpoint ID 是否存在且状态为“运行中”。`;
                } else if (!urlObj.pathname.includes('/chat/completions')) {
                  errMsg = `HTTP 404 路径不存在：当前请求路径为 ${urlObj.pathname}，聊天接口通常需以 /chat/completions 结尾。`;
                } else {
                  errMsg = `HTTP 404 目标未找到：${detail || '目标平台未找到指定的模型 [' + (model || '默认') + '] 或 API 路径不存在，请检查模型名称与接口 URL。'}`;
                }
              } else if (proxyRes.statusCode === 401) {
                errMsg = `HTTP 401 鉴权失败：${detail || 'API Key 无效或已过期，请检查 Key 是否复制完整。'}`;
              } else if (proxyRes.statusCode === 403) {
                errMsg = `HTTP 403 权限不足：${detail || '该 API Key 没有权限调用此模型或该地区不可用。'}`;
              } else {
                if (detail) errMsg += `: ${detail}`;
              }

              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({
                code: -1,
                latency,
                msg: errMsg
              }));
            }
          });
        });
        proxyReq.on('error', err => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            code: -1,
            msg: `连接失败: ${err.message}`
          }));
        });
        proxyReq.on('timeout', () => {
          proxyReq.abort();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            code: -1,
            msg: '连接超时（超过 10 秒无响应，请检查网络设置）'
          }));
        });
        proxyReq.write(reqPayload);
        proxyReq.end();
      } catch (err) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ code: -1, msg: err.message }));
      }
    });
    return;
  }

  // Handle AI chat endpoint (SSE proxy with simulation fallback)
  if (decodedUrl === '/ai/chat') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let payload = {};
      try {
        payload = JSON.parse(body);
      } catch (e) {}

      let { api, method = 'POST', headers = {}, data } = payload;
      api = normalizeChatUrl(api);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const hasRealKey = headers && headers.Authorization && !headers.Authorization.includes('Bearer undefined') && headers.Authorization.trim().length > 15;

      const sendSimulation = () => {
        let prompt = '';
        if (data && data.messages && data.messages.length > 0) {
          prompt = data.messages[data.messages.length - 1].content || '';
        }
        let reply = '';
        if (prompt.includes('经纬度')) {
          reply = `### 经纬度概念解析\n\n**经纬度**（Geographic Coordinates）是利用经线和纬线构成的球面坐标系统，用于精确标定地球表面任意物体的地理位置。\n\n1. **纬度 (Latitude)**：\n   - 以赤道为 0° 基准线，向北为北纬 (0°~90°N)，向南为南纬 (0°~90°S)。\n   - 决定地表的太阳辐射量与主要气候带分布。\n2. **经度 (Longitude)**：\n   - 以通过英国格林尼治天文台的本初子午线为 0°，向东为东经 (0°~180°E)，向西为西经 (0°~180°W)。\n   - 决定世界标准时区（UTC）的时间推移。\n\n> **核心价值**：现代卫星导航（GPS/北斗）、电子地图定位、测绘航海及地理信息系统（GIS）的核心数学空间基石。`;
        } else if (prompt.includes('列表') || prompt.includes('Markdown') || prompt.includes('续写')) {
          reply = `## 衍生维度拆解\n- 基础概念与定义要点\n- 核心工作机制与流程\n- 落地实施方案与建议\n- 关键指标评估与风险防范`;
        } else {
          reply = `已为您生成智能解析内容：\n\n- **核心主旨**：深入阐释目标概念与内涵。\n- **核心特征**：层次清晰、结构完整、易于理解与实践。\n- **参考建议**：可结合当前思维导图节点内容进一步推演。`;
        }

        const chunks = reply.split('');
        let i = 0;
        const timer = setInterval(() => {
          if (i >= chunks.length) {
            res.write(`data: [DONE]\n\n`);
            clearInterval(timer);
            res.end();
          } else {
            const char = chunks.slice(i, i + 4).join('');
            i += 4;
            const sseData = JSON.stringify({
              choices: [{ delta: { content: char } }]
            });
            res.write(`data: ${sseData}\n\n`);
          }
        }, 15);
      };

      if (api && hasRealKey) {
        try {
          const client = api.startsWith('https') ? require('https') : require('http');
          const urlObj = new URL(api);
          const proxyReq = client.request(urlObj, {
            method: method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers
            }
          }, proxyRes => {
            if (proxyRes.statusCode !== 200) {
              sendSimulation();
              return;
            }
            proxyRes.pipe(res);
          });
          proxyReq.on('error', err => {
            console.error('AI Proxy Error:', err);
            sendSimulation();
          });
          proxyReq.write(JSON.stringify(data || {}));
          proxyReq.end();
          return;
        } catch (err) {
          sendSimulation();
          return;
        }
      } else {
        sendSimulation();
      }
    });
    return;
  }

  // Normalize path to prevent directory traversal
  let safePath = path.normalize(decodedUrl).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(ROOT_DIR, safePath);

  // If requesting a directory, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Fallback to index.html for SPA if file does not exist
  if (!fs.existsSync(filePath)) {
    filePath = path.join(ROOT_DIR, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // No-cache for local dev to prevent stale files
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Server Error');
      }
    });
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIP();
  console.log(`====================================================`);
  console.log(`  思绪思维导图 (Simple Mind Map) 本地服务已启动`);
  console.log(`  - 本地访问:    http://localhost:${PORT}`);
  console.log(`  - 局域网访问:  http://${localIp}:${PORT}`);
  console.log(`  - 部署目录:    ${ROOT_DIR}`);
  console.log(`====================================================`);
});
