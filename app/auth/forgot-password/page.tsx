'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import shared from '../auth-shared.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailError =
    touched && !email
      ? 'Email is required.'
      : touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? 'Please enter a valid email.'
        : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (emailError || !email) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      await apiFetch<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e?.message || 'Could not start password reset.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={shared.authCard}>
        <div className={shared.successState}>
          <div className={shared.successIcon}>
            <i className="fa-solid fa-paper-plane" />
          </div>
          <h2 className={shared.successTitle}>Check your inbox</h2>
          <p className={shared.successMessage}>
            If an account exists for <strong>{email}</strong>, a password reset link has been sent.
            Check your email (and spam folder) when SMTP is configured.
          </p>
          <Link href="/auth/login" className={shared.secondaryBtn}>
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={shared.authCard}>
      <div className={shared.authHeader}>
        <div className={shared.authHeaderIcon}>
          <i className="fa-solid fa-lock" />
        </div>
        <h2 className={shared.authTitle}>Forgot password?</h2>
        <p className={shared.authSubtitle}>
          Enter your email and we&apos;ll send instructions to reset your Duemet password.
        </p>
      </div>

      {errorMessage && (
        <div className={shared.alertError}>
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={shared.authForm} noValidate>
        <div className={shared.fieldGroup}>
          <label htmlFor="forgot-email">Email address</label>
          <input
            id="forgot-email"
            type="email"
            className={`${shared.fieldInput}${emailError ? ` ${shared.fieldInputError}` : ''}`}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            autoComplete="email"
          />
          {emailError && <span className={shared.fieldError}>{emailError}</span>}
        </div>

        <button type="submit" className={shared.submitBtn} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> Sending…
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <Link href="/auth/login" className={shared.backLink}>
        <i className="fa-solid fa-arrow-left" /> Back to login
      </Link>
    </div>
  );
}
