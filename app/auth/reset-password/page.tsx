'use client';

import { FormEvent, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { loginHref, safeReturnUrl } from '@/lib/auth-redirect';
import shared from '../auth-shared.module.css';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnUrl = searchParams.get('returnUrl');
  const loginLink = returnUrl
    ? loginHref(safeReturnUrl(returnUrl, '/profile/explore'))
    : '/auth/login';
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('Reset token is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ token, newPassword: password }),
      });
      setDone(true);
      setTimeout(() => router.push(loginLink), 1500);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className={shared.authCard}>
        <div className={shared.successState}>
          <div className={shared.successIcon}>
            <i className="fa-solid fa-circle-check" />
          </div>
          <h2 className={shared.successTitle}>Password updated</h2>
          <p className={shared.successMessage}>Redirecting you to sign in…</p>
          <Link href={loginLink} className={shared.submitBtn}>
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={shared.authCard}>
      <div className={shared.authHeader}>
        <div className={shared.authHeaderIcon}>
          <i className="fa-solid fa-key" />
        </div>
        <h2 className={shared.authTitle}>Reset password</h2>
        <p className={shared.authSubtitle}>Choose a new password for your Duemet account.</p>
      </div>

      {error && (
        <div className={shared.alertError}>
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={shared.authForm}>
        <div className={shared.fieldGroup}>
          <label htmlFor="reset-token">Reset token</label>
          <input
            id="reset-token"
            className={shared.fieldInput}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste token from email"
          />
        </div>

        <div className={shared.fieldGroup}>
          <label htmlFor="reset-pass">New password</label>
          <div className={shared.passwordWrap}>
            <input
              id="reset-pass"
              type={showPassword ? 'text' : 'password'}
              className={shared.fieldInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Min 6 characters"
            />
            <button
              type="button"
              className={shared.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
        </div>

        <div className={shared.fieldGroup}>
          <label htmlFor="reset-confirm">Confirm password</label>
          <input
            id="reset-confirm"
            type="password"
            className={shared.fieldInput}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="Repeat your password"
          />
        </div>

        <button type="submit" className={shared.submitBtn} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> Saving…
            </>
          ) : (
            'Update password'
          )}
        </button>
      </form>

      <Link href={loginLink} className={shared.backLink}>
        <i className="fa-solid fa-arrow-left" /> Back to login
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className={shared.authCard} style={{ textAlign: 'center', padding: 40 }}>
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
