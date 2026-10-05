import fs from 'fs';
import path from 'path';
import { notifyPushPlus } from './pushplus';

const FILE = path.join(process.cwd(), 'data', 'plaza.json');
const IMAGE_DIR = path.join(process.cwd(), 'data', 'plaza-images');
const MAX_POST = 1000;
const MAX_COMMENT = 500;
const MAX_NAME = 20;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 3_000_000;

interface PlazaComment {
  id: string;
  content: string;
  username: string;
  createdAt: string;
  likes?: string[];
}

export interface PlazaCommentPublic {
  id: string;
  content: string;
  username: string;
  createdAt: string;
  likeCount: number;
  liked: boolean;
}

interface PlazaPost {
  id: string;
  content: string;
  username: string;
  authorKey: string;
  createdAt: string;
  likes: string[];
  comments: PlazaComment[];
  images?: string[];
}

export interface PlazaPostPublic {
  id: string;
  content: string;
  username: string;
  createdAt: string;
  likeCount: number;
  liked: boolean;
  comments: PlazaCommentPublic[];
  images?: string[];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load(): PlazaPost[] {
  try {
    if (!fs.existsSync(FILE)) return [];
    const list = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list: PlazaPost[]) {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
}

function imageUrl(name: string) {
  return `/api/plaza/image?name=${encodeURIComponent(name)}`;
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

export function readPlazaImage(name: string): { body: Buffer; type: string } | null {
  if (!/^[a-z0-9]+\.(jpg|png|webp)$/i.test(name)) return null;
  const root = path.resolve(IMAGE_DIR) + path.sep;
  const file = path.resolve(IMAGE_DIR, name);
  if (!file.startsWith(root) || !fs.existsSync(file)) return null;
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { body: fs.readFileSync(file), type };
}

function toPublic(post: PlazaPost, voterKey: string): PlazaPostPublic {
  return {
    id: post.id,
    content: post.content,
    username: post.username,
    createdAt: post.createdAt,
    likeCount: (post.likes || []).length,
    liked: !!voterKey && (post.likes || []).includes(voterKey),
    images: (post.images || []).map(imageUrl),
    comments: [...(post.comments || [])].reverse().map((item) => ({
      id: item.id,
      content: item.content,
      username: item.username,
      createdAt: item.createdAt,
      likeCount: (item.likes || []).length,
      liked: !!voterKey && (item.likes || []).includes(voterKey)
    }))
  };
}

export function listPlaza(clientId = ''): PlazaPostPublic[] {
  return load()
    .slice()
    .reverse()
    .slice(0, 100)
    .map((post) => toPublic(post, clientId));
}

export async function createPlazaPost(input: {
  content?: string;
  username?: string;
  authorKey?: string;
  images?: unknown;
}) {
  const content = String(input.content || '').trim();
  const username = String(input.username || '').trim().slice(0, MAX_NAME) || '匿名';
  const authorKey = String(input.authorKey || 'anon').slice(0, 80);
  const rawImages = Array.isArray(input.images) ? input.images.map((item) => String(item || '')) : [];

  if (!content && rawImages.length === 0) return { error: '请填写内容，或粘贴一张图片', status: 400 };
  if (content.length > MAX_POST) return { error: `内容不能超过 ${MAX_POST} 字`, status: 400 };
  if (rawImages.length > MAX_IMAGES) return { error: `最多粘贴 ${MAX_IMAGES} 张图片`, status: 400 };

  const list = load();
  const recent = list.filter((item) => item.authorKey === authorKey && Date.now() - Date.parse(item.createdAt) < 60 * 60 * 1000);
  if (recent.length >= 8) return { error: '发得太频繁了，请稍后再试', status: 429 };

  const images: string[] = [];
  for (const raw of rawImages) {
    const saved = saveImageDataUrl(raw);
    if (typeof saved !== 'string') {
      images.forEach(removeImageFile);
      return { error: saved.error, status: 400 };
    }
    images.push(saved);
  }

  const entry: PlazaPost = {
    id: uid(),
    content,
    username,
    authorKey,
    createdAt: new Date().toISOString(),
    likes: [],
    comments: [],
    images
  };
  list.push(entry);
  save(list);

  await notifyPushPlus(
    '课表规划器 · 广场新帖',
    [`用户：${username}`, `时间：${new Date(entry.createdAt).toLocaleString('zh-CN', { hour12: false })}`, '', content].join('\n')
  );

  return { post: toPublic(entry, authorKey) };
}

function toggleLikeList(likes: string[] | undefined, voterKey: string) {
  const next = [...(likes || [])];
  const index = next.indexOf(voterKey);
  if (index >= 0) next.splice(index, 1);
  else next.push(voterKey);
  return next;
}

export function togglePlazaLike(postId: string, voterKey: string, commentId?: string) {
  const id = String(voterKey || '').trim().slice(0, 80);
  if (!id) return { error: '请先登录', status: 401 };
  const list = load();
  const post = list.find((item) => item.id === postId);
  if (!post) return { error: '内容不存在', status: 404 };
  if (commentId) {
    const comment = (post.comments || []).find((item) => item.id === commentId);
    if (!comment) return { error: '评论不存在', status: 404 };
    comment.likes = toggleLikeList(comment.likes, id);
  } else {
    post.likes = toggleLikeList(post.likes, id);
  }
  save(list);
  return { post: toPublic(post, id) };
}

export async function addPlazaComment(input: { postId?: string; content?: string; username?: string }) {
  const content = String(input.content || '').trim();
  const username = String(input.username || '').trim().slice(0, MAX_NAME);
  if (!username) return { error: '请先登录', status: 401 };
  if (!content) return { error: '请填写评论', status: 400 };
  if (content.length > MAX_COMMENT) return { error: `评论不能超过 ${MAX_COMMENT} 字`, status: 400 };

  const list = load();
  const post = list.find((item) => item.id === input.postId);
  if (!post) return { error: '内容不存在', status: 404 };

  const comment: PlazaComment = {
    id: uid(),
    content,
    username,
    createdAt: new Date().toISOString(),
    likes: []
  };
  post.comments = post.comments || [];
  post.comments.push(comment);
  save(list);

  await notifyPushPlus(
    '课表规划器 · 广场新评论',
    [`用户：${username}`, `原帖：${post.content.slice(0, 80)}`, '', content].join('\n')
  );

  return { comment };
}

export function deletePlazaPost(postId: string) {
  const list = load();
  const item = list.find((row) => row.id === postId);
  if (!item) return { error: '内容不存在', status: 404 };
  (item.images || []).forEach(removeImageFile);
  save(list.filter((row) => row.id !== postId));
  return { ok: true };
}

export function deletePlazaComment(postId: string, commentId: string) {
  const list = load();
  const post = list.find((item) => item.id === postId);
  if (!post) return { error: '内容不存在', status: 404 };
  const before = post.comments?.length || 0;
  post.comments = (post.comments || []).filter((item) => item.id !== commentId);
  if (post.comments.length === before) return { error: '评论不存在', status: 404 };
  save(list);
  return { ok: true };
}
