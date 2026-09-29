import fs from 'fs';
import path from 'path';

const FEEDBACK_FILE = path.join(process.cwd(), 'data', 'feedback.json');
const MAX_MESSAGE = 2000;
const MAX_CONTACT = 120;

interface FeedbackEntry {
  id: string;
  message: string;
  contact: string;
  username: string;
  createdAt: string;
  ua: string;
}

function loadFeedback(): FeedbackEntry[] {
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) return [];
    const list = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveFeedback(list: FeedbackEntry[]) {
  const dir = path.dirname(FEEDBACK_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function persistFeedback(entry: FeedbackEntry) {
  const list = loadFeedback();
  list.push(entry);
  saveFeedback(list);
}

export async function submitFeedback(body: {
  message?: string;
  contact?: string;
  username?: string;
  ua?: string;
}) {
  const message = String(body.message || '').trim();
  const contact = String(body.contact || '').trim().slice(0, MAX_CONTACT);
  const username = String(body.username || '').trim().slice(0, 40);

  if (!message) {
    return { error: '请填写想说的话', status: 400 };
  }
  if (message.length > MAX_MESSAGE) {
    return { error: `反馈内容不能超过 ${MAX_MESSAGE} 字`, status: 400 };
  }
  if (!contact) {
    return { error: '请填写联系方式，方便我回复你', status: 400 };
  }

  const entry: FeedbackEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    message,
    contact,
    username: username || '匿名',
    createdAt: new Date().toISOString(),
    ua: String(body.ua || '').slice(0, 200)
  };

  let savedToDisk = false;
  try {
    persistFeedback(entry);
    savedToDisk = true;
  } catch {
    // Vercel 等 Serverless 环境文件系统只读，跳过本地落盘
  }

  const notified = await notifyFeedbackPushPlus(entry);

  if (!savedToDisk && !notified) {
    return { error: '反馈暂时无法提交，请稍后再试', status: 503 };
  }

  return { message: '感谢反馈！' };
}

export function listFeedback(limit = 50) {
  const list = loadFeedback();
  return list.slice(-limit).reverse();
}

async function notifyFeedbackPushPlus(entry: FeedbackEntry): Promise<boolean> {
  const token = process.env.FEEDBACK_PUSHPLUS_TOKEN?.trim();
  if (!token) return false;

  const content = [
    `用户：${entry.username}`,
    `联系方式：${entry.contact}`,
    `时间：${new Date(entry.createdAt).toLocaleString('zh-CN', { hour12: false })}`,
    '',
    entry.message
  ].join('\n');

  try {
    const res = await fetch('https://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title: '课表规划器 · 新反馈',
        content,
        template: 'txt'
      })
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { code?: number };
    return data.code === 200;
  } catch {
    return false;
  }
}
