'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useUiStore } from '@/hooks/useUiStore';

export function AuthModalHost() {
  const { authOpen, authMode, closeAuth, openAuth } = useUiStore();
  const auth = useAuth();
  const showToast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (authMode === 'register' && password !== confirm) {
      setError('两次密码不一致');
      return;
    }
    setSubmitting(true);
    const err =
      authMode === 'register'
        ? await auth.register(username, password)
        : await auth.login(username, password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    showToast('登录成功');
    closeAuth();
    setUsername('');
    setPassword('');
    setConfirm('');
  };

  return (
    <div className="modal-overlay" onClick={closeAuth}>
      <div className="modal max-w-[380px] text-left" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex gap-1 rounded-full border border-border bg-surface2 p-1">
          {(['login', 'register'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                openAuth(mode);
                setError('');
              }}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${authMode === mode ? 'bg-surface font-semibold text-ink shadow-sm' : 'text-text2'}`}
            >
              {mode === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>
        <form onSubmit={submit}>
          {error && <p className="mb-2.5 rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-600">{error}</p>}
          <label className="mb-3 block text-xs font-semibold text-text2">用户名</label>
          <input
            className="mb-3 w-full rounded-[10px] border border-border bg-surface2 px-3 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            required
          />
          <label className="mb-3 block text-xs font-semibold text-text2">密码</label>
          <input
            type="password"
            className="mb-3 w-full rounded-[10px] border border-border bg-surface2 px-3 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            required
          />
          {authMode === 'register' && (
            <>
              <label className="mb-3 block text-xs font-semibold text-text2">确认密码</label>
              <input
                type="password"
                className="mb-3 w-full rounded-[10px] border border-border bg-surface2 px-3 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再次输入密码"
                required
              />
            </>
          )}
          <button type="submit" disabled={submitting} className="btn-primary mt-1 w-full">
            {submitting ? '处理中…' : authMode === 'register' ? '注册并登录' : '登录'}
          </button>
        </form>
        <p className="mt-3 text-center text-xs leading-relaxed text-text3">
          登录后可保存课程与进度到「我的课程」
          <br />
          密码至少 6 位；配置数据库后支持跨设备云同步
        </p>
        <button type="button" onClick={closeAuth} className="mt-3 w-full rounded-[10px] border border-border py-2 text-sm text-text2">
          取消
        </button>
      </div>
    </div>
  );
}
