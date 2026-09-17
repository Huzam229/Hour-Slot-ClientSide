'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import { StatCard, MetricGrid } from '@/components/StatCard';
import styles from '@/app/phase1.module.css';

type Analytics = {
  opsStatus?: string;
  bookingsThisMonth?: number;
  completedBookings?: number;
  jobsCompleted?: number;
  quotesSent?: number;
  openRequests?: number;
  rating?: number;
  reviewCount?: number;
};

export default function ProviderAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Analytics>('/api/provider/ops/analytics')
      .then(setData)
      .catch((err: { message?: string }) => setError(err?.message || 'Could not load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader title="Analytics" subtitle="Operational totals for this provider listing." />
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}
      {loading || !data ? (
        <Skeleton variant="card" height={220} />
      ) : (
        <MetricGrid>
          <StatCard label="Bookings this month" value={data.bookingsThisMonth ?? 0} icon="fa-calendar-days" />
          <StatCard label="Completed bookings" value={data.completedBookings ?? 0} icon="fa-circle-check" />
          <StatCard label="Jobs completed" value={data.jobsCompleted ?? 0} icon="fa-briefcase" />
          <StatCard label="Quotes sent" value={data.quotesSent ?? 0} icon="fa-file-invoice-dollar" />
          <StatCard label="Open requests" value={data.openRequests ?? 0} icon="fa-inbox" />
          <StatCard label="Rating" value={data.rating ? data.rating.toFixed(1) : '—'} hint={`${data.reviewCount ?? 0} reviews`} icon="fa-star" />
        </MetricGrid>
      )}
    </div>
  );
}
