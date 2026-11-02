'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import Skeleton from '@/components/Skeleton';
import BarChart from '@/components/charts/BarChart';

type Report = {
  days: number;
  revenue: number;
  previousRevenue: number;
  collected: number;
  bookings: number;
  completed: number;
  cancelled: number;
  noShows: number;
  upcoming: number;
  noShowRate: number | null;
  averageBookingValue: number | null;
  customers: number;
  newCustomers: number;
  returningCustomers: number;
  daily: { day: string; bookings: number; revenue: number }[];
  byHour: { hour: number; bookings: number }[];
  byWeekday: { weekday: number; bookings: number }[];
  topServices: { service: string; bookings: number; revenue: number }[];
};

const PERIODS = [7, 30, 90, 365] as const;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const tile = { padding: 14, display: 'grid', gap: 4 } as const;

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card" style={tile}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
      <strong style={{ fontSize: '1.4rem' }}>{value}</strong>
      {note && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, var(--text-muted))' }}>{note}</span>}
    </div>
  );
}

/** Business report: money, bookings, no-shows, customers, busy times, top services. */
export default function InsightsReport() {
  const { format } = useOrgLocale();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (d: number) => {
    setError(null);
    try {
      setReport(await apiFetch<Report>(`/api/provider-tools/insights?days=${d}`));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not load your report.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(days);
  }, [days, load]);

  const change =
    report && Number(report.previousRevenue) > 0
      ? Math.round(((Number(report.revenue) - Number(report.previousRevenue)) / Number(report.previousRevenue)) * 100)
      : null;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Report period">
        {PERIODS.map((p) => (
          <button key={p} type="button" className={`btn btn-sm ${p === days ? 'btn-primary' : 'btn-outline'}`}
            aria-pressed={p === days} onClick={() => setDays(p)}>
            {p === 365 ? '12 months' : `${p} days`}
          </button>
        ))}
      </div>

      {error && <div className="error-alert">{error}</div>}
      {!report ? (
        <Skeleton variant="card" height={240} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <Tile label="Earned (completed work)" value={format(report.revenue)}
              note={change === null ? undefined : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% vs previous ${report.days} days`} />
            <Tile label="Money received" value={format(report.collected)} />
            <Tile label="Bookings" value={String(report.bookings)}
              note={`${report.completed} done · ${report.upcoming} upcoming · ${report.cancelled} cancelled`} />
            <Tile label="No-show rate" value={report.noShowRate == null ? '—' : `${report.noShowRate}%`}
              note={`${report.noShows} no-show${report.noShows === 1 ? '' : 's'}`} />
            <Tile label="Average job value" value={report.averageBookingValue == null ? '—' : format(report.averageBookingValue)} />
            <Tile label="Customers" value={String(report.customers)}
              note={`${report.returningCustomers} returning · ${report.newCustomers} new`} />
          </div>

          <section className="card" style={{ padding: 18 }}>
            <BarChart
              title="Earnings per day"
              labelEvery={report.daily.length > 31 ? 30 : report.daily.length > 14 ? 5 : 1}
              data={report.daily.map((d) => ({
                label: new Date(d.day + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
                value: Number(d.revenue),
                display: `${format(d.revenue)} · ${d.bookings} booking${Number(d.bookings) === 1 ? '' : 's'}`,
              }))}
            />
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            <section className="card" style={{ padding: 18 }}>
              <BarChart
                title="Busiest hours"
                labelEvery={3}
                data={report.byHour.map((h) => ({ label: `${String(h.hour).padStart(2, '0')}:00`, value: Number(h.bookings) }))}
              />
            </section>
            <section className="card" style={{ padding: 18 }}>
              <BarChart
                title="Busiest days"
                data={report.byWeekday.map((w) => ({ label: WEEKDAYS[w.weekday - 1], value: Number(w.bookings) }))}
              />
            </section>
          </div>

          <section className="card" style={{ padding: 18, display: 'grid', gap: 8 }}>
            <strong style={{ fontSize: '0.95rem' }}>Top services</strong>
            {report.topServices.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>No bookings in this period.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '4px 0', fontWeight: 500 }}>Service</th>
                    <th style={{ padding: '4px 0', fontWeight: 500, textAlign: 'right' }}>Bookings</th>
                    <th style={{ padding: '4px 0', fontWeight: 500, textAlign: 'right' }}>Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topServices.map((s) => (
                    <tr key={s.service} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px 0' }}>{s.service}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>{s.bookings}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>{format(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
