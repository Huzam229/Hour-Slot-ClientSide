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
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
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
  media?: MediaItem[];
};

type ActionKey = 'accept' | 'en-route' | 'arrived' | 'start' | 'complete' | 'cancel';

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

function actionsForStatus(status?: string): ActionKey[] {
  switch ((status || '').toUpperCase()) {
    case 'REQUESTED':
      return ['accept', 'cancel'];
    case 'ACCEPTED':
    case 'SCHEDULED':
      return ['en-route', 'cancel'];
    case 'EN_ROUTE':
      return ['arrived', 'cancel'];
    case 'ARRIVED':
      return ['start', 'cancel'];
    case 'IN_PROGRESS':
    case 'AWAITING_PAYMENT':
      return ['complete', 'cancel'];
    case 'DISPUTED':
      return ['complete'];
    default:
      return [];
  }
}

const ACTION_LABELS: Record<ActionKey, string> = {
  accept: 'Accept',
  'en-route': 'En route',
  arrived: 'Arrived',
  start: 'Start',
  complete: 'Complete',
  cancel: 'Cancel',
};

export default function ProviderJobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [acting, setActing] = useState<ActionKey | null>(null);
  const [finalAmount, setFinalAmount] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<JobDetail>(`/api/jobs/${jobId}`);
      setDetail(data);
      if (data.job?.finalAmount != null) {
        setFinalAmount(String(data.job.finalAmount));
      } else if (data.job?.estimatedAmount != null) {
        setFinalAmount(String(data.job.estimatedAmount));
      }
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

  const runAction = async (action: ActionKey) => {
    if (action === 'cancel' && !window.confirm('Cancel this job?')) return;
    setActing(action);
    setError(null);
    setMessage(null);
    try {
      const body: { finalAmount?: number } = {};
      if (action === 'complete' && finalAmount.trim()) {
        body.finalAmount = Number(finalAmount);
      }
      await apiFetch(`/api/jobs/${jobId}/${action}`, {
        method: 'POST',
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      });
      setMessage(`Job marked as ${ACTION_LABELS[action].toLowerCase()}.`);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || `Could not ${ACTION_LABELS[action].toLowerCase()} job.`);
    } finally {
      setActing(null);
    }
  };

  const addNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!noteBody.trim()) {
      setError('Note cannot be empty.');
      return;
    }
    setSavingNote(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/jobs/${jobId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: noteBody.trim() }),
      });
      setMessage('Note added.');
      setNoteBody('');
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not add note.');
    } finally {
      setSavingNote(false);
    }
  };

  const uploadEvidence = async (file: File) => {
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploaded = await apiFetch<{ url: string }>('/api/business/media/upload', {
        method: 'POST',
        body: form,
      });
      await apiFetch(`/api/jobs/${jobId}/media`, {
        method: 'POST',
        body: JSON.stringify({ url: uploaded.url, mimeType: file.type }),
      });
      setMessage('Photo attached to this job.');
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not upload evidence.');
    } finally {
      setUploading(false);
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
  const media = detail.media || [];
  const actions = actionsForStatus(job.status);

  return (
    <div className={styles.page}>
      <PageHeader
        title={job.title || `Job #${job.id}`}
        subtitle="Progress this job through arrival, work, and completion."
        actions={
          <Link href="/business/jobs" className="btn btn-outline">
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

        {actions.includes('complete') && (
          <div className={styles.quoteAcceptForm} style={{ marginTop: 18 }}>
            <FormField
              label="Final amount (optional)"
              htmlFor="finalAmount"
              type="number"
              min="0"
              step="0.01"
              value={finalAmount}
              onChange={(e) => setFinalAmount(e.target.value)}
            />
          </div>
        )}

        {actions.length > 0 && (
          <div className={styles.actions}>
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                className={`btn ${action === 'cancel' ? 'btn-outline' : 'btn-primary'} btn-sm`}
                disabled={acting !== null}
                onClick={() => void runAction(action)}
              >
                {acting === action ? 'Updating…' : ACTION_LABELS[action]}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Job evidence</h2>
            <p>Photos from the visit appear on the customer job page.</p>
          </div>
        </div>
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadEvidence(file);
            event.target.value = '';
          }}
        />
        {media.length === 0 ? (
          <p className={styles.muted} style={{ marginTop: 12 }}>No photos attached yet.</p>
        ) : (
          <div className={styles.mediaList} style={{ marginTop: 12 }}>
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
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Add note</h2>
            <p>Share an internal or customer-visible update.</p>
          </div>
        </div>
        <form onSubmit={(event) => void addNote(event)}>
          <FormField
            as="textarea"
            label="Note"
            htmlFor="noteBody"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            rows={3}
            required
          />
          <div className={styles.actions}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingNote}>
              {savingNote ? 'Saving…' : 'Add note'}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Notes</h2>
            <p>{notes.length} note{notes.length === 1 ? '' : 's'}</p>
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
    </div>
  );
}
