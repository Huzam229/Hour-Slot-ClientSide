'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import FormField from '@/components/FormField';
import styles from '@/app/phase1.module.css';

type Post = {
  id: number;
  communityId?: number;
  title?: string;
  body?: string;
  category?: string;
  createdAt?: string;
  provider?: { id?: number; name?: string; slug?: string };
};

type Comment = {
  id: number;
  body?: string;
  authorUserId?: number;
  createdAt?: string;
};

type Reaction = {
  id?: number;
  reactionType?: string;
  userId?: number;
};

type PostDetail = {
  post?: Post;
  comments?: Comment[];
  reactions?: Reaction[];
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

export default function CommunityPostPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;

  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await apiFetch<PostDetail>(`/api/community/posts/${postId}`));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load this post.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!commentBody.trim()) {
      setError('Comment cannot be empty.');
      return;
    }
    setBusy('comment');
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      setCommentBody('');
      setMessage('Comment added.');
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not add comment.');
    } finally {
      setBusy(null);
    }
  };

  const react = async () => {
    setBusy('react');
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/community/posts/${postId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ reactionType: 'LIKE' }),
      });
      setMessage('Reaction saved.');
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not react to post.');
    } finally {
      setBusy(null);
    }
  };

  const reportPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!reportReason.trim()) {
      setError('Report reason is required.');
      return;
    }
    setBusy('report');
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/community/posts/${postId}/report`, {
        method: 'POST',
        body: JSON.stringify({
          reason: reportReason.trim(),
          description: reportDescription.trim() || null,
        }),
      });
      setMessage('Report submitted for review.');
      setReportReason('');
      setReportDescription('');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not report post.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="card" height={360} />
      </div>
    );
  }

  if (!detail?.post) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-file-circle-xmark"
            title="Post not found"
            description={error || 'This post may have been removed.'}
          />
        </div>
      </div>
    );
  }

  const { post } = detail;
  const comments = detail.comments || [];
  const reactions = detail.reactions || [];
  const communityHref = post.communityId ? `/community/${post.communityId}` : '/community';

  return (
    <div className={styles.page}>
      <PageHeader
        title={post.title || `Post #${post.id}`}
        subtitle="Comments, reactions, and reporting."
        actions={
          <Link href={communityHref} className="btn btn-outline">
            Back to community
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
            <h2>{(post.category || 'GENERAL').replaceAll('_', ' ')}</h2>
            <p>{formatDate(post.createdAt)}</p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy === 'react'} onClick={() => void react()}>
            <i className="fa-regular fa-thumbs-up" /> Like ({reactions.length})
          </button>
        </div>
        <p>{post.body}</p>
        {post.provider?.slug && (
          <p className={styles.muted}>
            Related provider:{' '}
            <Link href={`/b/${encodeURIComponent(post.provider.slug)}`}>
              {post.provider.name || post.provider.slug}
            </Link>
          </p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Comments</h2>
            <p>{comments.length} comment{comments.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        {comments.length === 0 ? (
          <p className={styles.muted}>No comments yet.</p>
        ) : (
          <div className={styles.quoteList}>
            {comments.map((comment) => (
              <article className={styles.quoteCard} key={comment.id}>
                <p>{comment.body}</p>
                <p className={styles.muted}>{formatDate(comment.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
        <form className={styles.quoteForm} onSubmit={(event) => void addComment(event)}>
          <FormField
            as="textarea"
            label="Add a comment"
            htmlFor="commentBody"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows={3}
            required
          />
          <div className={styles.actions}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy === 'comment'}>
              {busy === 'comment' ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Report post</h2>
            <p>Flag content that breaks community guidelines.</p>
          </div>
        </div>
        <form className={styles.formGrid} onSubmit={(event) => void reportPost(event)}>
          <FormField
            label="Reason"
            htmlFor="reportReason"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            required
          />
          <div className={styles.full}>
            <FormField
              as="textarea"
              label="Details (optional)"
              htmlFor="reportDescription"
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className={`${styles.full} ${styles.actions}`}>
            <button type="submit" className="btn btn-outline" disabled={busy === 'report'}>
              {busy === 'report' ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
