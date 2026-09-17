'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import { formatMoney } from '@/lib/money';
import styles from '@/app/phase1.module.css';

type Payment = {
  id: number;
  purpose?: string;
  amount?: number;
  currency?: string;
  status?: string;
  provider?: string;
  createdAt?: string;
};

export default function ProviderPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Payment[]>('/api/provider/ops/payments')
      .then(setPayments)
      .catch((err: { message?: string }) => setError(err?.message || 'Could not load payments.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader title="Payments" subtitle="Recorded payments attached to this business." />
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}
      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : payments.length === 0 ? (
        <EmptyState icon="fa-wallet" title="No payments recorded" description="Booking and job payments will list here when they are captured." />
      ) : (
        <div className={styles.quoteList}>
          {payments.map((payment) => (
            <article className={styles.quoteCard} key={payment.id}>
              <div className={styles.cardHead}>
                <div>
                  <h3>{formatMoney(payment.amount ?? 0, payment.currency)}</h3>
                  <p className={styles.muted}>
                    {(payment.purpose || 'Payment').replaceAll('_', ' ')} · {payment.provider || 'venue'}
                  </p>
                </div>
                <StatusBadge status={payment.status} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
