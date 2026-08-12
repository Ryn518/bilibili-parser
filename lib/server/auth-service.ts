import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('服务器未配置 AUTH_SECRET（至少 16 位随机字符串）');
  }
  return secret;
}

function normalizeUsername(name: string) {
  return String(name || '').trim().toLowerCase();
}

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createPasswordRecord(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: hashPassword(password, salt) };
}

function verifyPassword(password: string, record: { salt?: string; hash?: string }) {
  if (!record?.salt || !record?.hash) return false;
  const hash = hashPassword(password, record.salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(record.hash, 'hex'));
  } catch {
    return false;
  }
}

function loadUsers(): Record<string, { salt: string; hash: string; createdAt: number }> {
  try {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, unknown>) {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function canPersistUsersToDisk() {
  if (process.env.VERCEL === '1') return false;
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export interface AuthCredentialRecord {
  salt: string;
  hash: string;
}

function signToken(payload: object) {
  const secret = getAuthSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string | null | undefined) {
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
    return payload as { username: string; role: 'user' | 'admin'; exp: number };
  } catch {
    return null;
  }
}

function issueSession(username: string, role: 'user' | 'admin') {
  const exp = Date.now() + TOKEN_TTL_MS;
  const token = signToken({ username, role, exp });
  return { token, username, role, expiresAt: exp };
}

export function handleLogin(
  username: string,
  password: string,
  clientRecord?: AuthCredentialRecord | null
) {
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
  if (user && verifyPassword(password, user)) {
    return { data: issueSession(username, 'user') };
  }

  if (canPersistUsersToDisk()) {
    return { error: '用户名或密码错误', status: 401 };
  }

  if (!clientRecord?.salt || !clientRecord?.hash) {
    return { error: '本机未找到该账号，请先注册', status: 401 };
  }
  if (!verifyPassword(password, clientRecord)) {
    return { error: '用户名或密码错误', status: 401 };
  }
  return { data: issueSession(username, 'user') };
}

export function handleRegister(username: string, password: string) {
  username = normalizeUsername(username);
  if (username.length < 2) return { error: '用户名至少 2 个字符', status: 400 };
  if (!password || password.length < 6) return { error: '密码至少 6 位', status: 400 };

  const adminUser = normalizeUsername(process.env.ADMIN_USER || '');
  if (adminUser && username === adminUser) {
    return { error: '该用户名不可注册', status: 400 };
  }

  const users = loadUsers();
  if (users[username]) return { error: '用户名已存在', status: 409 };

  const record = { ...createPasswordRecord(password), createdAt: Date.now() };

  if (canPersistUsersToDisk()) {
    users[username] = record;
    try {
      saveUsers(users);
    } catch {
      return { error: '注册暂时不可用，请稍后再试', status: 503 };
    }
    return { data: issueSession(username, 'user') };
  }

  return {
    data: issueSession(username, 'user'),
    authRecord: { salt: record.salt, hash: record.hash }
  };
}

export function handleMe(token: string) {
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
