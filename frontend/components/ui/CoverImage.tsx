'use client';

import { useEffect, useMemo, useState } from 'react';
import { coverFallbacks } from '@/lib/format';

interface Props {
  src?: string | null;
  alt?: string;
  className?: string;
  wrapperClassName?: string;
}

/** B 站封面：防盗链 + 多 CDN 回退 + 占位 */
export function CoverImage({
  src,
  alt = '',
  className = 'h-full w-full object-cover',
  wrapperClassName = 'aspect-video w-full'
}: Props) {
  const candidates = useMemo(() => coverFallbacks(src || ''), [src]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [src]);

  const showPlaceholder = !candidates.length || idx >= candidates.length;
  const current = !showPlaceholder ? candidates[idx] : '';

  if (showPlaceholder) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-accent-light to-surface2 text-5xl ${wrapperClassName}`}
      >
        📺
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-surface2 ${wrapperClassName}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current}
        src={current}
        alt={alt}
        className={className}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setIdx((i) => i + 1)}
      />
    </div>
  );
}
