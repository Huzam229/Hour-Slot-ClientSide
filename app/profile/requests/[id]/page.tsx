'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  bookingId?: number;
  createdAt?: string;
};

type RequestMedia = {
  id: number;
  url: string;
};

type RequestProvider = {
  id: number;
  providerId: number;
  responseStatus?: string;
  matchScore?: number;
  matchReason?: string;
  name?: string;
  slug?: string;
  verified?: boolean;
};

type Quote = {
  id: number;
  providerId: number;
  amount?: number;
  currency?: string;
  description?: string;
  estimatedDurationMinutes?: number;
  status?: string;
  validUntil?: string;
  createdAt?: string;
};

type RequestDetail = {
  request: ServiceRequest;
  media: RequestMedia[];
  providers: RequestProvider[];
  quotes: Quote[];
  expandedSearch?: boolean;
  matchedCount?: number;
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

function formatTime(value?: string) {
  if (!value) return '';
  return value.slice(0, 5);
}

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const requestId = params.id;

  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<number | null>(null);
  const [bookingTime, setBookingTime] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await apiFetch<RequestDetail>(`/api/requests/${requestId}`));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load this request.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const cancelRequest = async () => {
    if (!requestId || !window.confirm('Cancel this service request?')) return;
    setCancelling(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/requests/${requestId}/cancel`, { method: 'POST' });
      setMessage('Request cancelled.');
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not cancel request.');
    } finally {
      setCancelling(false);
    }
  };

  const acceptQuote = async (event: FormEvent, quoteId: number) => {
    event.preventDefault();
    setAcceptingQuoteId(quoteId);
    setError(null);
    setMessage(null);
    try {
      const result = await apiFetch<{ booking?: { id?: number; publicCode?: string } }>(
        `/api/requests/${requestId}/select-quote`,
        {
          method: 'POST',
          body: JSON.stringify({
            quoteId,
            bookingTime: bookingTime ? `${bookingTime}:00` : null,
          }),
        }
      );
      const code = result.booking?.publicCode;
      setMessage(code ? `Quote accepted. Booking ${code} is confirmed.` : 'Quote accepted.');
      await load();
      if (result.booking?.id) {
        router.push('/profile/bookings');
      }
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not accept this quote.');
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="card" height={360} />
      </div>
    );
  }

  if (!detail?.request) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-file-circle-xmark"
            title="Request not found"
            description={error || 'This request may have been removed.'}
          />
        </div>
      </div>
    );
  }

  const { request, media, providers, quotes } = detail;
  const canCancel = request.status && !['CANCELLED', 'COMPLETED', 'SCHEDULED'].includes(request.status);
  const location = [request.areaName, request.city, request.region, request.countryCode].filter(Boolean).join(', ');

  return (
    <div className={styles.page}>
      <PageHeader
        title={request.title}
        subtitle="Review provider responses and accept a quote when you are ready."
        actions={
          <div className={styles.rowActions}>
            <Link href="/profile/requests" className="btn btn-outline">
              All requests
            </Link>
            {canCancel && (
              <button type="button" className="btn btn-outline" disabled={cancelling} onClick={() => void cancelRequest()}>
                {cancelling ? 'Cancelling…' : 'Cancel request'}
              </button>
            )}
          </div>
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

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Request details</h2>
            <p>Submitted {formatDate(request.createdAt)}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>
        {request.description && <p>{request.description}</p>}
        <div className={styles.detailGrid}>
          <div>
            <strong>Location</strong>
            <p className={styles.muted}>{location || 'Not specified'}</p>
          </div>
          <div>
            <strong>Preferred schedule</strong>
            <p className={styles.muted}>
              {request.preferredDate || 'Flexible'}
              {request.preferredTimeFrom ? ` · ${formatTime(request.preferredTimeFrom)}` : ''}
              {request.preferredTimeTo ? ` – ${formatTime(request.preferredTimeTo)}` : ''}
            </p>
          </div>
          <div>
            <strong>Urgency</strong>
            <p className={styles.muted}>{(request.urgency || 'NORMAL').replaceAll('_', ' ').toLowerCase()}</p>
          </div>
          <div>
            <strong>Budget</strong>
            <p className={styles.muted}>
              {request.budgetMin != null || request.budgetMax != null
                ? request.budgetMin != null && request.budgetMax != null
                  ? `${formatMoney(request.budgetMin, request.currency)} – ${formatMoney(request.budgetMax, request.currency)}`
                  : formatMoney(request.budgetMax ?? request.budgetMin ?? 0, request.currency)
                : 'Not specified'}
            </p>
          </div>
        </div>
        {media.length > 0 && (
          <div className={styles.mediaList}>
            <strong>Reference images</strong>
            <ul>
              {media.map((item) => (
                <li key={item.id}>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Matched providers</h2>
            <p>
              {providers.length} provider{providers.length === 1 ? '' : 's'} invited
              {detail.expandedSearch ? ' · expanded search used' : ''}
            </p>
          </div>
        </div>
        {providers.length === 0 ? (
          <p className={styles.muted}>No matching providers were found in your coverage area. Try a nearby area or a broader request.</p>
        ) : (
          <div className={styles.inlineList}>
            {providers.map((provider) => (
              <span className={styles.areaChip} key={provider.id}>
                {provider.slug ? (
                  <Link href={`/b/${encodeURIComponent(provider.slug)}`}>{provider.name || `Provider #${provider.providerId}`}</Link>
                ) : (
                  provider.name || `Provider #${provider.providerId}`
                )}
                {' · '}
                {(provider.responseStatus || 'INVITED').toLowerCase()}
                {provider.matchReason?.includes('expanded_search') ? ' · nearby match' : ''}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Quotes</h2>
            <p>Compare offers and accept one to confirm your booking.</p>
          </div>
        </div>

        {quotes.length === 0 ? (
          <EmptyState
            icon="fa-file-invoice-dollar"
            title="No quotes yet"
            description="Providers will send quotes here once they review your request."
          />
        ) : (
          <div className={styles.quoteList}>
            {quotes.map((quote) => {
              const canAccept = quote.status === 'SENT' || quote.status === 'VIEWED';
              return (
                <article className={styles.quoteCard} key={quote.id}>
                  <div className={styles.cardHead}>
                    <div>
                      <h3>{formatMoney(quote.amount ?? 0, quote.currency)}</h3>
                      <p className={styles.muted}>
                        Provider #{quote.providerId}
                        {quote.estimatedDurationMinutes ? ` · ~${quote.estimatedDurationMinutes} min` : ''}
                      </p>
                    </div>
                    <StatusBadge status={quote.status} />
                  </div>
                  {quote.description && <p>{quote.description}</p>}
                  <p className={styles.muted}>Valid until {formatDate(quote.validUntil)}</p>
                  {canAccept && request.status !== 'CANCELLED' && request.status !== 'SCHEDULED' && (
                    <form className={styles.quoteAcceptForm} onSubmit={(event) => void acceptQuote(event, quote.id)}>
                      <FormField
                        label="Booking time (optional)"
                        htmlFor={`bookingTime-${quote.id}`}
                        type="datetime-local"
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        hint="Leave blank to use your preferred date and time."
                      />
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={acceptingQuoteId === quote.id}
                      >
                        {acceptingQuoteId === quote.id ? 'Accepting…' : 'Accept quote'}
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
