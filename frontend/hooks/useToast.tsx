'use client';

import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);

  const showToast = useCallback((text: string) => {
    setMsg(text);
    setShow(true);
    setTimeout(() => setShow(false), 2500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        className={`fixed bottom-24 left-1/2 z-[200] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-lg transition ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        {msg}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
