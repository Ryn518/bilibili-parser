/**
 * 在用户自己的浏览器里读取公开视频信息。
 * 用 script 标签而不是 fetch：这个接口认 callback，且不接受别的网站发来的 Origin。
 * 请求从用户的网络发出，不经过网站服务器。
 */

export function viewJsonpUrl(query: { bvid?: string; aid?: string }, callback: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,40}$/.test(callback)) {
    throw new Error('回调名无效');
  }
  const params = new URLSearchParams();
  if (query.bvid) params.set('bvid', query.bvid);
  if (query.aid) params.set('aid', query.aid);
  params.set('jsonp', 'jsonp');
  params.set('callback', callback);
  return `https://api.bilibili.com/x/web-interface/view?${params.toString()}`;
}

function viewError(code: number, message?: string) {
  if (code === -404 || /啥都木有|稿件不存在|不存在/i.test(message || '')) {
    return '该视频不存在、已下架或无法访问，请确认链接完整有效';
  }
  if (code === -403 || /权限|登录|地区/i.test(message || '')) {
    return '该视频无访问权限（可能是充电/大会员/地区限制）';
  }
  return message || 'B站没有返回课程';
}

export function loadBilibiliView(
  query: { bvid?: string; aid?: string },
  timeoutMs = 12000
): Promise<Record<string, unknown>> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('只能在浏览器里读取课程'));
  }
  const callback = `dayplan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('B站没有回应，请稍后再试'));
    }, timeoutMs);

    function cleanup() {
      window.clearTimeout(timer);
      delete (window as unknown as Record<string, unknown>)[callback];
      script.remove();
    }

    (window as unknown as Record<string, (payload: unknown) => void>)[callback] = (payload) => {
      cleanup();
      const json = payload as { code?: number; message?: string; data?: Record<string, unknown> };
      if (json?.code === 0 && json.data && typeof json.data === 'object') {
        resolve(json.data);
        return;
      }
      reject(new Error(viewError(Number(json?.code), json?.message)));
    };

    script.src = viewJsonpUrl(query, callback);
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error('B站没有回应，请稍后再试'));
    };
    document.head.appendChild(script);
  });
}
