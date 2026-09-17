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
  title?: string;
  body?: string;
  category?: string;
  createdAt?: string;
  authorUserId?: number;
  provider?: { id?: number; name?: string; slug?: string };
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>();
  const communityId = params.id;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('GENERAL');

  const load = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    setError(null);
    try {
      setPosts(await apiFetch<Post[]>(`/api/communities/${communityId}/posts`));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load community posts.');
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const createPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/communities/${communityId}/posts`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category: category.trim() || 'GENERAL',
        }),
      });
      setMessage('Post published.');
      setTitle('');
      setBody('');
      setCategory('GENERAL');
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not create post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Community posts"
        subtitle="Read and share updates with this local community."
        actions={
          <Link href="/community" className="btn btn-outline">
            All communities
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
            <h2>Create a post</h2>
            <p>Ask a question or share a recommendation.</p>
          </div>
        </div>
        <form className={styles.formGrid} onSubmit={(event) => void createPost(event)}>
          <FormField
            label="Title"
            htmlFor="postTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <FormField
            label="Category"
            htmlFor="postCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <div className={styles.full}>
            <FormField
              as="textarea"
              label="Body"
              htmlFor="postBody"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className={`${styles.full} ${styles.actions}`}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Publishing…' : 'Publish post'}
            </button>
          </div>
        </form>
      </section>

      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : posts.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-comments"
            title="No posts yet"
            description="Be the first to start a conversation in this community."
          />
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {posts.map((post) => (
            <article className={styles.requestCard} key={post.id}>
              <div className={styles.cardHead}>
                <div>
                  <h3><Link href={`/community/post/${post.id}`}>{post.title || `Post #${post.id}`}</Link></h3>
                  <p className={styles.muted}>
                    {(post.category || 'GENERAL').replaceAll('_', ' ')} · {formatDate(post.createdAt)}
                  </p>
                </div>
              </div>
              {post.body && <p className={styles.requestExcerpt}>{post.body}</p>}
              {post.provider?.slug && (
                <p className={styles.muted}>
                  Provider:{' '}
                  <Link href={`/b/${encodeURIComponent(post.provider.slug)}`}>
                    {post.provider.name || post.provider.slug}
                  </Link>
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
