'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import FormField from '@/components/FormField';
import styles from '@/app/phase1.module.css';

type Dispute = {
  id: number;
  jobId?: number;
  openedByUserId?: number;
  reason?: string;
  status?: string;
  resolutionNotes?: string;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<number, { resolution: string; status: string }>>({});
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Dispute[] | { disputes?: Dispute[] }>('/api/admin/disputes');
      setDisputes(Array.isArray(data) ? data : data.disputes || []);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load disputes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const formFor = (dispute: Dispute) =>
    forms[dispute.id] || {
      resolution: dispute.resolutionNotes || '',
      status: 'RESOLVED',
    };

  const resolve = async (event: FormEvent, disputeId: number) => {
    event.preventDefault();
    const form = forms[disputeId] || { resolution: '', status: 'RESOLVED' };
    if (!form.resolution.trim()) {
      setError('Resolution notes are required.');
      return;
    }
    setResolvingId(disputeId);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          resolution: form.resolution.trim(),
          status: form.status.trim() || 'RESOLVED',
        }),
      });
      setMessage(`Dispute #${disputeId} updated.`);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not resolve dispute.');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Disputes"
        subtitle="Review and resolve job disputes opened by customers or providers."
        actions={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}>
            <i className="fa-solid fa-rotate" /> Refresh
          </button>
        }
      />

      {message && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" /> {message}
        </div>
      )}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {loading ? (
        <Skeleton variant="row" count={5} />
      ) : disputes.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-scale-balanced"
            title="No disputes"
            description="Open disputes will appear here for admin resolution."
          />
        </div>
      ) : (
        <div className={styles.quoteList}>
          {disputes.map((dispute) => {
            const form = formFor(dispute);
            return (
              <article className={styles.section} key={dispute.id}>
                <div className={styles.sectionHead}>
                  <div>
                    <h2>Dispute #{dispute.id}</h2>
                    <p>
                      Job #{dispute.jobId ?? '—'} · {formatDate(dispute.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={dispute.status} />
                </div>
                <p>{dispute.reason}</p>
                {dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
                  <form className={styles.formGrid} onSubmit={(event) => void resolve(event, dispute.id)}>
                    <FormField
                      label="Status"
                      htmlFor={`status-${dispute.id}`}
                      value={form.status}
                      onChange={(e) =>
                        setForms((current) => ({
                          ...current,
                          [dispute.id]: { ...form, status: e.target.value },
                        }))
                      }
                    />
                    <div className={styles.full}>
                      <FormField
                        as="textarea"
                        label="Resolution"
                        htmlFor={`resolution-${dispute.id}`}
                        value={form.resolution}
                        onChange={(e) =>
                          setForms((current) => ({
                            ...current,
                            [dispute.id]: { ...form, resolution: e.target.value },
                          }))
                        }
                        rows={3}
                        required
                      />
                    </div>
                    <div className={`${styles.full} ${styles.actions}`}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={resolvingId === dispute.id}>
                        {resolvingId === dispute.id ? 'Saving…' : 'Resolve'}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
