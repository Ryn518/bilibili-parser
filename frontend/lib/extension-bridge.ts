export interface ExtensionCourse {
  ok: true;
  bvid: string;
  title: string;
  pageCount: number;
  firstTitle: string;
  sentTo: string;
  view: Record<string, unknown>;
}

export function extensionConnected() {
  return typeof document !== 'undefined' && document.documentElement.dataset.dayplanExtension === '1';
}

export function hostNeedsExtension(hostname: string) {
  return hostname === 'kebiaoplan.cn' || hostname === 'www.kebiaoplan.cn';
}

export function planningNeedsExtension() {
  if (typeof location === 'undefined') return false;
  return hostNeedsExtension(location.hostname);
}

export function watchExtension(onChange: (connected: boolean) => void) {
  const emit = () => onChange(extensionConnected());
  emit();
  window.addEventListener('dayplan-extension-ready', emit);
  return () => window.removeEventListener('dayplan-extension-ready', emit);
}

export function requestCourseFromExtension(input: string, timeoutMs = 20000) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise<ExtensionCourse>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('插件没有回应'));
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data as {
        source?: string;
        requestId?: string;
        response?: ExtensionCourse | { ok: false; error?: string };
      };
      if (!data || data.source !== 'dayplan-extension' || data.requestId !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      if (!data.response || !('ok' in data.response) || !data.response.ok) {
        reject(new Error((data.response && 'error' in data.response && data.response.error) || '插件没有读到课程'));
        return;
      }
      resolve(data.response);
    }

    window.addEventListener('message', onMessage);
    window.postMessage(
      { source: 'dayplan-page', type: 'fetchCourse', requestId, input },
      window.location.origin
    );
  });
}
