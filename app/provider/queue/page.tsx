'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

type Entry = {
  id: number;
  ticket_number: number;
  customer_name: string;
  phone?: string | null;
  service_name?: string | null;
  status: 'WAITING' | 'SERVING' | 'DONE' | 'LEFT';
  created_at: string;
};

type Service = { id: number; name: string };

/** Walk-in queue: add people who turn up without a booking and call them in order. */
export default function WalkInQueuePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setEntries(await apiFetch<Entry[]>('/api/provider-tools/queue'));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not load the queue.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    apiFetch<Service[]>('/api/provider/services').then(setServices).catch(() => setServices([]));
    apiFetch<{ slug?: string }>('/api/provider/workspace').then((w) => setSlug(w?.slug || null)).catch(() => setSlug(null));
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void act(async () => {
      await apiFetch('/api/provider-tools/queue', {
        method: 'POST',
        body: JSON.stringify({ name, phone: phone || null, serviceId: serviceId ? Number(serviceId) : null }),
      });
      setName('');
      setPhone('');
    });
  };

  const waiting = entries.filter((e) => e.status === 'WAITING');
  const serving = entries.filter((e) => e.status === 'SERVING');
  const finished = entries.filter((e) => e.status === 'DONE' || e.status === 'LEFT');
  const setStatus = (id: number, status: string) =>
    act(() => apiFetch(`/api/provider-tools/queue/${id}/${status}`, { method: 'PUT' }));

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40, display: 'grid', gap: 16 }}>
      <PageHeader
        title="Walk-in queue"
        subtitle="For customers who turn up without a booking. Ticket numbers restart every day."
        actions={slug ? (
          <a className="btn btn-outline" href={`/q/${encodeURIComponent(slug)}`} target="_blank" rel="noreferrer">
            <i className="fa-solid fa-tv" /> Open queue screen
          </a>
        ) : undefined}
      />
      {error && <div className="error-alert">{error}</div>}

      <form onSubmit={add} className="card" style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="form-input" style={{ flex: '2 1 180px' }} required placeholder="Customer name" value={name}
          maxLength={120} onChange={(e) => setName(e.target.value)} aria-label="Customer name" />
        <input className="form-input" style={{ flex: '1 1 140px' }} placeholder="Phone (optional)" value={phone}
          onChange={(e) => setPhone(e.target.value)} aria-label="Phone" />
        {services.length > 0 && (
          <select className="form-input" style={{ flex: '1 1 160px' }} value={serviceId}
            onChange={(e) => setServiceId(e.target.value)} aria-label="Service">
            <option value="">Any service</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>Add to queue</button>
      </form>

      <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <strong>Now serving</strong>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || waiting.length === 0}
            onClick={() => void act(() => apiFetch('/api/provider-tools/queue/next', { method: 'POST' }))}>
            Call next{waiting.length ? ` (#${waiting[0].ticket_number})` : ''}
          </button>
        </div>
        {serving.length === 0 && <p style={{ margin: 0, color: 'var(--text-muted)' }}>Nobody is being served.</p>}
        {serving.map((e) => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span><strong>#{e.ticket_number}</strong> {e.customer_name}{e.service_name ? ` · ${e.service_name}` : ''}</span>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void setStatus(e.id, 'done')}>
              Done
            </button>
          </div>
        ))}
      </section>

      <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <strong>Waiting ({waiting.length})</strong>
        {waiting.length === 0 && <p style={{ margin: 0, color: 'var(--text-muted)' }}>The queue is empty.</p>}
        {waiting.map((e) => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>
              <strong>#{e.ticket_number}</strong> {e.customer_name}
              {e.service_name ? ` · ${e.service_name}` : ''}
              <span style={{ color: 'var(--text-muted)' }}>
                {' '}· waiting since {new Date(e.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            </span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void setStatus(e.id, 'serving')}>
                Serve
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void setStatus(e.id, 'left')}>
                Left
              </button>
            </span>
          </div>
        ))}
      </section>

      {finished.length > 0 && (
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Today: {finished.filter((e) => e.status === 'DONE').length} served, {finished.filter((e) => e.status === 'LEFT').length} left without service.
        </p>
      )}
    </div>
  );
}
