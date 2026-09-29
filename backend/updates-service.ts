import fs from 'fs';
import path from 'path';
import { notifyPushPlus } from './pushplus';

const FILE = path.join(process.cwd(), 'data', 'updates.json');
const MAX_BODY = 4000;
const MAX_COMMENT = 500;
const MAX_NAME = 20;

export interface UpdateComment {
  id: string;
  content: string;
  username: string;
  createdAt: string;
}

export interface SiteUpdate {
  id: string;
  version: string;
  title: string;
  content: string;
  createdAt: string;
  comments: UpdateComment[];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load(): SiteUpdate[] {
  try {
    if (!fs.existsSync(FILE)) return [];
    const list = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list: SiteUpdate[]) {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
}

function present(item: SiteUpdate): SiteUpdate {
  return { ...item, comments: [...(item.comments || [])].reverse() };
}

export function listUpdates(): SiteUpdate[] {
  return load()
    .slice()
    .reverse()
    .slice(0, 50)
    .map(present);
}

export function latestUpdate(): SiteUpdate | null {
  const list = load();
  if (!list.length) return null;
  return present(list[list.length - 1]);
}

export function createUpdate(input: { version?: string; title?: string; content?: string }) {
  const version = String(input.version || '').trim().slice(0, 20);
  const title = String(input.title || '').trim().slice(0, 80);
  const content = String(input.content || '').trim();
  if (!title) return { error: '请填写更新标题', status: 400 };
  if (!content) return { error: '请填写更新内容', status: 400 };
  if (content.length > MAX_BODY) return { error: `内容不能超过 ${MAX_BODY} 字`, status: 400 };

  const entry: SiteUpdate = {
    id: uid(),
    version: version || '更新',
    title,
    content,
    createdAt: new Date().toISOString(),
    comments: []
  };
  const list = load();
  list.push(entry);
  save(list);
  return { update: present(entry) };
}

export async function addUpdateComment(input: { updateId?: string; content?: string; username?: string }) {
  const content = String(input.content || '').trim();
  const username = String(input.username || '').trim().slice(0, MAX_NAME) || '匿名';
  if (!content) return { error: '请填写评论', status: 400 };
  if (content.length > MAX_COMMENT) return { error: `评论不能超过 ${MAX_COMMENT} 字`, status: 400 };

  const list = load();
  const item = list.find((row) => row.id === input.updateId);
  if (!item) return { error: '更新不存在', status: 404 };

  const comment: UpdateComment = {
    id: uid(),
    content,
    username,
    createdAt: new Date().toISOString()
  };
  item.comments = item.comments || [];
  item.comments.push(comment);
  save(list);

  await notifyPushPlus(
    '课表规划器 · 更新页新评论',
    [`用户：${username}`, `更新：${item.version} ${item.title}`, '', content].join('\n')
  );

  return { comment };
}

export function deleteUpdate(updateId: string) {
  const list = load();
  const next = list.filter((item) => item.id !== updateId);
  if (next.length === list.length) return { error: '更新不存在', status: 404 };
  save(next);
  return { ok: true };
}

export function deleteUpdateComment(updateId: string, commentId: string) {
  const list = load();
  const item = list.find((row) => row.id === updateId);
  if (!item) return { error: '更新不存在', status: 404 };
  const before = item.comments?.length || 0;
  item.comments = (item.comments || []).filter((row) => row.id !== commentId);
  if (item.comments.length === before) return { error: '评论不存在', status: 404 };
  save(list);
  return { ok: true };
}
