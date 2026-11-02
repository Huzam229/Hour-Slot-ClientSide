'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';

type Row = {
  customer_id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  booking_count: number;
  completed_count: number;
  no_show_count: number;
  total_spent: number;
  last_visit_at?: string | null;
  next_booking_at?: string | null;
  tags: string[];
};

type Detail = {
  customer: { customer_id: number; email?: string; first_name?: string; last_name?: string; phone_number?: string };
  bookings: { id: number; booking_time: string; status: string; total_price: number; service_name?: string }[];
  notes: { id: number; note: string; created_at: string; author_first_name?: string }[];
  tags: string[];
};

const nameOf = (c: { first_name?: string; last_name?: string; email?: string }) =>
  `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Customer';

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** The provider's customer list with history, spend, private notes and tags. */
export default function CustomerRecords() {
  const { format } = useOrgLocale();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await apiFetch<Row[]>('/api/provider-tools/customers'));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Failed to load customers.');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const open = async (id: number) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    try {
      const d = await apiFetch<Detail>(`/api/provider-tools/customers/${id}`);
      setDetail(d);
      setTagInput(d.tags.join(', '));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not load this customer.');
    }
  };

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Something went wrong.');
    }
  };

  const addNote = (e: FormEvent) => {
    e.preventDefault();
    if (!openId || !note.trim()) return;
    void act(async () => {
      setDetail(await apiFetch<Detail>(`/api/provider-tools/customers/${openId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      }));
      setNote('');
    });
  };

  const saveTags = () => {
    if (!openId) return;
    const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
    void act(async () => {
      const res = await apiFetch<{ tags: string[] }>(`/api/provider-tools/customers/${openId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags }),
      });
      setDetail((d) => (d ? { ...d, tags: res.tags } : d));
      await load();
    });
  };

  const allTags = useMemo(() => Array.from(new Set((rows || []).flatMap((r) => r.tags))).sort(), [rows]);
  const visible = (rows || []).filter((r) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [nameOf(r), r.email, r.phone_number].some((v) => v?.toLowerCase().includes(q));
    return matchesQuery && (!tagFilter || r.tags.includes(tagFilter));
  });

  if (rows === null) return <Skeleton variant="card" height={180} />;
  if (rows.length === 0) {
    return <EmptyState icon="fa-users" title="No customers yet" description="Customers appear after their first booking with you." />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {error && <div className="error-alert">{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="form-input" style={{ flex: '1 1 220px' }} placeholder="Search name, email or phone"
          value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search customers" />
        {allTags.length > 0 && (
          <select className="form-input" style={{ flex: '0 1 180px' }} value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)} aria-label="Filter by tag">
            <option value="">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {visible.map((r) => (
        <article key={r.customer_id} className="card" style={{ padding: 14, display: 'grid', gap: 8 }}>
          <button type="button" onClick={() => void open(r.customer_id)} aria-expanded={openId === r.customer_id}
            style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>
              <strong>{nameOf(r)}</strong>
              {r.tags.map((t) => (
                <span key={t} style={{ marginLeft: 6, fontSize: '0.72rem', padding: '2px 8px', borderRadius: 999,
                  border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>{t}</span>
              ))}
              <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                {r.phone_number || r.email} · last visit {fmtDate(r.last_visit_at)}
                {r.next_booking_at ? ` · next ${fmtDate(r.next_booking_at)}` : ''}
              </span>
            </span>
            <span style={{ textAlign: 'right', fontSize: '0.85rem' }}>
              <strong style={{ display: 'block' }}>{format(r.total_spent)}</strong>
              <span style={{ color: 'var(--text-muted)' }}>
                {r.completed_count} visit{r.completed_count === 1 ? '' : 's'}
                {r.no_show_count > 0 ? ` · ${r.no_show_count} no-show${r.no_show_count === 1 ? '' : 's'}` : ''}
              </span>
            </span>
          </button>

          {openId === r.customer_id && (
            detail === null ? <Skeleton variant="row" count={2} /> : (
              <div style={{ display: 'grid', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="form-input" style={{ flex: '1 1 220px' }} value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)} placeholder="Tags, comma-separated (e.g. VIP, Has dog)"
                    aria-label="Tags" />
                  <button type="button" className="btn btn-outline btn-sm" onClick={saveTags}>Save tags</button>
                  {detail.customer.phone_number && (
                    <a className="btn btn-outline btn-sm" target="_blank" rel="noreferrer"
                      href={`https://wa.me/${detail.customer.phone_number.replace(/\D/g, '')}`}>
                      <i className="fa-brands fa-whatsapp" /> WhatsApp
                    </a>
                  )}
                </div>

                <form onSubmit={addNote} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input className="form-input" style={{ flex: '1 1 260px' }} value={note} maxLength={2000}
                    onChange={(e) => setNote(e.target.value)} placeholder="Private note (only you can see it)"
                    aria-label="New note" />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!note.trim()}>Add note</button>
                </form>
                {detail.notes.map((n) => (
                  <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.9rem' }}>
                    <span>{n.note} <span style={{ color: 'var(--text-muted)' }}>· {fmtDate(n.created_at)}</span></span>
                    <button type="button" className="btn btn-ghost btn-sm" aria-label="Delete note"
                      onClick={() => void act(async () => {
                        await apiFetch(`/api/provider-tools/customers/${r.customer_id}/notes/${n.id}`, { method: 'DELETE' });
                        setDetail((d) => (d ? { ...d, notes: d.notes.filter((x) => x.id !== n.id) } : d));
                      })}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                ))}

                <div style={{ display: 'grid', gap: 4 }}>
                  <strong style={{ fontSize: '0.85rem' }}>History</strong>
                  {detail.bookings.map((b) => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.85rem', flexWrap: 'wrap' }}>
                      <span>{fmtDate(b.booking_time)} · {b.service_name || 'Service'}</span>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {format(b.total_price)} <StatusBadge status={b.status} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </article>
      ))}
      {visible.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No customers match.</p>}
    </div>
  );
}
