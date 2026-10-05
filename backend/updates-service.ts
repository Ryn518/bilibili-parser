import fs from 'fs';
import path from 'path';
import { notifyPushPlus } from './pushplus';

const FILE = path.join(process.cwd(), 'data', 'updates.json');
const IMAGE_DIR = path.join(process.cwd(), 'data', 'update-images');
const MAX_BODY = 4000;
const MAX_COMMENT = 500;
const MAX_NAME = 20;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 3_000_000;

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
  /** 存在磁盘上的文件名；对外返回时换成图片地址 */
  images?: string[];
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

function imageUrl(name: string) {
  return `/api/updates/image?name=${encodeURIComponent(name)}`;
}

function present(item: SiteUpdate): SiteUpdate {
  return {
    ...item,
    comments: [...(item.comments || [])].reverse(),
    images: (item.images || []).map(imageUrl)
  };
}

function saveImageDataUrl(dataUrl: string): string | { error: string } {
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([a-z0-9+/=\s]+)$/i.exec(String(dataUrl || '').trim());
  if (!match) return { error: '只能粘贴图片' };
  const kind = match[1].toLowerCase();
  const ext = kind === 'png' ? 'png' : kind === 'webp' ? 'webp' : 'jpg';
  const buf = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (buf.length < 32 || buf.length > MAX_IMAGE_BYTES) return { error: '图片太大或无效，请换一张再试' };
  if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });
  const name = `${uid()}.${ext}`;
  fs.writeFileSync(path.join(IMAGE_DIR, name), buf);
  return name;
}

function removeImageFile(name: string) {
  if (!/^[a-z0-9]+\.(jpg|png|webp)$/i.test(name)) return;
  const root = path.resolve(IMAGE_DIR) + path.sep;
  const file = path.resolve(IMAGE_DIR, name);
  if (!file.startsWith(root) || !fs.existsSync(file)) return;
  fs.unlinkSync(file);
}

export function readUpdateImage(name: string): { body: Buffer; type: string } | null {
  if (!/^[a-z0-9]+\.(jpg|png|webp)$/i.test(name)) return null;
  const root = path.resolve(IMAGE_DIR) + path.sep;
  const file = path.resolve(IMAGE_DIR, name);
  if (!file.startsWith(root) || !fs.existsSync(file)) return null;
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { body: fs.readFileSync(file), type };
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

export function createUpdate(input: { version?: string; title?: string; content?: string; images?: unknown }) {
  const version = String(input.version || '').trim().slice(0, 20);
  const title = String(input.title || '').trim().slice(0, 80);
  const content = String(input.content || '').trim();
  const rawImages = Array.isArray(input.images) ? input.images.map((item) => String(item || '')) : [];
  if (!title) return { error: '请填写更新标题', status: 400 };
  if (!content && rawImages.length === 0) return { error: '请填写更新内容，或粘贴一张图片', status: 400 };
  if (content.length > MAX_BODY) return { error: `内容不能超过 ${MAX_BODY} 字`, status: 400 };
  if (rawImages.length > MAX_IMAGES) return { error: `最多粘贴 ${MAX_IMAGES} 张图片`, status: 400 };

  const images: string[] = [];
  for (const raw of rawImages) {
    const saved = saveImageDataUrl(raw);
    if (typeof saved !== 'string') {
      images.forEach(removeImageFile);
      return { error: saved.error, status: 400 };
    }
    images.push(saved);
  }

  const entry: SiteUpdate = {
    id: uid(),
    version: version || '更新',
    title,
    content,
    createdAt: new Date().toISOString(),
    comments: [],
    images
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
  const item = list.find((row) => row.id === updateId);
  if (!item) return { error: '更新不存在', status: 404 };
  (item.images || []).forEach(removeImageFile);
  save(list.filter((row) => row.id !== updateId));
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
