'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { UiProvider } from '@/hooks/useUiStore';
import { Topbar } from '@/components/layout/Topbar';
import { FeedbackFab } from '@/components/feedback/FeedbackFab';
import { AuthModalHost } from '@/components/auth/AuthModalHost';
import { PricingModalHost } from '@/components/vip/PricingModalHost';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UiProvider>
        <ToastProvider>
          <div className="relative z-[1] min-h-dvh">
            <Topbar />
            <main>{children}</main>
            <FeedbackFab />
            <AuthModalHost />
            <PricingModalHost />
          </div>
        </ToastProvider>
      </UiProvider>
    </AuthProvider>
  );
}
