'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOwnerPlan } from '@/lib/owner-plan-context';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import styles from './plan.module.css';

type PlanRow = {
  code: string;
  name: string;
  price: number;
  currency: string;
  billingInterval: string;
  current?: boolean;
  entitlements: Record<string, unknown>;
  features?: { copy?: string };
};

type PlansPayload = {
  current: { planCode: string; planName: string; usage: Record<string, number> };
  plans: PlanRow[];
  billingNote: string;
};

type UsagePayload = {
  period?: string;
  organizationId?: number;
  counters?: Record<string, number>;
};

const FEATURE_ROWS: { key: string; label: string; kind: 'bool' | 'int' }[] = [
  { key: 'max_branches', label: 'Branch locations limit', kind: 'int' },
  { key: 'max_staff', label: 'Staff member seats limit', kind: 'int' },
  { key: 'peak_pricing', label: 'Smart peak pricing', kind: 'bool' },
  { key: 'packages', label: 'Client session packages', kind: 'bool' },
  { key: 'waitlist', label: 'Automatic waitlist management', kind: 'bool' },
  { key: 'last_minute_deals', label: 'Last-minute deal scheduler', kind: 'bool' },
  { key: 'sms_monthly', label: 'Monthly notification SMS', kind: 'int' },
  { key: 'yield_dashboard', label: 'Executive yield dashboard', kind: 'bool' },
  { key: 'white_label', label: 'White-label custom booking page', kind: 'bool' },
  { key: 'home_service', label: 'Home / on-site services', kind: 'bool' },
  { key: 'max_service_areas', label: 'Service area limit', kind: 'int' },
  { key: 'max_quotes_monthly', label: 'Quotes per month', kind: 'int' },
];

function formatValue(kind: 'bool' | 'int', value: unknown) {
  if (kind === 'bool') {
    return value ? (
      <span className={styles.checkIcon}><i className="fa-solid fa-circle-check" /> Yes</span>
    ) : (
      <span className={styles.dashIcon}>—</span>
    );
  }
  const n = Number(value ?? 0);
  if (n >= 999) return 'Unlimited';
  return String(n);
}

export default function PlanPage() {
  const { refresh } = useOwnerPlan();
  const [payload, setPayload] = useState<PlansPayload | null>(null);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanRow | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<PlansPayload>('/api/business/plans'),
      apiFetch<UsagePayload>('/api/business/usage').catch(() => null),
    ])
      .then(([data, usageData]) => {
        setPayload(data);
        setUsage(usageData);
        void refresh();
      })
      .catch((err: { message?: string }) => setError(err?.message || 'Could not load plans.'))
      .finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="title" />
        <Skeleton variant="card" count={3} />
      </div>
    );
  }

  // Find active plan details
  const activePlan = payload?.plans.find((p) => p.current);
  const maxBranches = Number(activePlan?.entitlements?.max_branches ?? 1);
  const maxStaff = Number(activePlan?.entitlements?.max_staff ?? 3);
  const smsLimit = Number(activePlan?.entitlements?.sms_monthly ?? 0);

  const branchesUsed = payload?.current?.usage?.branches ?? 0;
  const staffUsed = payload?.current?.usage?.staff ?? 0;

  const branchPercent = maxBranches >= 999 ? 0 : Math.min(100, Math.round((branchesUsed / maxBranches) * 100));
  const staffPercent = maxStaff >= 999 ? 0 : Math.min(100, Math.round((staffUsed / maxStaff) * 100));

  return (
    <div className={styles.page}>
      <PageHeader
        title="Subscription plans"
        subtitle={`You are currently subscribed to the ${payload?.current?.planName || 'Starter'} plan. Upgrade to unlock more features, branches, and seats.`}
      />
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {/* Usage Analytics Meters */}
      {payload?.current?.usage && (
        <div className={`surface ${styles.usageDashboard}`}>
          <div className={styles.usageHeader}>
            <h4>Subscription Usage Tracker</h4>
            <span className={styles.activePlanBadge}>
              <i className="fa-solid fa-shield-halved" /> Current Plan: {payload.current.planName}
            </span>
          </div>
          
          <div className={styles.metersGrid}>
            <div className={styles.meterCard}>
              <div className={styles.meterMeta}>
                <span>Branch Locations</span>
                <strong>
                  {branchesUsed} / {maxBranches >= 999 ? 'Unlimited' : maxBranches}
                </strong>
              </div>
              {maxBranches < 999 ? (
                <div className={styles.progressTrack}>
                  <div className={styles.progressBar} style={{ width: `${branchPercent}%`, background: 'linear-gradient(90deg, #0f7676, #10b981)' }} />
                </div>
              ) : (
                <div className={styles.unlimitedBar} />
              )}
            </div>

            <div className={styles.meterCard}>
              <div className={styles.meterMeta}>
                <span>Staff Member Seats</span>
                <strong>
                  {staffUsed} / {maxStaff >= 999 ? 'Unlimited' : maxStaff}
                </strong>
              </div>
              {maxStaff < 999 ? (
                <div className={styles.progressTrack}>
                  <div className={styles.progressBar} style={{ width: `${staffPercent}%`, background: 'linear-gradient(90deg, #0f7676, #06b6d4)' }} />
                </div>
              ) : (
                <div className={styles.unlimitedBar} />
              )}
            </div>

            <div className={styles.meterCard}>
              <div className={styles.meterMeta}>
                <span>Monthly SMS Allocation</span>
                <strong>
                  0 / {smsLimit >= 999 ? 'Unlimited' : smsLimit}
                </strong>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressBar} style={{ width: '0%', background: 'linear-gradient(90deg, #0f7676, #6366f1)' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {usage?.counters && Object.keys(usage.counters).length > 0 && (
        <div className={`surface ${styles.usageDashboard}`}>
          <div className={styles.usageHeader}>
            <h4>Monthly usage counters</h4>
            <span className={styles.activePlanBadge}>
              <i className="fa-solid fa-calendar" /> Period: {usage.period || 'current month'}
            </span>
          </div>
          <div className={styles.metersGrid}>
            {Object.entries(usage.counters).map(([code, count]) => (
              <div className={styles.meterCard} key={code}>
                <div className={styles.meterMeta}>
                  <span>{code.replaceAll('_', ' ')}</span>
                  <strong>{count}</strong>
                </div>
                <div className={styles.unlimitedBar} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Cards List */}
      <div className={styles.cards}>
        {(payload?.plans || []).map((plan) => (
          <article key={plan.code} className={`surface ${styles.card} ${plan.current ? styles.currentCard : ''}`}>
            {plan.current && <div className={styles.activeRibbon}>Active Plan</div>}
            <header className={styles.cardHeader}>
              <h3>{plan.name}</h3>
            </header>
            <div className={styles.priceContainer}>
              {Number(plan.price) === 0 ? (
                <strong className={styles.priceAmount}>Free</strong>
              ) : (
                <>
                  <strong className={styles.priceAmount}>
                    {plan.currency} {Number(plan.price).toFixed(0)}
                  </strong>
                  <span className={styles.priceInterval}>/{(plan.billingInterval || 'MONTH').toLowerCase()}</span>
                </>
              )}
            </div>
            {plan.features?.copy ? (
              <p className={styles.copy}>{plan.features.copy}</p>
            ) : (
              <p className={styles.copy}>Configure your organization with premium tools.</p>
            )}

            {plan.current ? (
              <button type="button" className={`btn btn-secondary ${styles.ctaBtn}`} disabled>
                <i className="fa-solid fa-circle-check" /> Current Plan
              </button>
            ) : (
              <button
                type="button"
                className={`btn btn-primary ${styles.ctaBtn}`}
                onClick={() => setSelectedPlan(plan)}
              >
                Upgrade to {plan.name}
              </button>
            )}

            <ul className={styles.featuresList}>
              {FEATURE_ROWS.map((row) => (
                <li key={row.key} className={styles.featureItem}>
                  <span className={styles.featureLabel}>{row.label}</span>
                  <strong className={styles.featureValue}>{formatValue(row.kind, plan.entitlements?.[row.key])}</strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {payload?.billingNote && (
        <div className={`surface ${styles.billingNoteCard}`}>
          <i className="fa-solid fa-credit-card" />
          <p>{payload.billingNote}</p>
        </div>
      )}

      {/* Upgrade Checkout Modal */}
      <Modal
        open={selectedPlan !== null}
        title="Upgrade Subscription Plan"
        onClose={() => setSelectedPlan(null)}
        footer={
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setSelectedPlan(null)}>
              Close
            </button>
            <a href="mailto:support@hourslot.com?subject=Subscription Upgrade Request" className="btn btn-primary">
              <i className="fa-solid fa-envelope" /> Contact Sales
            </a>
          </div>
        }
      >
        <div className={styles.modalBody}>
          <div className={styles.modalIcon}>
            <i className="fa-solid fa-credit-card" />
          </div>
          <h4>Stripe Checkout Coming Soon</h4>
          <p>
            We are currently integrating Stripe payment gateways to support automated subscription checkout and monthly invoices.
          </p>
          <p>
            If you need headroom immediately to add more branches or staff seats to your <strong>{selectedPlan?.name}</strong> upgrade, please contact our support team at <strong>support@hourslot.com</strong> to expedite your plan update manually.
          </p>
        </div>
      </Modal>
    </div>
  );
}
