'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';

type Payment = {
  id: number;
  amount?: number;
  status?: string;
  createdAt?: string;
  providerPaymentId?: string;
};

export default function SoloPaymentsPage() {
  const { format } = useOrgLocale();
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Payment[]>('/api/provider/ops/payments')
      .then(setRows)
      .catch((e) => setError(e?.message || 'Failed to load payments.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader title="Payments" subtitle="Payments tied to your solo bookings." />
      {error && <div className="error-alert">{error}</div>}
      {loading ? (
        <Skeleton variant="card" height={180} />
      ) : rows.length === 0 ? (
        <EmptyState icon="fa-wallet" title="No payments yet" description="Paid bookings will show up here." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((p) => (
            <article key={p.id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{format(p.amount ?? 0)}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                  {p.createdAt ? new Date(p.createdAt).toLocaleString() : 'Payment'}
                  {p.providerPaymentId ? ` · ${p.providerPaymentId}` : ''}
                </div>
              </div>
              <StatusBadge status={p.status || 'PENDING'} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
