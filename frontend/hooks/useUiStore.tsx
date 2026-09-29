'use client';

import { createContext, useContext, useState } from 'react';

type AuthMode = 'login' | 'register';

interface UiContextValue {
  authOpen: boolean;
  authMode: AuthMode;
  feedbackOpen: boolean;
  tipOpen: boolean;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
  openFeedback: () => void;
  closeFeedback: () => void;
  openTip: () => void;
  closeTip: () => void;
}

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  return (
    <UiContext.Provider
      value={{
        authOpen,
        authMode,
        feedbackOpen,
        tipOpen,
        openAuth: (mode = 'login') => {
          setAuthMode(mode);
          setAuthOpen(true);
        },
        closeAuth: () => setAuthOpen(false),
        openFeedback: () => setFeedbackOpen(true),
        closeFeedback: () => setFeedbackOpen(false),
        openTip: () => setTipOpen(true),
        closeTip: () => setTipOpen(false)
      }}
    >
      {children}
    </UiContext.Provider>
  );
}

export function useUiStore() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUiStore must be used within UiProvider');
  return ctx;
}
