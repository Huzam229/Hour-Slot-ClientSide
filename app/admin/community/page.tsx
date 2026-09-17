'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import FormField from '@/components/FormField';
import styles from '@/app/phase1.module.css';

type CommunityReport = {
  id: number;
  postId?: number;
  commentId?: number;
  reportedByUserId?: number;
  reason?: string;
  description?: string;
  status?: string;
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

export default function AdminCommunityModerationPage() {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await apiFetch<CommunityReport[]>('/api/admin/community/reports'));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load community reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const review = async (reportId: number, approve: boolean, report: CommunityReport) => {
    setReviewingId(reportId);
    setError(null);
    setMessage(null);
    try {
      const reviewNotes = (notes[reportId] || '').trim();
      const removeAction = report.commentId ? 'REMOVE_COMMENT' : 'REMOVE_POST';
      await apiFetch(`/api/admin/community/reports/${reportId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          approve,
          notes: reviewNotes || null,
          // Backend ReviewBody currently accepts status/action.
          status: approve ? 'REVIEWED' : 'DISMISSED',
          action: approve ? removeAction : null,
        }),
      });
      setMessage(approve ? `Report #${reportId} approved.` : `Report #${reportId} dismissed.`);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not review report.');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Community moderation"
        subtitle="Review reported posts and comments."
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
      ) : reports.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-flag"
            title="No pending reports"
            description="Reported community content will appear here for review."
          />
        </div>
      ) : (
        <div className={styles.quoteList}>
          {reports.map((report) => (
            <article className={styles.section} key={report.id}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>Report #{report.id}</h2>
                  <p>
                    {report.commentId ? `Comment #${report.commentId}` : `Post #${report.postId ?? '—'}`}
                    {' · '}
                    {formatDate(report.createdAt)}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </div>
              <p>
                <strong>Reason:</strong> {report.reason || '—'}
              </p>
              {report.description && <p>{report.description}</p>}
              <FormField
                as="textarea"
                label="Review notes"
                htmlFor={`notes-${report.id}`}
                value={notes[report.id] || ''}
                onChange={(e) => setNotes((current) => ({ ...current, [report.id]: e.target.value }))}
                rows={2}
              />
              <div className={styles.actions}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={reviewingId === report.id}
                  onClick={() => void review(report.id, false, report)}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={reviewingId === report.id}
                  onClick={() => void review(report.id, true, report)}
                >
                  {reviewingId === report.id ? 'Saving…' : 'Approve & remove'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
