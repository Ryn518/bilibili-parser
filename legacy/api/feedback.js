/**
 * 用户反馈 — 保存到 data/feedback.json（本地 / Vercel 共用）
 * POST /api/feedback  { message, contact?, username? }
 */

const fs = require('fs');
const path = require('path');

const FEEDBACK_FILE = path.join(__dirname, '..', 'data', 'feedback.json');
const MAX_MESSAGE = 2000;
const MAX_CONTACT = 120;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function jsonRes(res, status, body) {
  return res.status(status).json(body);
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('JSON 格式无效'));
      }
    });
    req.on('error', reject);
  });
}

function loadFeedback() {
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) return [];
    const list = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveFeedback(list) {
  const dir = path.dirname(FEEDBACK_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(list, null, 2), 'utf8');
}

async function feedbackHandler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return jsonRes(res, 405, { code: -1, message: '不支持的请求' });
  }

  try {
    const body = req.body || await readJsonBody(req);
    const message = String(body.message || '').trim();
    const contact = String(body.contact || '').trim().slice(0, MAX_CONTACT);
    const username = String(body.username || '').trim().slice(0, 40);

    if (!message) {
      return jsonRes(res, 400, { code: -1, message: '请填写反馈内容' });
    }
    if (message.length > MAX_MESSAGE) {
      return jsonRes(res, 400, { code: -1, message: `反馈内容不能超过 ${MAX_MESSAGE} 字` });
    }

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      message,
      contact: contact || '未填写',
      username: username || '匿名',
      createdAt: new Date().toISOString(),
      ua: String(req.headers['user-agent'] || '').slice(0, 200)
    };

    const list = loadFeedback();
    list.push(entry);
    saveFeedback(list);

    console.log('[api/feedback] 新反馈:', entry.username, message.slice(0, 40));
    return jsonRes(res, 200, { code: 0, message: '感谢反馈！' });
  } catch (err) {
    console.error('[api/feedback]', err);
    return jsonRes(res, 500, { code: -1, message: err.message || '服务器错误' });
  }
}

module.exports = feedbackHandler;
