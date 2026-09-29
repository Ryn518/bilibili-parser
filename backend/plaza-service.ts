import fs from 'fs';
import path from 'path';
import { notifyPushPlus } from './pushplus';

const FILE = path.join(process.cwd(), 'data', 'plaza.json');
const MAX_POST = 1000;
const MAX_COMMENT = 500;
const MAX_NAME = 20;

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
}

export interface PlazaPostPublic {
  id: string;
  content: string;
  username: string;
  createdAt: string;
  likeCount: number;
  liked: boolean;
  comments: PlazaCommentPublic[];
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

function toPublic(post: PlazaPost, voterKey: string): PlazaPostPublic {
  return {
    id: post.id,
    content: post.content,
    username: post.username,
    createdAt: post.createdAt,
    likeCount: (post.likes || []).length,
    liked: !!voterKey && (post.likes || []).includes(voterKey),
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

export async function createPlazaPost(input: { content?: string; username?: string; authorKey?: string }) {
  const content = String(input.content || '').trim();
  const username = String(input.username || '').trim().slice(0, MAX_NAME) || '匿名';
  const authorKey = String(input.authorKey || 'anon').slice(0, 80);

  if (!content) return { error: '请填写内容', status: 400 };
  if (content.length > MAX_POST) return { error: `内容不能超过 ${MAX_POST} 字`, status: 400 };

  const list = load();
  const recent = list.filter((item) => item.authorKey === authorKey && Date.now() - Date.parse(item.createdAt) < 60 * 60 * 1000);
  if (recent.length >= 8) return { error: '发得太频繁了，请稍后再试', status: 429 };

  const entry: PlazaPost = {
    id: uid(),
    content,
    username,
    authorKey,
    createdAt: new Date().toISOString(),
    likes: [],
    comments: []
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
  const next = list.filter((item) => item.id !== postId);
  if (next.length === list.length) return { error: '内容不存在', status: 404 };
  save(next);
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
