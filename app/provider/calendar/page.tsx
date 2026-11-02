'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';

type CalendarPayload = {
  bookings?: Array<{ id: number; bookingTime: string; status: string; service?: { name?: string } }>;
  jobs?: Array<{ id: number; status?: string; title?: string; scheduledAt?: string }>;
};

export default function SoloCalendarPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState<CalendarPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const last = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
    return { from, to };
  }, [month]);

  useEffect(() => {
    setLoading(true);
    apiFetch<CalendarPayload>(`/api/provider/ops/calendar?from=${range.from}&to=${range.to}`)
      .then(setData)
      .catch((e) => setError(e?.message || 'Failed to load calendar.'))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader
        title="Calendar"
        subtitle="Your solo schedule for the month."
        actions={
          <input
            type="month"
            className="form-input"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ width: 180 }}
          />
        }
      />
      {error && <div className="error-alert">{error}</div>}
      {loading ? (
        <Skeleton variant="card" height={200} />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {(data?.bookings || []).map((b) => (
            <article key={`b-${b.id}`} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{b.service?.name || 'Booking'}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {new Date(b.bookingTime).toLocaleString()}
                </div>
              </div>
              <StatusBadge status={b.status} />
            </article>
          ))}
          {(data?.jobs || []).map((j) => (
            <article key={`j-${j.id}`} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{j.title || `Job #${j.id}`}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {j.scheduledAt ? new Date(j.scheduledAt).toLocaleString() : 'Scheduled job'}
                </div>
              </div>
              <Link href={`/provider/jobs/${j.id}`}>
                <StatusBadge status={j.status || 'OPEN'} />
              </Link>
            </article>
          ))}
          {(data?.bookings || []).length === 0 && (data?.jobs || []).length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>Nothing scheduled in this month.</p>
          )}
        </div>
      )}
    </div>
  );
}
