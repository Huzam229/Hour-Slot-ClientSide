'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import styles from '@/app/phase1.module.css';

type Community = {
  id: number;
  name?: string;
  slug?: string;
  description?: string;
  city?: string;
  region?: string;
  countryCode?: string;
  areaName?: string;
  status?: string;
};

function locationLabel(community: Community) {
  return [community.areaName, community.city, community.region, community.countryCode]
    .filter(Boolean)
    .join(', ');
}

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCommunities(await apiFetch<Community[]>('/api/communities'));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load communities.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const openCommunity = async (community: Community) => {
    setJoiningId(community.id);
    setError(null);
    try {
      await apiFetch(`/api/communities/${community.id}/join`, { method: 'POST' });
    } catch {
      // Join endpoint may not exist; open the community either way.
    } finally {
      setJoiningId(null);
      router.push(`/community/${community.id}`);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Community"
        subtitle="Browse local communities, join discussions, and share recommendations."
      />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : communities.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-people-group"
            title="No communities yet"
            description="Local communities will appear here when they are available in your area."
          />
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {communities.map((community) => (
            <article className={styles.card} key={community.id}>
              <div className={styles.cardHead}>
                <div>
                  <h3>{community.name || `Community #${community.id}`}</h3>
                  <p className={styles.muted}>{locationLabel(community) || community.slug || 'Local group'}</p>
                </div>
              </div>
              {community.description && <p>{community.description}</p>}
              <div className={styles.actions}>
                <Link href={`/community/${community.id}`} className="btn btn-outline btn-sm">
                  View posts
                </Link>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={joiningId === community.id}
                  onClick={() => void openCommunity(community)}
                >
                  {joiningId === community.id ? 'Opening…' : 'Join / Open'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
