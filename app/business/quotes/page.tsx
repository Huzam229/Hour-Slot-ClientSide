'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import { formatMoney } from '@/lib/money';
import styles from '@/app/phase1.module.css';

type Quote = {
  id: number;
  amount?: number;
  currency?: string;
  status?: string;
  description?: string;
  createdAt?: string;
};

type Request = {
  id?: number;
  title?: string;
};

export default function ProviderQuotesPage() {
  const [rows, setRows] = useState<{ quote: Quote; request?: Request }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ quote: Quote; request?: Request }[]>('/api/provider/ops/quotes')
      .then(setRows)
      .catch((err: { message?: string }) => setError(err?.message || 'Could not load quotes.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Quotes"
        subtitle="Quotes you have sent from matched requests."
        actions={
          <Link href="/business/requests" className="btn btn-outline">
            Request inbox
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
      ) : rows.length === 0 ? (
        <EmptyState icon="fa-file-invoice-dollar" title="No quotes yet" description="Accepted request invitations appear here after you send a quote." />
      ) : (
        <div className={styles.quoteList}>
          {rows.map(({ quote, request }) => (
            <article className={styles.quoteCard} key={quote.id}>
              <div className={styles.cardHead}>
                <div>
                  <h3>{formatMoney(quote.amount ?? 0, quote.currency)}</h3>
                  <p className={styles.muted}>{request?.title || `Request #${request?.id || quote.id}`}</p>
                </div>
                <StatusBadge status={quote.status} />
              </div>
              {quote.description && <p>{quote.description}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
