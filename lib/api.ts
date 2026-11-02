/**
 * Typed API fetch wrapper — session cookies are sent automatically; refreshes on 401.
 */

import type { ApiError } from './types';
import { currentReturnUrl, loginHref } from './auth-redirect';
import { clearSession, readSession } from './session-store';

let refreshPromise: Promise<boolean> | null = null;

/** The refresh token travels in an httpOnly cookie, so the body is empty. */
async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
  _retried?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: extraHeaders, _retried, ...rest } = options;

  const headers: Record<string, string> = {
    ...(extraHeaders as Record<string, string>),
  };

  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const hadSession = !skipAuth && !!readSession();

  const res = await fetch(path, { headers, ...rest });

  if (res.status === 401 && !skipAuth && !_retried) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
    clearSession();
    // Only redirect when a session expired — guests browsing without login stay on the page.
    if (hadSession && typeof window !== 'undefined') {
      const returnPath = currentReturnUrl();
      if (!returnPath.startsWith('/auth/')) {
        window.location.href = loginHref(returnPath);
      }
    }
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({
      message: res.statusText,
    }))) as ApiError;
    throw errBody;
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

/** Open a private, auth-protected file (e.g. a verification document) in a new tab. */
export async function openAuthedFile(path: string, _retried = false): Promise<void> {
  const win = window.open('', '_blank');
  const res = await fetch(path);
  if (res.status === 401 && !_retried && (await tryRefreshToken())) {
    win?.close();
    return openAuthedFile(path, true);
  }
  if (!res.ok) {
    win?.close();
    throw { message: 'Could not open the file.' } as ApiError;
  }
  const url = URL.createObjectURL(await res.blob());
  if (win) {
    win.location.href = url;
  } else {
    window.location.href = url;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
