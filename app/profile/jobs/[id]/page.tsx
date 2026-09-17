'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import FormField from '@/components/FormField';
import { formatMoney } from '@/lib/money';
import styles from '@/app/phase1.module.css';

type Job = {
  id: number;
  title?: string;
  description?: string;
  status?: string;
  estimatedAmount?: number;
  finalAmount?: number;
  currency?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  bookingId?: number;
};

type HistoryItem = {
  id: number;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  createdAt?: string;
};

type NoteItem = {
  id: number;
  body?: string;
  authorUserId?: number;
  createdAt?: string;
};

type DisputeItem = {
  id: number;
  reason?: string;
  status?: string;
  resolutionNotes?: string;
  createdAt?: string;
};

type MediaItem = {
  id: number;
  url?: string;
  mimeType?: string;
};

type JobDetail = {
  job?: Job;
  history?: HistoryItem[];
  notes?: NoteItem[];
  disputes?: DisputeItem[];
  media?: MediaItem[];
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

export default function CustomerJobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [rating, setRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await apiFetch<JobDetail>(`/api/jobs/${jobId}`));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load this job.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          jobId: Number(jobId),
          rating: Number(rating),
          comment: reviewComment.trim() || null,
        }),
      });
      setMessage('Review submitted.');
      setReviewComment('');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDispute = async (event: FormEvent) => {
    event.preventDefault();
    if (!disputeReason.trim()) {
      setError('Please provide a reason for the dispute.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/jobs/${jobId}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      setMessage('Dispute submitted.');
      setDisputeReason('');
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not open dispute.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="card" height={360} />
      </div>
    );
  }

  if (!detail?.job) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-briefcase"
            title="Job not found"
            description={error || 'This job may have been removed.'}
          />
        </div>
      </div>
    );
  }

  const { job } = detail;
  const history = detail.history || [];
  const notes = detail.notes || [];
  const disputes = detail.disputes || [];
  const media = detail.media || [];
  const canDispute = job.status && !['CANCELLED', 'DISPUTED'].includes(job.status);
  const canReview = job.status === 'COMPLETED';

  return (
    <div className={styles.page}>
      <PageHeader
        title={job.title || `Job #${job.id}`}
        subtitle="Review status updates, notes, and open a dispute if needed."
        actions={
          <Link href="/profile/jobs" className="btn btn-outline">
            All jobs
          </Link>
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
            <h2>Job details</h2>
            <p>Created {formatDate(job.createdAt)}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>
        {job.description && <p>{job.description}</p>}
        <div className={styles.detailGrid}>
          <div>
            <strong>Scheduled</strong>
            <p className={styles.muted}>{formatDate(job.scheduledStart)}</p>
          </div>
          <div>
            <strong>Amount</strong>
            <p className={styles.muted}>
              {formatMoney(job.finalAmount ?? job.estimatedAmount ?? 0, job.currency)}
            </p>
          </div>
          <div>
            <strong>Started</strong>
            <p className={styles.muted}>{formatDate(job.startedAt)}</p>
          </div>
          <div>
            <strong>Completed</strong>
            <p className={styles.muted}>{formatDate(job.completedAt)}</p>
          </div>
        </div>
      </section>

      {media.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Job evidence</h2>
              <p>Photos attached by the provider.</p>
            </div>
          </div>
          <div className={styles.mediaList}>
            <ul>
              {media.map((item) => (
                <li key={item.id}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
                  ) : (
                    `Media #${item.id}`
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Status history</h2>
            <p>{history.length} update{history.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        {history.length === 0 ? (
          <p className={styles.muted}>No status changes recorded yet.</p>
        ) : (
          <div className={styles.quoteList}>
            {history.map((item) => (
              <article className={styles.quoteCard} key={item.id}>
                <div className={styles.cardHead}>
                  <div>
                    <h3>
                      {(item.fromStatus || '—').replaceAll('_', ' ')} → {(item.toStatus || '—').replaceAll('_', ' ')}
                    </h3>
                    <p className={styles.muted}>{formatDate(item.createdAt)}</p>
                  </div>
                </div>
                {item.reason && <p>{item.reason}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Notes</h2>
            <p>Updates shared on this job.</p>
          </div>
        </div>
        {notes.length === 0 ? (
          <p className={styles.muted}>No notes yet.</p>
        ) : (
          <div className={styles.quoteList}>
            {notes.map((note) => (
              <article className={styles.quoteCard} key={note.id}>
                <p>{note.body}</p>
                <p className={styles.muted}>{formatDate(note.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {disputes.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Disputes</h2>
              <p>Open and resolved disputes for this job.</p>
            </div>
          </div>
          <div className={styles.quoteList}>
            {disputes.map((dispute) => (
              <article className={styles.quoteCard} key={dispute.id}>
                <div className={styles.cardHead}>
                  <div>
                    <h3>{dispute.reason}</h3>
                    <p className={styles.muted}>{formatDate(dispute.createdAt)}</p>
                  </div>
                  <StatusBadge status={dispute.status} />
                </div>
                {dispute.resolutionNotes && <p>{dispute.resolutionNotes}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {canReview && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Leave a review</h2>
              <p>Rate this completed job. Reviews appear on the provider profile.</p>
            </div>
          </div>
          <form className={styles.quoteForm} onSubmit={(event) => void submitReview(event)}>
            <FormField
              label="Rating"
              htmlFor="jobRating"
              type="number"
              min="1"
              max="5"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              required
            />
            <FormField
              as="textarea"
              label="Comment"
              htmlFor="jobReview"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
            />
            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Submit review'}
              </button>
            </div>
          </form>
        </section>
      )}

      {canDispute && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Open a dispute</h2>
              <p>Describe the issue and our team will review it.</p>
            </div>
          </div>
          <form className={styles.quoteForm} onSubmit={(event) => void openDispute(event)}>
            <FormField
              as="textarea"
              label="Reason"
              htmlFor="disputeReason"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
              required
            />
            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit dispute'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
