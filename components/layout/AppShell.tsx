'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { UiProvider } from '@/hooks/useUiStore';
import { Topbar } from '@/components/layout/Topbar';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FeedbackFab } from '@/components/feedback/FeedbackFab';
import { TipModal } from '@/components/feedback/TipModal';
import { AuthModalHost } from '@/components/auth/AuthModalHost';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UiProvider>
        <ToastProvider>
          <div className="relative z-[1] flex min-h-dvh flex-col">
            <Topbar />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <FeedbackFab />
            <TipModal />
            <AuthModalHost />
          </div>
        </ToastProvider>
      </UiProvider>
    </AuthProvider>
  );
}
