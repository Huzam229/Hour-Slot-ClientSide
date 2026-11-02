/**
 * Client-side copy of the signed-in user's PROFILE (name, role, listing mode) for UI and route
 * hints only. Tokens are never stored here: the backend keeps them in httpOnly cookies, and every
 * request is authorised server-side.
 */

export const SESSION_KEY = 'duemet_user_session';

type Session = Record<string, unknown>;

function withoutTokens(session: Session): Session {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { token, refreshToken, type, ...profile } = session;
  return profile;
}

export function readSession(): Session | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return withoutTokens(JSON.parse(stored));
  } catch {
    // ignore
  }
  return null;
}

export function persistSession<T extends Session>(session: T): Session {
  const profile = withoutTokens(session);
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  } catch {
    // storage unavailable
  }
  document.cookie = `${SESSION_KEY}=${encodeURIComponent(JSON.stringify(profile))}; path=/; max-age=86400; SameSite=Lax`;
  return profile;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  document.cookie = `${SESSION_KEY}=; path=/; max-age=0`;
}
