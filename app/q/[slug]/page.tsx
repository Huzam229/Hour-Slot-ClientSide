'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type Ticket = { ticket: number; name: string };
type Board = {
  businessName: string;
  serving: Ticket[];
  waiting: Ticket[];
  waitingCount: number;
  estimatedWaitMinutes: number;
};

/** Public "now serving" screen — show it on a TV in the shop, or customers open it from a QR code. */
export default function QueueBoardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      apiFetch<Board>(`/api/public/queue/${encodeURIComponent(slug)}`, { skipAuth: true })
        .then((b) => {
          if (alive) {
            setBoard(b);
            setError(null);
          }
        })
        .catch(() => alive && setError('Queue not found.'));
    void load();
    const timer = window.setInterval(load, 10000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [slug]);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary, #f3f4f6)', padding: '24px 16px',
      display: 'grid', alignContent: 'start', justifyItems: 'center', gap: 24 }}>
      {error && <p>{error}</p>}
      {board && (
        <>
          <h1 style={{ margin: 0, textAlign: 'center' }}>{board.businessName}</h1>
          <section className="card" style={{ padding: 24, width: '100%', maxWidth: 640, textAlign: 'center' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1.1rem' }}>Now serving</p>
            {board.serving.length === 0 ? (
              <p style={{ fontSize: '2rem', margin: '8px 0 0' }}>—</p>
            ) : (
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                {board.serving.map((t) => (
                  <div key={t.ticket}>
                    <div style={{ fontSize: 'clamp(3rem, 12vw, 6rem)', fontWeight: 700, lineHeight: 1 }}>#{t.ticket}</div>
                    <div style={{ fontSize: '1.2rem' }}>{t.name}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="card" style={{ padding: 20, width: '100%', maxWidth: 640, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '1.1rem' }}>
              {board.waitingCount === 0
                ? 'No one waiting'
                : `${board.waitingCount} waiting · about ${board.estimatedWaitMinutes} min`}
            </p>
            {board.waiting.length > 0 && (
              <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>
                Next: {board.waiting.slice(0, 5).map((t) => `#${t.ticket}`).join('  ·  ')}
              </p>
            )}
          </section>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Updates automatically · Duemet</p>
        </>
      )}
    </main>
  );
}
