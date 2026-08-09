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

export function submitFeedback(body: {
  message?: string;
  contact?: string;
  username?: string;
  ua?: string;
}) {
  const message = String(body.message || '').trim();
  const contact = String(body.contact || '').trim().slice(0, MAX_CONTACT);
  const username = String(body.username || '').trim().slice(0, 40);

  if (!message) {
    return { error: '请填写反馈内容', status: 400 };
  }
  if (message.length > MAX_MESSAGE) {
    return { error: `反馈内容不能超过 ${MAX_MESSAGE} 字`, status: 400 };
  }

  const entry: FeedbackEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    message,
    contact: contact || '未填写',
    username: username || '匿名',
    createdAt: new Date().toISOString(),
    ua: String(body.ua || '').slice(0, 200)
  };

  const list = loadFeedback();
  list.push(entry);
  saveFeedback(list);

  return { message: '感谢反馈！' };
}
