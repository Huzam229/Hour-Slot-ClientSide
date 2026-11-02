'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';

type QuoteRow = {
  quote?: { id: number; status?: string; amount?: number; totalAmount?: number };
  request?: { title?: string; id?: number };
};

export default function SoloQuotesPage() {
  const { format } = useOrgLocale();
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<QuoteRow[]>('/api/provider/ops/quotes')
      .then(setRows)
      .catch((e) => setError(e?.message || 'Failed to load quotes.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader title="Quotes" subtitle="Quotes you have sent from service requests." />
      {error && <div className="error-alert">{error}</div>}
      {loading ? (
        <Skeleton variant="card" height={180} />
      ) : rows.length === 0 ? (
        <EmptyState icon="fa-file-invoice-dollar" title="No quotes yet" description="Quotes appear when you respond to customer requests." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((r, idx) => (
            <article key={r.quote?.id || idx} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{r.request?.title || `Quote #${r.quote?.id}`}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                  {format(r.quote?.totalAmount ?? r.quote?.amount ?? 0)}
                </div>
              </div>
              <StatusBadge status={r.quote?.status || 'DRAFT'} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
