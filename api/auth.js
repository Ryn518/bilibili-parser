/**
 * 服务端认证 — 密码哈希 + 签名 Token，管理员凭据仅存环境变量
 *
 * POST /api/auth?action=login    { username, password }
 * POST /api/auth?action=register { username, password }
 * GET  /api/auth?action=me       Authorization: Bearer <token>
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('服务器未配置 AUTH_SECRET（至少 16 位随机字符串）');
  }
  return secret;
}

function normalizeUsername(name) {
  return String(name || '').trim().toLowerCase();
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: hashPassword(password, salt) };
}

function verifyPassword(password, record) {
  if (!record?.salt || !record?.hash) return false;
  const hash = hashPassword(password, record.salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(record.hash, 'hex'));
  } catch {
    return false;
  }
}

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveUsers(users) {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function signToken(payload) {
  const secret = getAuthSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const secret = getAuthSecret();
    const [data, sig] = parts;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function jsonRes(res, status, body) {
  return res.status(status).json(body);
}

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('limit', reject);
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error('JSON 格式无效'));
      }
    });
    req.on('error', reject);
  });
}

function issueSession(username, role) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const token = signToken({ username, role, exp });
  return {
    token,
    username,
    role,
    expiresAt: exp
  };
}

function handleLogin(username, password) {
  username = normalizeUsername(username);
  if (!username || !password) {
    return { error: '请输入用户名和密码', status: 400 };
  }

  const adminUser = normalizeUsername(process.env.ADMIN_USER || '');
  const adminPass = process.env.ADMIN_PASS || '';

  if (adminUser && adminPass && username === adminUser) {
    if (password !== adminPass) {
      return { error: '用户名或密码错误', status: 401 };
    }
    return { data: issueSession(username, 'admin') };
  }

  const users = loadUsers();
  const user = users[username];
  if (!user || !verifyPassword(password, user)) {
    return { error: '用户名或密码错误', status: 401 };
  }
  return { data: issueSession(username, 'user') };
}

function handleRegister(username, password) {
  username = normalizeUsername(username);
  if (username.length < 2) return { error: '用户名至少 2 个字符', status: 400 };
  if (!password || password.length < 6) return { error: '密码至少 6 位', status: 400 };

  const adminUser = normalizeUsername(process.env.ADMIN_USER || '');
  if (adminUser && username === adminUser) {
    return { error: '该用户名不可注册', status: 400 };
  }

  const users = loadUsers();
  if (users[username]) return { error: '用户名已存在', status: 409 };

  users[username] = {
    ...createPasswordRecord(password),
    createdAt: Date.now()
  };
  saveUsers(users);
  return { data: issueSession(username, 'user') };
}

function handleMe(token) {
  const payload = verifyToken(token);
  if (!payload) return { error: '登录已过期，请重新登录', status: 401 };
  return {
    data: {
      username: payload.username,
      role: payload.role,
      expiresAt: payload.exp
    }
  };
}

/** 本地 server.js 与 Vercel 共用 */
async function authHandler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query?.action || 'me';

  try {
    if (action === 'me' && req.method === 'GET') {
      const token = getBearerToken(req) || req.query?.token || '';
      const result = handleMe(token);
      if (result.error) return jsonRes(res, result.status, { code: -1, message: result.error });
      return jsonRes(res, 200, { code: 0, data: result.data });
    }

    if (req.method !== 'POST') {
      return jsonRes(res, 405, { code: -1, message: '不支持的请求' });
    }

    const body = req.body || await readJsonBody(req);
    let result;

    if (action === 'login') {
      result = handleLogin(body.username, body.password);
    } else if (action === 'register') {
      result = handleRegister(body.username, body.password);
    } else {
      return jsonRes(res, 400, { code: -1, message: '未知 action' });
    }

    if (result.error) return jsonRes(res, result.status, { code: -1, message: result.error });
    return jsonRes(res, 200, { code: 0, data: result.data });
  } catch (err) {
    console.error('[api/auth]', err);
    const msg = err.message?.includes('AUTH_SECRET')
      ? '服务器未正确配置，请联系开发者'
      : (err.message || '服务器错误');
    return jsonRes(res, 500, { code: -1, message: msg });
  }
}

module.exports = authHandler;
module.exports.verifyToken = verifyToken;
