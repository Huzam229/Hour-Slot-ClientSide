'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function PageMotion({ children, className = '' }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className={['hs-page-enter', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
