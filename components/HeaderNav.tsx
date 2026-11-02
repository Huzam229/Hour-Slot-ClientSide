'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { loginHref, registerHref } from '@/lib/auth-redirect';

/**
 * Header navigation — client component that renders auth-aware buttons.
 */
export default function HeaderNav() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const returnUrl =
    typeof window !== 'undefined'
      ? `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      : pathname;

  const handleLogout = () => {
    logout();
    router.push('/profile/explore');
  };

  if (isAuthenticated && user) {
    const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

    return (
      <div className="auth-area">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-headers)',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            {initials}
          </div>
          <span className="auth-name" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
            {user.firstName}
          </span>
        </div>

        {(user.role === 'BUSINESS_OWNER' || user.role === 'BUSINESS_STAFF') && (
          <Link href="/business/dashboard" className="btn btn-secondary">
            Dashboard
          </Link>
        )}
        {user.role === 'SUPER_ADMIN' && (
          <Link href="/admin/dashboard" className="btn btn-secondary">
            Admin
          </Link>
        )}
        <button className="btn btn-outline" onClick={handleLogout} style={{ padding: '8px 18px' }}>
          Sign Out
        </button>
      </div>
    );
  }

  const loginUrl = loginHref(returnUrl);
  const registerUrl = registerHref(returnUrl, 'customer');

  return (
    <div className="auth-area">
      <Link href={loginUrl} className="btn btn-secondary">
        Sign In
      </Link>
      <Link href={registerUrl} className="btn btn-primary">
        Get Started
      </Link>
    </div>
  );
}
