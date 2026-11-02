'use client';

import { apiFetch } from '@/lib/api';

export type PresenceSnapshot = {
  isOnline?: boolean;
  lastSeenAt?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  presenceSource?: string;
  opsStatus?: string;
};

function readCoords(): Promise<{ latitude?: number; longitude?: number }> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  });
}

export async function pushPresence(online: boolean, source: string): Promise<PresenceSnapshot | null> {
  try {
    const coords = online ? await readCoords() : {};
    return await apiFetch<PresenceSnapshot>('/api/provider/presence', {
      method: 'POST',
      body: JSON.stringify({
        online,
        latitude: coords.latitude ?? null,
        longitude: coords.longitude ?? null,
        source,
      }),
    });
  } catch {
    return null;
  }
}

export async function fetchPresence(): Promise<PresenceSnapshot | null> {
  try {
    return await apiFetch<PresenceSnapshot>('/api/provider/presence');
  } catch {
    return null;
  }
}
