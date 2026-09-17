'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import CalendarView, { CalendarEvent } from '@/components/CalendarView';
import styles from '@/app/phase1.module.css';

type Booking = { id: number; bookingTime?: string; publicCode?: string; status?: string };
type Job = { id: number; scheduledStart?: string; title?: string; status?: string };

export default function ProviderCalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => {
    setLoading(true);
    apiFetch<{ bookings?: Booking[]; jobs?: Job[] }>(`/api/provider/ops/calendar?from=${from}`)
      .then((data) => {
        setBookings(data.bookings || []);
        setJobs(data.jobs || []);
      })
      .catch((err: { message?: string }) => setError(err?.message || 'Could not load calendar.'))
      .finally(() => setLoading(false));
  }, [from]);

  const events = useMemo<CalendarEvent[]>(() => {
    const rows: CalendarEvent[] = [];
    for (const booking of bookings) {
      if (!booking.bookingTime) continue;
      rows.push({
        id: `b-${booking.id}`,
        date: booking.bookingTime.slice(0, 10),
        title: booking.publicCode || `Booking #${booking.id}`,
        time: booking.bookingTime.slice(11, 16),
      });
    }
    for (const job of jobs) {
      if (!job.scheduledStart) continue;
      rows.push({
        id: `j-${job.id}`,
        date: job.scheduledStart.slice(0, 10),
        title: job.title || `Job #${job.id}`,
        time: job.scheduledStart.slice(11, 16),
      });
    }
    return rows;
  }, [bookings, jobs]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Calendar"
        subtitle="Bookings and jobs for this month."
        actions={
          <Link href="/business/bookings" className="btn btn-outline">
            Bookings list
          </Link>
        }
      />
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}
      {loading ? (
        <Skeleton variant="card" height={360} />
      ) : events.length === 0 ? (
        <EmptyState icon="fa-calendar" title="Nothing scheduled" description="Confirmed bookings and jobs will appear here." />
      ) : (
        <CalendarView month={month} events={events} onMonthChange={setMonth} />
      )}
    </div>
  );
}
