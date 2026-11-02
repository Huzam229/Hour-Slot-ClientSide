'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import type { OwnerPlan } from '@/lib/plan';

export default function SoloPlanPage() {
  const { format } = useOrgLocale();
  const [plan, setPlan] = useState<OwnerPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<OwnerPlan>('/api/provider/plan')
      .then(setPlan)
      .catch((e) => setError(e?.message || 'Failed to load plan.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton variant="card" height={200} />;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader
        title="Subscription"
        subtitle="Plan for your individual professional workspace — not a multi-location business plan."
      />
      {error && <div className="error-alert">{error}</div>}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>{plan?.planName || plan?.planCode || 'Starter'}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Status: {plan?.status || 'ACTIVE'}
          {plan?.price != null ? ` · ${format(plan.price)} / ${plan.billingInterval || 'month'}` : ''}
        </p>
        <ul style={{ margin: '16px 0 0', paddingLeft: 18, color: 'var(--text-secondary)' }}>
          <li>Service areas & home coverage</li>
          <li>Bookings, requests, quotes, and jobs</li>
          <li>Public solo profile & presence</li>
        </ul>
      </div>
    </div>
  );
}
