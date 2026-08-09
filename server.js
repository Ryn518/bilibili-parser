/**
 * 本地开发服务器 — 无需 Vercel，双击「启动.bat」或运行 npm start 即可
 * - 静态页面：index.html
 * - API 代理：/api/bilibili（与 Vercel 共用 api/bilibili.js）
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');
const { exec } = require('child_process');

const bilibiliHandler = require('./api/bilibili');
const authHandler = require('./api/auth');
const feedbackHandler = require('./api/feedback');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

/** 加载 .env（本地开发，不提交 Git） */
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim().replace(/\r/g, '');
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim().replace(/\r/g, '');
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

/** 模拟 Vercel 的 res 对象，供 api/bilibili.js 使用 */
function createMockRes(nodeRes) {
  let statusCode = 200;
  const headers = {};
  const api = {
    setHeader(k, v) {
      headers[k] = v;
    },
    status(code) {
      statusCode = code;
      return api;
    },
    json(obj) {
      nodeRes.writeHead(statusCode, {
        ...headers,
        'Content-Type': 'application/json; charset=utf-8'
      });
      nodeRes.end(JSON.stringify(obj));
    },
    end() {
      nodeRes.writeHead(statusCode, headers);
      nodeRes.end();
    }
  };
  return api;
}

/** 解析 URL 查询参数为对象 */
function parseQuery(searchParams) {
  const q = {};
  for (const [k, v] of searchParams) q[k] = v;
  return q;
}

/** 返回静态文件 */
function serveStatic(nodeRes, reqPath) {
  let filePath = path.join(ROOT, reqPath === '/' ? 'index.html' : reqPath.replace(/^\//, ''));
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(ROOT)) {
    nodeRes.writeHead(403);
    nodeRes.end('Forbidden');
    return;
  }

  if (!fs.existsSync(normalized) || fs.statSync(normalized).isDirectory()) {
    if (reqPath.startsWith('/api/')) {
      nodeRes.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      nodeRes.end(JSON.stringify({ code: -1, message: 'API 不存在，请更新并重启 server.js' }));
      return;
    }
    filePath = path.join(ROOT, 'index.html');
  }

  const ext = path.extname(filePath);
  nodeRes.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(nodeRes);
}

const server = http.createServer(async (nodeReq, nodeRes) => {
  const url = new URL(nodeReq.url, `http://127.0.0.1:${PORT}`);

  // 健康检查（file:// 检测本地服务是否运行）
  if (url.pathname === '/api/health') {
    nodeRes.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    nodeRes.end(JSON.stringify({ ok: true }));
    return;
  }

  // 认证 API
  if (url.pathname === '/api/auth') {
    try {
      nodeReq.query = parseQuery(url.searchParams);
      await authHandler(nodeReq, createMockRes(nodeRes));
    } catch (err) {
      console.error('[api/auth]', err);
      if (!nodeRes.headersSent) {
        nodeRes.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        nodeRes.end(JSON.stringify({ code: -1, message: err.message || '服务器错误' }));
      }
    }
    return;
  }

  // 用户反馈
  if (url.pathname === '/api/feedback') {
    try {
      await feedbackHandler(nodeReq, createMockRes(nodeRes));
    } catch (err) {
      console.error('[api/feedback]', err);
      if (!nodeRes.headersSent) {
        nodeRes.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        nodeRes.end(JSON.stringify({ code: -1, message: err.message || '服务器错误' }));
      }
    }
    return;
  }

  // B 站 API 代理
  if (url.pathname === '/api/bilibili') {
    try {
      await bilibiliHandler(
        { method: nodeReq.method, query: parseQuery(url.searchParams) },
        createMockRes(nodeRes)
      );
    } catch (err) {
      console.error('[api/bilibili]', err);
      if (!nodeRes.headersSent) {
        nodeRes.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        nodeRes.end(JSON.stringify({ code: -1, message: err.message || '服务器错误' }));
      }
    }
    return;
  }

  serveStatic(nodeRes, url.pathname);
});

function getLanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const item of list || []) {
      if (item.family === 'IPv4' && !item.internal && !item.address.startsWith('169.254.')) {
        return item.address;
      }
    }
  }
  return null;
}

server.listen(PORT, '0.0.0.0', () => {
  if (!process.env.AUTH_SECRET) {
    console.warn('  [警告] 未配置 AUTH_SECRET，请复制 .env.example 为 .env');
  }
  const addr = `http://127.0.0.1:${PORT}`;
  const lanIp = getLanAddress();
  const lan = lanIp ? `http://${lanIp}:${PORT}` : null;
  console.log('');
  console.log('  B站课表规划器 — 本地服务已启动');
  console.log('  电脑浏览器: ' + addr);
  if (lan) console.log('  手机同 WiFi: ' + lan);
  console.log('  认证 API: ' + addr + '/api/auth');
  console.log('  按 Ctrl+C 停止');
  console.log('');

  // Windows 自动打开浏览器
  if (process.platform === 'win32') {
    exec(`start "" "${addr}"`, { shell: true });
  }
});
