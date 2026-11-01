'use client';

import Link from 'next/link';

export function MineTabs({ active }: { active: 'courses' | 'inbox' }) {
  const item = (id: 'courses' | 'inbox', href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active === id ? 'bg-accent-light font-semibold text-accent-text' : 'text-text2 hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mb-6 inline-flex w-fit gap-1 rounded-full border border-border bg-white p-1">
      {item('courses', '/mine', '我的课程')}
      {item('inbox', '/mine/inbox', '收到的互动')}
    </div>
  );
}
