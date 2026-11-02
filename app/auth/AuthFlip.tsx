'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './auth-flip.module.css';

type FlipDetail = { href: string; direction: 1 | -1 };

declare global {
  interface WindowEventMap {
    'auth-flip': CustomEvent<FlipDetail>;
  }
}

/** Dispatch a premium 3D flip, then navigate between login ↔ register. */
export function flipToAuth(href: string, direction: 1 | -1) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<FlipDetail>('auth-flip', { detail: { href, direction } })
  );
}

export function AuthFlipLink({
  href,
  direction,
  children,
  className,
}: {
  href: string;
  /** 1 = toward register, -1 = toward login */
  direction: 1 | -1;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        flipToAuth(href, direction);
      }}
    >
      {children}
    </a>
  );
}

export default function AuthFlipStage({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('enter');
  const [dir, setDir] = useState<1 | -1>(1);
  const isAuthGate =
    pathname === '/auth/login' || pathname === '/auth/register' || pathname?.startsWith('/auth/register');

  const onFlip = useCallback(
    (e: Event) => {
      const { href, direction } = (e as CustomEvent<FlipDetail>).detail;
      setDir(direction);
      setPhase('exit');
      window.setTimeout(() => {
        router.push(href);
      }, 420);
    },
    [router]
  );

  useEffect(() => {
    window.addEventListener('auth-flip', onFlip as EventListener);
    return () => window.removeEventListener('auth-flip', onFlip as EventListener);
  }, [onFlip]);

  useEffect(() => {
    setPhase('enter');
    const t = window.setTimeout(() => setPhase('idle'), 560);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (!isAuthGate) {
    return <>{children}</>;
  }

  return (
    <div className={styles.stage} style={{ ['--flip-dir' as string]: dir }}>
      <div
        className={`${styles.face} ${phase === 'exit' ? styles.exit : ''} ${phase === 'enter' ? styles.enter : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
