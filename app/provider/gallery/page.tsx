'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';

type Profile = {
  business?: { galleryUrls?: string; name?: string };
};

export default function SoloGalleryPage() {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await apiFetch<Profile>('/api/provider/profile');
      const raw = profile.business?.galleryUrls || '';
      setUrls(raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Failed to load gallery.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      await apiFetch('/api/provider/media/upload', { method: 'POST', body });
      setMessage('Image added.');
      await load();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (url: string) => {
    await apiFetch(`/api/provider/media/gallery?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
    await load();
  };

  if (loading) return <Skeleton variant="card" height={220} />;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader title="Gallery" subtitle="Photos for your public solo profile." />
      {message && <div className="success-alert" style={{ marginBottom: 14 }}>{message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <input type="file" accept="image/*" disabled={busy} onChange={(e) => void upload(e.target.files?.[0] || null)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
        {urls.map((url) => (
          <div key={url} className="card" style={{ overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
            <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={() => void remove(url)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      {urls.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No gallery images yet.</p>}
    </div>
  );
}
