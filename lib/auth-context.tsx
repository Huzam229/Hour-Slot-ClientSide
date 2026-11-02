'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { pushPresence } from '@/lib/provider-presence';
import { disablePush } from './push';
import { clearSession, persistSession as storeSession, readSession } from './session-store';

export interface UserSession {
  id: number;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  authorities: string[];
  listingMode?: string | null;
  providerType?: string | null;
  providerIntent?: string | null;
  onboardingState?: string | null;
  providerWorkspace?: boolean | null;
  isOnline?: boolean | null;
}

interface AuthContextValue {
  user: UserSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<UserSession>;
  /** Passwordless sign-in with the 6-digit code from POST /api/auth/email-code/request. */
  loginWithCode: (email: string, code: string) => Promise<UserSession>;
  register: (
    userData: Record<string, unknown>,
    documents?: { governmentId?: File | null; tradeLicense?: File | null }
  ) => Promise<void>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  updateSession: (patch: Partial<UserSession>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persistSession(session: UserSession) {
  storeSession(session as unknown as Record<string, unknown>);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readSession();
    if (stored) setUser(stored as unknown as UserSession);
    setLoading(false);
  }, []);

  const updateSession = useCallback((patch: Partial<UserSession>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      persistSession(next);
      return next;
    });
  }, []);

  const signIn = useCallback(async (endpoint: string, payload: Record<string, string>): Promise<UserSession> => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { error: err };
    }
    const session: UserSession = await res.json();
    persistSession(session);
    setUser(session);

    if (session.listingMode === 'INDIVIDUAL' || session.providerIntent === 'INDIVIDUAL') {
      void pushPresence(true, 'LOGIN').then((presence) => {
        if (presence?.isOnline != null) {
          const next = { ...session, isOnline: presence.isOnline };
          persistSession(next);
          setUser(next);
        }
      });
    }
    return session;
  }, []);

  const login = useCallback(
    (credentials: { email: string; password: string }) => signIn('/api/auth/login', credentials),
    [signIn]
  );

  const loginWithCode = useCallback(
    (email: string, code: string) => signIn('/api/auth/email-code/verify', { email, code }),
    [signIn]
  );

  const register = useCallback(async (
    userData: Record<string, unknown>,
    documents?: { governmentId?: File | null; tradeLicense?: File | null }
  ): Promise<void> => {
    const hasDocs = Boolean(documents?.governmentId || documents?.tradeLicense);
    let res: Response;
    if (hasDocs) {
      const body = new FormData();
      body.append('data', new Blob([JSON.stringify(userData)], { type: 'application/json' }));
      if (documents?.governmentId) body.append('governmentId', documents.governmentId);
      if (documents?.tradeLicense) body.append('tradeLicense', documents.tradeLicense);
      res = await fetch('/api/auth/register', { method: 'POST', body });
    } else {
      res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { error: err };
    }
  }, []);

  const logout = useCallback(() => {
    // Stop push on this device so the next person using it doesn't get this account's alerts.
    void disablePush();
    const listingMode = user?.listingMode;
    if (listingMode === 'INDIVIDUAL') {
      void pushPresence(false, 'LOGOUT');
    }
    // Revokes the refresh token and clears the httpOnly cookies server-side.
    void fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearSession();
    setUser(null);
  }, [user?.listingMode]);

  const hasRole = useCallback((roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      loginWithCode,
      register,
      logout,
      hasRole,
      updateSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
