/**
 * Browser push helpers. Push needs: HTTPS (or localhost), a service worker, the user's permission,
 * and on iPhone/iPad the site added to the home screen (iOS 16.4+).
 */
import { apiFetch } from './api';

export type PushState = 'unsupported' | 'needs-install' | 'disabled-on-server' | 'denied' | 'off' | 'on';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function isIos(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported';
  if (!('PushManager' in window) || !('Notification' in window)) {
    // iOS only exposes push to home-screen apps.
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  }
  const config = await apiFetch<{ enabled: boolean }>('/api/public/push/config', { skipAuth: true }).catch(() => null);
  if (!config?.enabled) return 'disabled-on-server';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

export async function enablePush(): Promise<PushState> {
  const config = await apiFetch<{ enabled: boolean; publicKey: string | null }>('/api/public/push/config', {
    skipAuth: true,
  });
  if (!config.enabled || !config.publicKey) return 'disabled-on-server';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = (await registerServiceWorker()) || (await navigator.serviceWorker.ready);
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    }));
  await apiFetch('/api/push/subscriptions', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
  return 'on';
}

/** Stop push on this device (also called on sign-out so the next person on it doesn't get alerts). */
export async function disablePush(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await apiFetch(`/api/push/subscriptions?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE' }).catch(
    () => undefined
  );
  await sub.unsubscribe().catch(() => undefined);
}
