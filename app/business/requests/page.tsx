'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import FormField from '@/components/FormField';
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
  areaName?: string;
  preferredDate?: string;
  preferredTimeFrom?: string;
  preferredTimeTo?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  createdAt?: string;
};

type ProviderLink = {
  id: number;
  requestId: number;
  providerId: number;
  responseStatus?: string;
  matchScore?: number;
};

type InboxRow = {
  link: ProviderLink;
  request: ServiceRequest;
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function locationLabel(request: ServiceRequest) {
  return [request.areaName, request.city, request.region, request.countryCode].filter(Boolean).join(', ') || 'Location not set';
}

export default function ProviderRequestsPage() {
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [quotingId, setQuotingId] = useState<number | null>(null);
  const [quoteForms, setQuoteForms] = useState<Record<number, { amount: string; currency: string; description: string; duration: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await apiFetch<InboxRow[]>('/api/provider/requests'));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load request inbox.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const aTime = a.request.createdAt ? new Date(a.request.createdAt).getTime() : 0;
        const bTime = b.request.createdAt ? new Date(b.request.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
    [rows]
  );

  const ensureQuoteForm = (request: ServiceRequest) => {
    setQuoteForms((current) =>
      current[request.id]
        ? current
        : {
            ...current,
            [request.id]: {
              amount: '',
              currency: request.currency || 'PKR',
              description: '',
              duration: '',
            },
          }
    );
  };

  const respond = async (requestId: number, action: 'accept' | 'decline') => {
    setRespondingId(requestId);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/provider/requests/${requestId}/${action}`, { method: 'POST' });
      setMessage(action === 'accept' ? 'Invitation accepted.' : 'Invitation declined.');
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || `Could not ${action} this request.`);
    } finally {
      setRespondingId(null);
    }
  };

  const submitQuote = async (event: FormEvent, request: ServiceRequest) => {
    event.preventDefault();
    const form = quoteForms[request.id] || {
      amount: '',
      currency: request.currency || 'PKR',
      description: '',
      duration: '',
    };
    if (!form.amount.trim()) {
      setError('Quote amount is required.');
      return;
    }

    setQuotingId(request.id);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/provider/requests/${request.id}/quote`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.amount),
          currency: form.currency.trim() || request.currency || 'PKR',
          description: form.description.trim() || null,
          estimatedDurationMinutes: form.duration ? Number(form.duration) : null,
        }),
      });
      setMessage(`Quote sent for "${request.title}".`);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not send quote.');
    } finally {
      setQuotingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Service requests"
        subtitle="Review customer requests matched to your business and respond with quotes."
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
        <Skeleton variant="row" count={4} />
      ) : sortedRows.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-inbox"
            title="No requests in your inbox"
            description="Matched customer requests will appear here when they need quotes in your service area."
          />
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {sortedRows.map(({ link, request }) => {
            const declined = link.responseStatus === 'DECLINED';
            const form = quoteForms[request.id] || {
              amount: '',
              currency: request.currency || 'PKR',
              description: '',
              duration: '',
            };

            return (
              <article className={styles.card} key={link.id}>
                <div className={styles.cardHead}>
                  <div>
                    <h3>{request.title}</h3>
                    <p className={styles.muted}>{locationLabel(request)}</p>
                  </div>
                  <StatusBadge status={link.responseStatus || 'INVITED'} />
                </div>

                {request.description && <p>{request.description}</p>}

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
                  <span className={styles.muted}>Request status: {(request.status || 'OPEN').toLowerCase()}</span>
                </div>

                {!declined && link.responseStatus === 'INVITED' && (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={respondingId === request.id}
                      onClick={() => void respond(request.id, 'decline')}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={respondingId === request.id}
                      onClick={() => void respond(request.id, 'accept')}
                    >
                      {respondingId === request.id ? 'Updating…' : 'Accept invite'}
                    </button>
                  </div>
                )}

                {!declined && request.status !== 'CANCELLED' && request.status !== 'SCHEDULED' && (
                  <form
                    className={styles.quoteForm}
                    onSubmit={(event) => void submitQuote(event, request)}
                    onFocus={() => ensureQuoteForm(request)}
                  >
                    <div className={styles.formGrid}>
                      <FormField
                        label="Quote amount"
                        htmlFor={`quoteAmount-${request.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) =>
                          setQuoteForms((current) => ({
                            ...current,
                            [request.id]: { ...form, amount: e.target.value },
                          }))
                        }
                        required
                      />
                      <FormField
                        label="Currency"
                        htmlFor={`quoteCurrency-${request.id}`}
                        value={form.currency}
                        onChange={(e) =>
                          setQuoteForms((current) => ({
                            ...current,
                            [request.id]: { ...form, currency: e.target.value.toUpperCase() },
                          }))
                        }
                      />
                      <FormField
                        label="Estimated duration (minutes)"
                        htmlFor={`quoteDuration-${request.id}`}
                        type="number"
                        min="1"
                        value={form.duration}
                        onChange={(e) =>
                          setQuoteForms((current) => ({
                            ...current,
                            [request.id]: { ...form, duration: e.target.value },
                          }))
                        }
                      />
                      <div className={styles.full}>
                        <FormField
                          as="textarea"
                          label="Quote notes"
                          htmlFor={`quoteDescription-${request.id}`}
                          value={form.description}
                          onChange={(e) =>
                            setQuoteForms((current) => ({
                              ...current,
                              [request.id]: { ...form, description: e.target.value },
                            }))
                          }
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className={styles.actions}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={quotingId === request.id}>
                        {quotingId === request.id ? 'Sending…' : 'Send quote'}
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
