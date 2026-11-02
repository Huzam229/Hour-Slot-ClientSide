'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';

type Policy = {
  freeCancelHours: number;
  lateCancelFeePercent: number;
  noShowFeePercent: number;
  prepayAfterNoShows: number;
  policyText?: string | null;
};

type OwedFee = {
  bookingId: number;
  kind: string;
  feeAmount: number;
  createdAt: string;
};

const card = { padding: 18, marginBottom: 18, display: 'grid', gap: 12 } as const;
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } as const;
const label = { display: 'grid', gap: 4, fontSize: '0.85rem' } as const;

/**
 * Provider booking settings: cancellation / no-show policy, fees owed, calendar sync and a
 * shareable booking link with QR code. `bookingUrl` is the public page customers book from.
 */
export default function BookingTools({ bookingUrl }: { bookingUrl: string | null }) {
  const { format } = useOrgLocale();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [fees, setFees] = useState<OwedFee[]>([]);
  const [feed, setFeed] = useState<{ url: string; webcalUrl: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, f] = await Promise.all([
        apiFetch<Policy>('/api/provider-tools/policy'),
        apiFetch<OwedFee[]>('/api/provider-tools/fees'),
      ]);
      setPolicy(p);
      setFees(f || []);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load booking settings.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!bookingUrl) return;
    QRCode.toDataURL(bookingUrl, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [bookingUrl]);

  const run = async (fn: () => Promise<void>, success: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      setMessage(success);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const savePolicy = (e: FormEvent) => {
    e.preventDefault();
    if (!policy) return;
    void run(async () => {
      setPolicy(await apiFetch<Policy>('/api/provider-tools/policy', { method: 'PUT', body: JSON.stringify(policy) }));
    }, 'Policy saved. Customers see it before they book.');
  };

  const set = (patch: Partial<Policy>) => setPolicy((p) => (p ? { ...p, ...patch } : p));

  const copy = (text: string, what: string) => {
    void navigator.clipboard?.writeText(text).then(() => setMessage(`${what} copied.`));
  };

  return (
    <>
      {message && <div className="success-alert" style={{ marginBottom: 14 }}><i className="fa-solid fa-circle-check" /> {message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: 14 }}>{error}</div>}

      {bookingUrl && (
        <section className="card" style={card}>
          <strong>Your booking link</strong>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Share it on WhatsApp, Instagram or Facebook, or print the QR code for your shop or van.
          </p>
          <code style={{ wordBreak: 'break-all' }}>{bookingUrl}</code>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => copy(bookingUrl, 'Link')}>
              <i className="fa-solid fa-copy" /> Copy link
            </button>
            <a
              className="btn btn-outline btn-sm"
              href={`https://wa.me/?text=${encodeURIComponent(`Book me on Duemet: ${bookingUrl}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <i className="fa-brands fa-whatsapp" /> Share on WhatsApp
            </a>
            {qr && (
              <a className="btn btn-outline btn-sm" href={qr} download="duemet-booking-qr.png">
                <i className="fa-solid fa-qrcode" /> Download QR
              </a>
            )}
          </div>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code for your booking link" width={180} height={180} />
          )}
        </section>
      )}

      {policy && (
        <form className="card" style={card} onSubmit={savePolicy}>
          <strong>Cancellation &amp; no-show policy</strong>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Fees are recorded as owed — collect them at the next visit. Nothing is charged automatically.
          </p>
          <div style={grid}>
            <label style={label}>
              Free cancellation until (hours before)
              <input className="form-input" type="number" min={0} max={168} value={policy.freeCancelHours}
                onChange={(e) => set({ freeCancelHours: Number(e.target.value) })} />
            </label>
            <label style={label}>
              Late-cancellation fee (%)
              <input className="form-input" type="number" min={0} max={100} value={policy.lateCancelFeePercent}
                onChange={(e) => set({ lateCancelFeePercent: Number(e.target.value) })} />
            </label>
            <label style={label}>
              No-show fee (%)
              <input className="form-input" type="number" min={0} max={100} value={policy.noShowFeePercent}
                onChange={(e) => set({ noShowFeePercent: Number(e.target.value) })} />
            </label>
            <label style={label}>
              Require online prepayment after N no-shows (0 = never)
              <input className="form-input" type="number" min={0} max={10} value={policy.prepayAfterNoShows}
                onChange={(e) => set({ prepayAfterNoShows: Number(e.target.value) })} />
            </label>
          </div>
          <label style={label}>
            Policy shown to customers (optional)
            <textarea className="form-input" rows={3} maxLength={2000} value={policy.policyText || ''}
              placeholder="e.g. Please cancel at least 24 hours ahead. Late cancellations are charged 50%."
              onChange={(e) => set({ policyText: e.target.value })} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>Save policy</button>
        </form>
      )}

      <section className="card" style={card}>
        <strong>Fees owed</strong>
        {fees.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>No open late-cancellation or no-show fees.</p>
        ) : (
          fees.map((f) => (
            <div key={f.bookingId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span>
                Booking #{f.bookingId} · {f.kind === 'NO_SHOW' ? 'No-show' : 'Late cancellation'} ·{' '}
                <strong>{format(f.feeAmount)}</strong>
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                {(['collected', 'waived'] as const).map((action) => (
                  <button key={action} type="button" className="btn btn-outline btn-sm" disabled={saving}
                    onClick={() => void run(async () => {
                      await apiFetch(`/api/provider-tools/fees/${f.bookingId}/${action}`, { method: 'POST' });
                      await load();
                    }, action === 'collected' ? 'Marked as collected.' : 'Fee waived.')}>
                    {action === 'collected' ? 'Collected' : 'Waive'}
                  </button>
                ))}
              </span>
            </div>
          ))
        )}
      </section>

      <section className="card" style={card}>
        <strong>Sync to your phone calendar</strong>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          Add your bookings to Google Calendar, Outlook or Apple Calendar. It updates automatically (every few hours,
          depending on the calendar app). Keep this link private.
        </p>
        {feed ? (
          <>
            <code style={{ wordBreak: 'break-all' }}>{feed.url}</code>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => copy(feed.url, 'Calendar link')}>
                <i className="fa-solid fa-copy" /> Copy link
              </button>
              <a className="btn btn-outline btn-sm" href={feed.webcalUrl}>
                <i className="fa-solid fa-calendar-plus" /> Open in calendar app
              </a>
              <a className="btn btn-outline btn-sm" target="_blank" rel="noreferrer"
                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed.webcalUrl)}`}>
                <i className="fa-brands fa-google" /> Add to Google Calendar
              </a>
              <button type="button" className="btn btn-ghost btn-sm" disabled={saving}
                onClick={() => {
                  if (!window.confirm('Make a new link? The old one will stop working in calendars that use it.')) return;
                  void run(async () => {
                    setFeed(await apiFetch('/api/provider-tools/calendar-feed/rotate', { method: 'POST' }));
                  }, 'New calendar link created.');
                }}>
                Reset link
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" disabled={saving}
            onClick={() => void run(async () => {
              setFeed(await apiFetch('/api/provider-tools/calendar-feed'));
            }, 'Calendar link ready.')}>
            Get calendar link
          </button>
        )}
      </section>
    </>
  );
}
