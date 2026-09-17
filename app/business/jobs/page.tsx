'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import { formatMoney } from '@/lib/money';
import styles from '@/app/phase1.module.css';

type Job = {
  id: number;
  title?: string;
  description?: string;
  status?: string;
  estimatedAmount?: number;
  finalAmount?: number;
  currency?: string;
  scheduledStart?: string;
  createdAt?: string;
};

type JobsResponse = {
  jobs?: Job[];
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProviderJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<JobsResponse | Job[]>('/api/jobs?role=provider');
      setJobs(Array.isArray(data) ? data : data.jobs || []);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load provider jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Jobs"
        subtitle="Manage active service jobs and update their lifecycle status."
      />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : jobs.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-briefcase"
            title="No jobs yet"
            description="Accepted request bookings will appear here as jobs you can progress on site."
          />
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {jobs.map((job) => (
            <Link href={`/business/jobs/${job.id}`} className={styles.requestCard} key={job.id}>
              <div className={styles.cardHead}>
                <div>
                  <h3>{job.title || `Job #${job.id}`}</h3>
                  <p className={styles.muted}>Scheduled {formatDate(job.scheduledStart || job.createdAt)}</p>
                </div>
                <StatusBadge status={job.status} />
              </div>
              {job.description && <p className={styles.requestExcerpt}>{job.description}</p>}
              <div className={styles.requestMeta}>
                {(job.finalAmount != null || job.estimatedAmount != null) && (
                  <span>{formatMoney(job.finalAmount ?? job.estimatedAmount ?? 0, job.currency)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
