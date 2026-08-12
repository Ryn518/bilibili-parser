import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'B站课表规划器',
  description: '粘贴 B 站课程链接，智能解析分 P 时长，按每日学习量自动切分日程',
  manifest: '/manifest.webmanifest'
};

export const viewport: Viewport = {
  themeColor: '#DCE8F5'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <AppShell>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}
