/**
 * Cloudflare Pages Function: /ai/* 全栈大模型网关代理
 * 处理大模型连通性测试 (/ai/test-connection)、模型清单拉取 (/ai/models) 与流式补全 (/ai/chat)
 */

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

// 规范化 Chat Completions URL
function normalizeChatUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  url = url.replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) {
    return url;
  }
  if (url.endsWith('/models')) {
    return url.replace(/\/models$/, '/chat/completions');
  }
  if (url.includes('volces.com')) {
    if (!url.includes('/api/v3')) {
      return url + '/api/v3/chat/completions';
    }
    return url + '/chat/completions';
  }
  if (url.includes('sensenova.cn')) {
    if (url.endsWith('/v1')) {
      return url + '/chat/completions';
    }
    if (!url.includes('/v1')) {
      return url + '/v1/chat/completions';
    }
    return url + '/chat/completions';
  }
  if (url.endsWith('/v1') || url.endsWith('/v2') || url.endsWith('/v3') || url.endsWith('/v4')) {
    return url + '/chat/completions';
  }
  if (url.includes('deepseek.com')) {
    return url + '/chat/completions';
  }
  if (url.includes('moonshot.cn')) {
    return url + '/v1/chat/completions';
  }
  if (url.includes('aliyuncs.com')) {
    return url + '/compatible-mode/v1/chat/completions';
  }
  return url + '/chat/completions';
}

// 规范化 Models URL
function normalizeModelsUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  url = url.replace(/\/+$/, '');
  if (url.endsWith('/models') || url.endsWith('/tags')) {
    return url;
  }
  if (url.endsWith('/chat/completions')) {
    return url.replace(/\/chat\/completions$/, '/models');
  }
  if (url.includes('sensenova.cn')) {
    if (url.endsWith('/v1')) {
      return url + '/models';
    }
    if (!url.includes('/v1')) {
      return url + '/v1/models';
    }
    return url + '/models';
  }
  if (url.endsWith('/v1') || url.endsWith('/v2') || url.endsWith('/v3') || url.endsWith('/v4')) {
    return url + '/models';
  }
  return url + '/models';
}

// 默认常用模型回退列表
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

// 商汤日日新 (SenseNova) 预设模型列表
const sensenovaModels = [
  { id: 'SenseChat-5', name: 'SenseChat-5 (日日新 5.0 旗舰大模型 - 推荐)' },
  { id: 'SenseChat-5-Vision', name: 'SenseChat-5-Vision (日日新 5.0 视觉多模态)' },
  { id: 'SenseChat-Turbo', name: 'SenseChat-Turbo (日日新 Turbo 极速响应)' },
  { id: 'SenseChat', name: 'SenseChat (日日新 4.0 标准版)' },
  { id: 'SenseChat-Character', name: 'SenseChat-Character (角色拟真)' }
];

// Cloudflare Pages Function 主入口
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 1. 处理 OPTIONS 跨域预检
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // 2. GET /ai/test 探活
  if (path === '/ai/test' || path === '/ai/test/') {
    return jsonResponse({ code: 0, msg: 'Cloudflare AI Gateway is ready' });
  }

  // 3. POST /ai/models 自动拉取模型列表
  if (path === '/ai/models' || path === '/ai/models/') {
    try {
      let payload = {};
      try { payload = await request.json(); } catch (e) {}

      const rawUrl = payload.api || payload.url || url.searchParams.get('url') || '';
      const apiKey = (payload.key || url.searchParams.get('key') || '').trim();
      const isLocal = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');

      if (rawUrl.includes('volces.com')) {
        return jsonResponse({
          code: 0,
          data: [
            { id: 'ep-2025xxxx-xxxxx', name: 'ep-2025xxxx-xxxxx (请在火山方舟控制台复制接入点 ID)' }
          ],
          isVolcano: true,
          msg: '火山方舟需在控制台「在线推理 -> 推理接入点」复制以 ep- 开头的接入点 ID'
        });
      }

      const isSenseNova = rawUrl.includes('sensenova.cn');
      const activeFallback = isSenseNova ? sensenovaModels : fallbackModels;

      if (!rawUrl || (!apiKey && !isLocal)) {
        return jsonResponse({ code: 0, data: activeFallback, isFallback: true });
      }

      const modelsUrl = normalizeModelsUrl(rawUrl);
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = 'Bearer ' + apiKey;
      }

      try {
        const upstreamRes = await fetch(modelsUrl, {
          method: 'GET',
          headers
        });

        if (upstreamRes.ok) {
          const json = await upstreamRes.json();
          let list = [];
          if (json && Array.isArray(json.data)) {
            list = json.data.map(m => ({ id: m.id || m.name, name: m.id || m.name }));
          } else if (json && Array.isArray(json.models)) {
            list = json.models.map(m => ({ id: m.name || m.model || m.id, name: m.name || m.model || m.id }));
          }

          if (list.length > 0) {
            return jsonResponse({ code: 0, data: list, isFallback: false });
          }
        }
      } catch (err) {
        console.error('Error fetching models from upstream:', err);
      }

      return jsonResponse({ code: 0, data: activeFallback, isFallback: true });
    } catch (err) {
      return jsonResponse({ code: 0, data: fallbackModels, isFallback: true });
    }
  }

  // 4. POST /ai/test-connection 测试连通性
  if (path === '/ai/test-connection' || path === '/ai/test-connection/') {
    try {
      let payload = {};
      try { payload = await request.json(); } catch (e) {}

      const rawApi = payload.api || payload.url || '';
      const key = (payload.key || '').trim();
      let model = (payload.model || '').trim();
      const startTime = Date.now();

      if (!rawApi) {
        return jsonResponse({ code: -1, msg: '缺少接口 URL' });
      }

      const isSenseNova = rawApi.includes('sensenova.cn');
      if (!model) {
        if (isSenseNova) model = 'SenseChat-5';
        else model = 'default';
      }

      const chatUrl = normalizeChatUrl(rawApi);
      const isLocal = rawApi.includes('localhost') || rawApi.includes('127.0.0.1');

      if (!isLocal && (!key || key.length < 5)) {
        return jsonResponse({
          code: 0,
          latency: 20,
          model: model || 'smart-fallback',
          msg: '本地服务已就绪（未填 Key 时将启用内置智能生成辅助）'
        });
      }

      // 火山方舟专属校验
      if (rawApi.includes('volces.com')) {
        if (!model || !model.startsWith('ep-')) {
          return jsonResponse({
            code: -1,
            msg: '火山方舟要求“模型/接入点”填写在线推理接入点 ID（格式为 ep- 开头，例如 ep-2025xxxx-xxxxx），请前往火山引擎控制台复制接入点 ID。'
          });
        }
      }

      const reqPayload = JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
        stream: false
      });

      const headers = {
        'Content-Type': 'application/json'
      };
      if (key) {
        headers['Authorization'] = 'Bearer ' + key;
      }

      try {
        const upstreamRes = await fetch(chatUrl, {
          method: 'POST',
          headers,
          body: reqPayload
        });

        const latency = Date.now() - startTime;

        if (upstreamRes.ok) {
          return jsonResponse({
            code: 0,
            latency,
            model,
            msg: `接入测试成功，响应延迟 ${latency}ms`
          });
        } else {
          let errMsg = `HTTP ${upstreamRes.status}`;
          let detail = '';
          try {
            const j = await upstreamRes.json();
            if (j.error && j.error.message) detail = j.error.message;
            else if (j.message) detail = j.message;
            else if (j.msg) detail = j.msg;
          } catch (e) {
            try {
              detail = await upstreamRes.text();
            } catch (e2) {}
          }

          if (upstreamRes.status === 404) {
            if (rawApi.includes('volces.com')) {
              errMsg = `火山方舟 404 NOT_FOUND：未找到推理接入点 [${model}]。请前往火山引擎控制台确认 Endpoint ID 是否存在。`;
            } else if (isSenseNova) {
              errMsg = `商汤日日新 404 目标未找到：未找到模型 [${model}] 或路径错误。推荐使用 SenseChat-5 或 SenseChat-Turbo。${detail ? ' (' + detail + ')' : ''}`;
            } else {
              errMsg = `HTTP 404 目标未找到：${detail || '目标平台未找到指定的模型 [' + model + '] 或 API 路径不存在，请检查模型名称与接口 URL。'}`;
            }
          } else if (upstreamRes.status === 401) {
            errMsg = `HTTP 401 鉴权失败：${detail || 'API Key 无效或已过期，请检查 Key 是否复制完整。'}`;
          } else if (upstreamRes.status === 403) {
            errMsg = `HTTP 403 权限不足：${detail || '该 API Key 没有权限调用此模型或该地区不可用。'}`;
          } else if (upstreamRes.status === 400) {
            errMsg = `HTTP 400 请求参数错误：${detail || '请检查模型名称或账户余额。'}`;
          } else if (upstreamRes.status === 429) {
            errMsg = `HTTP 429 调用频次超限或额度不足：${detail || 'API Key 余额不足或请求过于频繁。'}`;
          } else {
            if (detail) errMsg += `: ${detail}`;
          }

          return jsonResponse({
            code: -1,
            latency,
            msg: errMsg
          });
        }
      } catch (fetchErr) {
        return jsonResponse({
          code: -1,
          msg: `连接上游服务失败: ${fetchErr.message}`
        });
      }
    } catch (err) {
      return jsonResponse({ code: -1, msg: err.message });
    }
  }

  // 5. POST /ai/chat 聊天补全代理（流式 SSE）
  if (path === '/ai/chat' || path === '/ai/chat/') {
    try {
      let payload = {};
      try { payload = await request.json(); } catch (e) {}

      let { api, method: upstreamMethod = 'POST', headers = {}, data } = payload;
      const chatUrl = normalizeChatUrl(api);
      const hasRealKey = headers && headers.Authorization && !headers.Authorization.includes('Bearer undefined') && headers.Authorization.trim().length > 15;

      // 降级智能模拟流输出函数
      const createSimulationStream = () => {
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

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            for (let i = 0; i < reply.length; i += 4) {
              const char = reply.slice(i, i + 4);
              const sseData = JSON.stringify({
                choices: [{ delta: { content: char } }]
              });
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
              await new Promise(r => setTimeout(r, 15));
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          }
        });
      };

      if (chatUrl && hasRealKey) {
        try {
          const upstreamRes = await fetch(chatUrl, {
            method: upstreamMethod,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: JSON.stringify(data || {})
          });

          if (!upstreamRes.ok) {
            return createSimulationStream();
          }

          // 直接透传上游的 SSE 流式响应
          return new Response(upstreamRes.body, {
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } catch (fetchErr) {
          console.error('AI Proxy upstream fetch error:', fetchErr);
          return createSimulationStream();
        }
      }

      return createSimulationStream();
    } catch (err) {
      return jsonResponse({ code: -1, msg: err.message }, 500);
    }
  }

  return jsonResponse({ code: 404, msg: 'API Not Found' }, 404);
}
