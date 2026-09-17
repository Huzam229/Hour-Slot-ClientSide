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

type ServiceRequest = {
  id: number;
  title: string;
  description?: string;
  status?: string;
  urgency?: string;
  city?: string;
  region?: string;
  countryCode?: string;
  preferredDate?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function locationLabel(request: ServiceRequest) {
  return [request.city, request.region, request.countryCode].filter(Boolean).join(', ') || 'Location not set';
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await apiFetch<ServiceRequest[]>('/api/requests'));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load your service requests.');
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
        title="My requests"
        subtitle="Track quote requests you have sent to local providers."
        actions={
          <Link href="/profile/requests/new" className="btn btn-primary">
            <i className="fa-solid fa-plus" /> New request
          </Link>
        }
      />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : requests.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-file-lines"
            title="No service requests yet"
            description="Describe what you need and receive quotes from matching providers."
            actionLabel="Create request"
            onAction={() => {
              window.location.href = '/profile/requests/new';
            }}
          />
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {requests.map((request) => (
            <Link href={`/profile/requests/${request.id}`} className={styles.requestCard} key={request.id}>
              <div className={styles.cardHead}>
                <div>
                  <h3>{request.title}</h3>
                  <p className={styles.muted}>{locationLabel(request)}</p>
                </div>
                <StatusBadge status={request.status} />
              </div>
              {request.description && <p className={styles.requestExcerpt}>{request.description}</p>}
              <div className={styles.requestMeta}>
                <span>
                  <i className="fa-regular fa-calendar" /> {formatDate(request.preferredDate || request.createdAt)}
                </span>
                {request.urgency && request.urgency !== 'NORMAL' && (
                  <span className={styles.urgencyPill}>{request.urgency.replaceAll('_', ' ').toLowerCase()}</span>
                )}
                {(request.budgetMin != null || request.budgetMax != null) && (
                  <span>
                    Budget{' '}
                    {request.budgetMin != null && request.budgetMax != null
                      ? `${formatMoney(request.budgetMin, request.currency)} – ${formatMoney(request.budgetMax, request.currency)}`
                      : formatMoney(request.budgetMax ?? request.budgetMin ?? 0, request.currency)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
