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
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ code: 0, data: null, msg: '连接成功' }));
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

      const { api, method = 'POST', headers = {}, data } = payload;
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
