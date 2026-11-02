'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fetchPresence, pushPresence } from '@/lib/provider-presence';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import AppAccessCard from '@/components/AppAccessCard';
import styles from './dashboard.module.css';

type Checklist = {
  profile?: boolean;
  serviceAreas?: boolean;
  services?: boolean;
  verification?: boolean;
  published?: boolean;
};

type Workspace = {
  name?: string;
  slug?: string;
  status?: string;
  publishStatus?: string;
  onboardingState?: string;
  opsStatus?: string;
  isOnline?: boolean;
  availableNow?: boolean;
  availableNowUntil?: string | null;
  serviceMode?: string;
  checklist?: Checklist;
  checklistComplete?: number;
  checklistTotal?: number;
};

type TodayPayload = {
  bookings?: Array<{
    id: number;
    bookingTime: string;
    status: string;
    service?: { name?: string };
    customer?: { user?: { firstName?: string; lastName?: string }; firstName?: string; lastName?: string };
  }>;
  jobs?: Array<{ id: number; status?: string; title?: string }>;
  openRequests?: unknown[];
  counts?: { bookings?: number; jobs?: number; openRequests?: number };
  opsStatus?: string;
};

const CHECKLIST_ITEMS: { key: keyof Checklist; label: string; href: string; icon: string }[] = [
  { key: 'profile', label: 'Complete your profile', href: '/provider/onboarding', icon: 'fa-id-card' },
  { key: 'serviceAreas', label: 'Add service areas', href: '/provider/service-areas', icon: 'fa-map-location-dot' },
  { key: 'services', label: 'Add services you offer', href: '/provider/services', icon: 'fa-tags' },
  { key: 'verification', label: 'Upload verification docs', href: '/provider/verification', icon: 'fa-file-shield' },
  { key: 'published', label: 'Publish your listing', href: '/provider/dashboard', icon: 'fa-globe' },
];

export default function SoloDashboardPage() {
  const { user, updateSession } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [online, setOnline] = useState(Boolean(user?.isOnline));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ws, day, presence] = await Promise.all([
        apiFetch<Workspace>('/api/provider/workspace'),
        apiFetch<TodayPayload>('/api/provider/ops/today'),
        fetchPresence(),
      ]);
      setWorkspace(ws);
      setToday(day);
      if (presence) {
        setOnline(Boolean(presence.isOnline));
        updateSession({ isOnline: presence.isOnline });
      } else if (typeof ws.isOnline === 'boolean') {
        setOnline(ws.isOnline);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Could not load your solo workspace.');
    } finally {
      setLoading(false);
    }
  }, [updateSession]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePresence = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const next = !online;
      const snap = await pushPresence(next, next ? 'LOGIN' : 'MANUAL_OFFLINE');
      setOnline(Boolean(snap?.isOnline ?? next));
      updateSession({ isOnline: snap?.isOnline ?? next });
      setMessage(next ? 'You are online for new requests.' : 'You are offline.');
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Could not update presence.');
    } finally {
      setBusy(false);
    }
  };

  const setAvailableNow = async (minutes: number) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/api/provider/ops/available-now', {
        method: 'PUT',
        body: JSON.stringify({ minutes }),
      });
      setMessage(
        minutes > 0
          ? `You're taking urgent jobs for the next ${minutes >= 60 ? `${minutes / 60} h` : `${minutes} min`}.`
          : 'Urgent jobs turned off.'
      );
      await load();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Could not update urgent availability.');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/api/provider/publish', { method: 'POST' });
      setMessage('Your listing is live on Explore.');
      await load();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Could not publish listing.');
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/api/provider/unpublish', { method: 'POST' });
      setMessage('Listing hidden from Explore.');
      await load();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Could not unpublish listing.');
    } finally {
      setBusy(false);
    }
  };

  const resubmit = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/api/provider/resubmit', { method: 'POST' });
      setMessage('Listing submitted for review again.');
      await load();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Could not resubmit. Re-upload rejected documents first.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="card" height={120} />
        <div style={{ height: 16 }} />
        <Skeleton variant="card" height={220} />
      </div>
    );
  }

  const checklist = workspace?.checklist || {};
  const complete = workspace?.checklistComplete ?? 0;
  const total = workspace?.checklistTotal ?? CHECKLIST_ITEMS.length;
  const status = (workspace?.status || 'PENDING').toUpperCase();
  const isLive = status === 'APPROVED' && (workspace?.publishStatus || '').toUpperCase() === 'PUBLISHED';
  const listingStatusLabel =
    status === 'PENDING'
      ? 'Hidden while in review'
      : status === 'REJECTED'
        ? 'Rejected — fix documents and resubmit'
        : status === 'SUSPENDED'
          ? 'Suspended — hidden from customers'
          : isLive
            ? 'Live on Explore'
            : status === 'APPROVED'
              ? 'Approved — hidden until you publish'
              : status;
  const customerName = (b: NonNullable<TodayPayload['bookings']>[number]) => {
    const u = b.customer?.user || b.customer;
    const name = `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
    return name || 'Customer';
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={`Hi ${user?.firstName || 'there'}`}
        subtitle="Your solo practice — no branches or team setup. Manage your listing, schedule, and requests here."
      />

      {message && (
        <div className="success-alert" style={{ marginBottom: 14 }}>
          <i className="fa-solid fa-circle-check" /> {message}
        </div>
      )}
      {error && (
        <div className="error-alert" style={{ marginBottom: 14 }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      <div className="surface" style={{ padding: 16, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <i className={`fa-solid ${isLive ? 'fa-circle-check' : status === 'REJECTED' ? 'fa-circle-xmark' : 'fa-clock-rotate-left'}`} />
        <div style={{ flex: 1 }}>
          <strong>{listingStatusLabel}</strong>
          <p style={{ margin: '6px 0 0', opacity: 0.85 }}>
            {status === 'PENDING' && 'Complete setup and verification so Super Admin can approve your listing.'}
            {status === 'REJECTED' && 'Re-upload rejected documents, then resubmit for review.'}
            {status === 'SUSPENDED' && 'Your listing is hidden. Contact support for help.'}
            {status === 'APPROVED' && !isLive && 'Publish when services, hours, and a service area are ready.'}
            {isLive && 'Customers can find and book you on Explore.'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {status === 'REJECTED' && (
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void resubmit()}>
                Resubmit for review
              </button>
            )}
            {status === 'APPROVED' && !isLive && (
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void publish()}>
                Publish listing
              </button>
            )}
            {isLive && (
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void unpublish()}>
                Unpublish
              </button>
            )}
            <Link href="/provider/verification" className="btn btn-outline btn-sm">
              Verification
            </Link>
          </div>
        </div>
      </div>

      <section className={styles.heroCard}>
        <div>
          <span className={styles.kicker}>Individual professional</span>
          <h2>{workspace?.name || 'Your listing'}</h2>
          <p>
            {workspace?.serviceMode?.replaceAll('_', ' ') || 'Service mode'} ·{' '}
            {workspace?.publishStatus || 'DRAFT'} · {workspace?.opsStatus || 'AVAILABLE'}
          </p>
          {isLive && workspace?.slug && (
            <Link href={`/b/${encodeURIComponent(workspace.slug)}`} className={styles.publicLink}>
              View public profile <i className="fa-solid fa-arrow-up-right-from-square" />
            </Link>
          )}
        </div>
        <div className={styles.heroActions}>
          <button type="button" className={styles.presenceBtn} onClick={() => void togglePresence()} disabled={busy}>
            <span className={online ? styles.dotOn : styles.dotOff} />
            {online ? 'Online' : 'Offline'}
          </button>
          {workspace?.availableNow ? (
            <button
              type="button"
              className={styles.presenceBtn}
              onClick={() => void setAvailableNow(0)}
              disabled={busy}
              title="Customers can book you for urgent jobs with the urgent fee"
            >
              <span className={styles.dotOn} />
              Urgent jobs until{' '}
              {workspace.availableNowUntil
                ? new Date(workspace.availableNowUntil).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                : 'later'}{' '}
              · Stop
            </button>
          ) : (
            <select
              className={styles.presenceBtn}
              value=""
              disabled={busy}
              aria-label="Take urgent jobs"
              onChange={(e) => {
                const minutes = Number(e.target.value);
                if (minutes > 0) void setAvailableNow(minutes);
              }}
            >
              <option value="">Take urgent jobs…</option>
              <option value="60">For 1 hour</option>
              <option value="120">For 2 hours</option>
              <option value="240">For 4 hours</option>
              <option value="480">For 8 hours</option>
            </select>
          )}
          {status === 'APPROVED' && !isLive && (
            <button type="button" className={styles.primaryBtn} onClick={() => void publish()} disabled={busy}>
              Publish listing
            </button>
          )}
        </div>
      </section>

      <AppAccessCard />

      <section className={styles.stats}>
        <div className={styles.stat}>
          <strong>{today?.counts?.bookings ?? 0}</strong>
          <span>Bookings today</span>
        </div>
        <div className={styles.stat}>
          <strong>{today?.counts?.jobs ?? 0}</strong>
          <span>Jobs today</span>
        </div>
        <div className={styles.stat}>
          <strong>{today?.counts?.openRequests ?? 0}</strong>
          <span>Open requests</span>
        </div>
        <div className={styles.stat}>
          <strong>
            {complete}/{total}
          </strong>
          <span>Setup complete</span>
        </div>
      </section>

      <div className={styles.split}>
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <h3>Solo setup</h3>
            <span>
              {complete}/{total}
            </span>
          </header>
          <ul className={styles.checklist}>
            {CHECKLIST_ITEMS.map((item) => {
              const done = Boolean(checklist[item.key]);
              return (
                <li key={item.key} className={done ? styles.checkDone : undefined}>
                  <i className={`fa-solid ${done ? 'fa-circle-check' : item.icon}`} />
                  <div>
                    <strong>{item.label}</strong>
                    {!done && item.key === 'published' && status === 'APPROVED' ? (
                      <button type="button" className={styles.linkBtn} onClick={() => void publish()} disabled={busy}>
                        Publish now
                      </button>
                    ) : (
                      <Link href={item.href}>{done ? 'Review' : 'Continue'}</Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <h3>Today</h3>
            <Link href="/provider/calendar">Calendar</Link>
          </header>
          {(today?.bookings?.length || 0) === 0 && (today?.jobs?.length || 0) === 0 ? (
            <p className={styles.empty}>No bookings or jobs scheduled for today.</p>
          ) : (
            <ul className={styles.todayList}>
              {(today?.bookings || []).map((b) => (
                <li key={`b-${b.id}`}>
                  <div>
                    <strong>{b.service?.name || 'Booking'}</strong>
                    <span>{customerName(b)}</span>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
              {(today?.jobs || []).map((j) => (
                <li key={`j-${j.id}`}>
                  <div>
                    <strong>{j.title || `Job #${j.id}`}</strong>
                    <span>Field job</span>
                  </div>
                  <StatusBadge status={j.status || 'OPEN'} />
                </li>
              ))}
            </ul>
          )}
          <div className={styles.quickLinks}>
            <Link href="/provider/bookings">Bookings</Link>
            <Link href="/provider/requests">Requests</Link>
            <Link href="/provider/services">Services</Link>
            <Link href="/provider/availability">Availability</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
