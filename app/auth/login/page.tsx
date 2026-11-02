'use client';

import { useState, FormEvent, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { destinationAfterAuth } from '@/lib/auth-redirect';
import { AuthFlipLink } from '../AuthFlip';
import shared from '../auth-shared.module.css';

function LoginForm() {
  const { login, loginWithCode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const registered = searchParams.get('registered') === '1';
  const emailFromQuery = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Email code is the default: no password to remember. Password sign-in stays available.
  // After signup, prefer password so they can use the password they just chose.
  const [mode, setMode] = useState<'code' | 'password'>(registered ? 'password' : 'code');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(
    registered ? 'Account created. Sign in to continue.' : null
  );

  useEffect(() => {
    if (emailFromQuery && !email) setEmail(emailFromQuery);
  }, [emailFromQuery, email]);

  const returnUrlRaw = searchParams.get('returnUrl');
  const isBookingReturn = Boolean(returnUrlRaw?.includes('/profile/book/'));

  const emailError =
    touched.email && !email
      ? 'Email is required.'
      : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? 'Please enter a valid email.'
        : null;
  const passwordError =
    touched.password && !password
      ? 'Password is required.'
      : touched.password && password.length < 6
        ? 'Password must be at least 6 characters.'
        : null;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const sendCode = async () => {
    setTouched((t) => ({ ...t, email: true }));
    if (!emailValid) return;
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      const res = await fetch('/api/auth/email-code/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw { message: body?.message };
      setCodeSent(true);
      setCode('');
      setInfoMessage(`We sent a 6-digit code to ${email}. Check your inbox (and spam folder).`);
    } catch (err: unknown) {
      setErrorMessage((err as { message?: string })?.message || 'Could not send the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'code' && !codeSent) {
      await sendCode();
      return;
    }
    if (mode === 'code') {
      if (!/^\d{6}$/.test(code.trim())) {
        setErrorMessage('Enter the 6-digit code from the email.');
        return;
      }
    } else {
      setTouched({ email: true, password: true });
      if (emailError || passwordError || !email || !password) return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const session = mode === 'code' ? await loginWithCode(email, code.trim()) : await login({ email, password });
      router.push(destinationAfterAuth(session.role, searchParams.get('returnUrl'), {
        listingMode: session.listingMode,
        providerIntent: session.providerIntent,
        onboardingState: session.onboardingState,
        providerWorkspace: session.providerWorkspace,
      }));
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string };
      setErrorMessage(e?.error?.message || e?.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className={shared.authCard}>
      <div className={shared.authHeader}>
        <div className={shared.authHeaderIcon}>
          <i className={`fa-solid ${isBookingReturn ? 'fa-calendar-check' : registered ? 'fa-circle-check' : 'fa-right-to-bracket'}`} />
        </div>
        <h2 className={shared.authTitle}>
          {isBookingReturn ? 'Complete your booking' : registered ? 'Account created' : 'Welcome back'}
        </h2>
        <p className={shared.authSubtitle}>
          {isBookingReturn
            ? 'Sign in to confirm your appointment. Your selections are saved.'
            : registered
              ? 'Sign in with the email and password you just created to open your workspace.'
              : 'Sign in to pick up where you left off — bookings, clients, and your calendar.'}
        </p>
      </div>

      {registered && !errorMessage && (
        <div className={shared.contextBanner}>
          <i className="fa-solid fa-circle-check" />
          <div>
            <strong>You&apos;re almost in</strong>
            Account created. Sign in to continue.
          </div>
        </div>
      )}

      {isBookingReturn && (
        <div className={shared.contextBanner}>
          <i className="fa-solid fa-circle-info" />
          <div>
            <strong>Almost there</strong>
            After signing in you&apos;ll return to checkout to confirm your booking.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className={shared.alertError}>
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{errorMessage}</span>
        </div>
      )}
      {infoMessage && !errorMessage && !registered && (
        <div className={shared.contextBanner}>
          <i className="fa-solid fa-envelope" />
          <div>{infoMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={shared.authForm} noValidate>
        <div className={shared.fieldGroup}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            className={`${shared.fieldInput}${emailError ? ` ${shared.fieldInputError}` : ''}`}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            autoComplete="email"
            disabled={mode === 'code' && codeSent}
          />
          {emailError && <span className={shared.fieldError}>{emailError}</span>}
        </div>

        {mode === 'code' && codeSent && (
          <div className={shared.fieldGroup}>
            <label htmlFor="login-code">6-digit code</label>
            <input
              id="login-code"
              className={shared.fieldInput}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
            <div className={shared.formMeta}>
              <button
                type="button"
                className={shared.forgotLink}
                onClick={() => {
                  setCodeSent(false);
                  setInfoMessage(null);
                }}
              >
                Use a different email
              </button>
              <button type="button" className={shared.forgotLink} onClick={() => void sendCode()} disabled={loading}>
                Resend code
              </button>
            </div>
          </div>
        )}

        {mode === 'password' && (
        <div className={shared.fieldGroup}>
          <label htmlFor="login-password">Password</label>
          <div className={shared.passwordWrap}>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className={`${shared.fieldInput}${passwordError ? ` ${shared.fieldInputError}` : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete="current-password"
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
          {passwordError && <span className={shared.fieldError}>{passwordError}</span>}
        </div>
        )}

        <div className={shared.formMeta}>
          <button
            type="button"
            className={shared.forgotLink}
            onClick={() => {
              setMode(mode === 'code' ? 'password' : 'code');
              setErrorMessage(null);
              setInfoMessage(null);
              setCodeSent(false);
            }}
          >
            {mode === 'code' ? 'Use password instead' : 'Email me a sign-in code instead'}
          </button>
          {mode === 'password' && (
            <Link href="/auth/forgot-password" className={shared.forgotLink}>
              Forgot password?
            </Link>
          )}
        </div>

        <button type="submit" className={shared.submitBtn} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> {mode === 'code' && !codeSent ? 'Sending code…' : 'Signing in…'}
            </>
          ) : mode === 'code' && !codeSent ? (
            'Email me a code'
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className={shared.authFooter}>
        <p>
          Don&apos;t have an account?{' '}
          <AuthFlipLink
            href={
              searchParams.get('returnUrl')
                ? `/auth/register?role=customer&returnUrl=${encodeURIComponent(searchParams.get('returnUrl') || '')}`
                : '/auth/register'
            }
            direction={1}
          >
            Create one
          </AuthFlipLink>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className={shared.authCard} style={{ textAlign: 'center', padding: 40 }}>
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
