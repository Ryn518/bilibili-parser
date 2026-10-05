'use client';

import { useEffect, useRef, useState } from 'react';

const memory = new Map<string, unknown>();

function readDraft<T>(key: string, fallback: T): T {
  if (memory.has(key)) return memory.get(key) as T;
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = sessionStorage.getItem(`bili-draft:${key}`);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeDraft(key: string, value: unknown, persist: boolean) {
  memory.set(key, value);
  if (!persist || typeof window === 'undefined') return;
  try {
    const text = JSON.stringify(value);
    if (text.length > 200_000) return;
    sessionStorage.setItem(`bili-draft:${key}`, text);
  } catch {
    /* 浏览器配额不够时，这次访问里仍留在内存中 */
  }
}

/** 页面切走再回来时保留未发布的输入。文字会记下，大图只在本次打开里保留。 */
export function useDraftState<T>(key: string, fallback: T, persist = true) {
  const [value, setValue] = useState<T>(fallback);
  const skipWrite = useRef(true);

  useEffect(() => {
    setValue(readDraft(key, fallback));
  }, [key]);

  useEffect(() => {
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    writeDraft(key, value, persist);
  }, [key, persist, value]);

  return [value, setValue] as const;
}
