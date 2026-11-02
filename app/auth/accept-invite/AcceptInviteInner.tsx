'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import shared from '../auth-shared.module.css';
import styles from './accept-invite.module.css';

type Preview = {
  email: string;
  displayName: string;
  designation?: string;
  businessName: string;
  branchName: string;
};

export default function AcceptInviteInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', phoneNumber: '' });

  useEffect(() => {
    if (!token) {
      setError('Invite token is missing.');
      setLoading(false);
      return;
    }
    apiFetch<Preview>(`/api/auth/staff-invite?token=${encodeURIComponent(token)}`, { skipAuth: true })
      .then((data) => {
        setPreview(data);
        setForm((p) => ({ ...p, firstName: data.displayName?.split(' ')[0] || '' }));
      })
      .catch((err: { message?: string }) => setError(err?.message || 'Invite is invalid or expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/auth/staff-invite/accept', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ token, ...form }),
      });
      setMessage('Account created. You can sign in now.');
      setTimeout(() => router.push('/auth/login'), 1200);
    } catch (err: unknown) {
      const e2 = err as { message?: string };
      setError(e2?.message || 'Could not accept invite.');
    } finally {
      setSubmitting(false);
    }
  };

  if (message) {
    return (
      <div className={shared.authCard}>
        <div className={shared.successState}>
          <div className={shared.successIcon}>
            <i className="fa-solid fa-circle-check" />
          </div>
          <h2 className={shared.successTitle}>You&apos;re all set</h2>
          <p className={shared.successMessage}>{message}</p>
          <Link href="/auth/login" className={shared.submitBtn}>
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
          <i className="fa-solid fa-envelope-open-text" />
        </div>
        <h2 className={shared.authTitle}>Accept staff invite</h2>
        <p className={shared.authSubtitle}>Complete your profile to join your team on Duemet.</p>
      </div>

      {loading && (
        <div className={styles.loadingState}>
          <span className="spinner" /> Loading invite…
        </div>
      )}

      {error && (
        <div className={shared.alertError}>
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      )}

      {preview && !loading && (
        <>
          <div className={styles.inviteBanner}>
            <span className={styles.inviteBannerIcon}>
              <i className="fa-solid fa-building" />
            </span>
            <div>
              <p className={styles.inviteBannerTitle}>{preview.businessName}</p>
              <p className={styles.inviteBannerMeta}>
                Branch: {preview.branchName}
                <br />
                Role: {preview.displayName}
                {preview.designation ? ` · ${preview.designation}` : ''}
              </p>
            </div>
          </div>

          <div className={styles.inviteEmail}>
            <i className="fa-solid fa-at" />
            Sign-in email: <strong>{preview.email}</strong>
          </div>

          <form onSubmit={onSubmit} className={shared.authForm}>
            <div className={shared.row2}>
              <div className={shared.fieldGroup}>
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  className={shared.fieldInput}
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className={shared.fieldGroup}>
                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  className={shared.fieldInput}
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className={shared.fieldGroup}>
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                className={shared.fieldInput}
                value={form.phoneNumber}
                onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="+92 300 1234567"
              />
            </div>

            <div className={shared.fieldGroup}>
              <label htmlFor="password">Password</label>
              <div className={shared.passwordWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={shared.fieldInput}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
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

            <button type="submit" className={shared.submitBtn} disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" /> Creating account…
                </>
              ) : (
                'Accept invite'
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
