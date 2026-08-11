'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { UiProvider } from '@/hooks/useUiStore';
import { Topbar } from '@/components/layout/Topbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FeedbackFab } from '@/components/feedback/FeedbackFab';
import { AuthModalHost } from '@/components/auth/AuthModalHost';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UiProvider>
        <ToastProvider>
          <div className="relative z-[1] flex min-h-dvh flex-col">
            <Topbar />
            <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">{children}</main>
            <SiteFooter />
            <MobileBottomNav />
            <FeedbackFab />
            <AuthModalHost />
          </div>
        </ToastProvider>
      </UiProvider>
    </AuthProvider>
  );
}
