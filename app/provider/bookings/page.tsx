'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';

type Person = { firstName?: string; lastName?: string; email?: string };

type Booking = {
  id: number;
  bookingTime: string;
  status: string;
  price?: number;
  service?: { name?: string };
  customer?: Person & { user?: Person };
};

type Reliability = {
  score: number | null;
  completed: number;
  noShows: number;
  lateCancels: number;
  cancels: number;
};

export default function SoloBookingsPage() {
  const { format } = useOrgLocale();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [records, setRecords] = useState<Record<number, Reliability>>({});
  // Fixed at page load; refreshed with the list after each action.
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Booking[]>('/api/provider/ops/bookings');
      setBookings(data);
      setNow(Date.now());
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const nameOf = (b: Booking) => {
    const u: Person | undefined = b.customer?.user || b.customer;
    return `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || 'Customer';
  };

  const setStatus = async (b: Booking, status: 'CANCELLED' | 'NO_SHOW') => {
    const prompt =
      status === 'NO_SHOW'
        ? 'Mark this customer as a no-show? Any no-show fee in your policy will be recorded as owed.'
        : 'Cancel this booking? The customer will be notified and anyone on the waitlist is told the slot is free.';
    if (!window.confirm(prompt)) return;
    setBusyId(b.id);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/bookings/${b.id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      setMessage(status === 'NO_SHOW' ? 'Marked as no-show.' : 'Booking cancelled.');
      await load();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not update the booking.');
    } finally {
      setBusyId(null);
    }
  };

  const showRecord = async (b: Booking) => {
    try {
      const r = await apiFetch<Reliability>(`/api/bookings/${b.id}/customer-reliability`);
      setRecords((prev) => ({ ...prev, [b.id]: r }));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not load the customer record.');
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader
        title="Bookings"
        subtitle="Appointments booked with you — not a multi-branch schedule."
        actions={
          <Link href="/provider/calendar" className="btn btn-secondary">
            Calendar
          </Link>
        }
      />
      {message && <div className="success-alert"><i className="fa-solid fa-circle-check" /> {message}</div>}
      {error && <div className="error-alert">{error}</div>}
      {loading ? (
        <Skeleton variant="card" height={200} />
      ) : bookings.length === 0 ? (
        <EmptyState icon="fa-calendar-check" title="No bookings yet" description="When customers book your services, they will appear here." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {bookings.map((b) => {
            const active = b.status === 'CONFIRMED' || b.status === 'PENDING';
            const started = new Date(b.bookingTime).getTime() <= now;
            const record = records[b.id];
            return (
              <article key={b.id} className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div>
                    <strong>{b.service?.name || 'Service'}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                      {nameOf(b)} · {new Date(b.bookingTime).toLocaleString()}
                      {b.price != null ? ` · ${format(b.price)}` : ''}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {!record && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void showRecord(b)}>
                      Customer track record
                    </button>
                  )}
                  {active && started && (
                    <button type="button" className="btn btn-outline btn-sm" disabled={busyId === b.id}
                      onClick={() => void setStatus(b, 'NO_SHOW')}>
                      Mark no-show
                    </button>
                  )}
                  {active && !started && (
                    <button type="button" className="btn btn-outline btn-sm" disabled={busyId === b.id}
                      onClick={() => void setStatus(b, 'CANCELLED')}>
                      Cancel
                    </button>
                  )}
                </div>
                {record && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {record.score == null
                      ? 'New customer — no history yet.'
                      : `Shows up ${record.score}% of the time`}{' '}
                    · {record.completed} completed · {record.noShows} no-shows · {record.lateCancels} late cancellations
                    (last 12 months)
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
