'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import shared from '../auth-shared.module.css';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Verification link is missing a token.');
      setLoading(false);
      return;
    }
    apiFetch<{ message?: string }>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      skipAuth: true,
    })
      .then(() => setDone(true))
      .catch((err: unknown) => {
        const e = err as { message?: string };
        setError(e?.message || 'Verification link is invalid or expired.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className={shared.authCard} style={{ textAlign: 'center', padding: 40 }}>
        <span className="spinner" /> Verifying your email…
      </div>
    );
  }

  if (done) {
    return (
      <div className={shared.authCard}>
        <div className={shared.successState}>
          <div className={shared.successIcon}>
            <i className="fa-solid fa-circle-check" />
          </div>
          <h2 className={shared.successTitle}>Email verified</h2>
          <p className={shared.successMessage}>Your email address is confirmed. You can continue using Duemet.</p>
          <Link href="/profile/explore" className={shared.submitBtn}>
            Explore businesses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={shared.authCard}>
      <div className={shared.authHeader}>
        <div className={shared.authHeaderIcon}>
          <i className="fa-solid fa-envelope-circle-check" />
        </div>
        <h2 className={shared.authTitle}>Email verification</h2>
        <p className={shared.authSubtitle}>We could not verify your email.</p>
      </div>
      {error && (
        <div className={shared.alertError}>
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      )}
      <Link href="/auth/login" className={shared.backLink}>
        <i className="fa-solid fa-arrow-left" /> Back to login
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className={shared.authCard} style={{ textAlign: 'center', padding: 40 }}>
          Loading…
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
