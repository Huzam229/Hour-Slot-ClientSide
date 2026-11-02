'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';

type Promo = {
  id: number;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minAmount: number;
  validUntil?: string | null;
  maxUses?: number | null;
  perCustomerLimit: number;
  active: boolean;
  timesUsed: number;
};

const EMPTY = { code: '', discountType: 'PERCENT', discountValue: '', minAmount: '', validUntil: '', maxUses: '' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 } as const;
const label = { display: 'grid', gap: 4, fontSize: '0.85rem' } as const;

/** Create and manage promo codes customers enter when booking. */
export default function PromoCodesPanel() {
  const { format } = useOrgLocale();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setPromos(await apiFetch<Promo[]>('/api/provider-tools/promos'));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not load promo codes.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/provider-tools/promos', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          minAmount: form.minAmount ? Number(form.minAmount) : 0,
          validUntil: form.validUntil ? `${form.validUntil}T23:59` : null,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          perCustomerLimit: 1,
        }),
      });
      setForm(EMPTY);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not create the code.');
    } finally {
      setSaving(false);
    }
  };

  const describe = (p: Promo) =>
    (p.discountType === 'PERCENT' ? `${p.discountValue}% off` : `${format(p.discountValue)} off`) +
    (Number(p.minAmount) > 0 ? ` over ${format(p.minAmount)}` : '') +
    (p.validUntil ? ` · until ${new Date(p.validUntil).toLocaleDateString()}` : '') +
    ` · used ${p.timesUsed}${p.maxUses ? `/${p.maxUses}` : ''}`;

  return (
    <section className="card" style={{ padding: 18, marginBottom: 18, display: 'grid', gap: 12 }}>
      <strong>Promo codes</strong>
      <p style={{ margin: 0, color: 'var(--text-muted)' }}>
        Share a code (e.g. on WhatsApp or Instagram) — customers enter it when they book. Each customer can use a code once.
      </p>
      {error && <div className="error-alert">{error}</div>}
      <form onSubmit={create} style={{ display: 'grid', gap: 10 }}>
        <div style={grid}>
          <label style={label}>Code
            <input className="form-input" required value={form.code} placeholder="EID20" maxLength={32}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
          </label>
          <label style={label}>Discount
            <select className="form-input" value={form.discountType}
              onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}>
              <option value="PERCENT">Percent (%)</option>
              <option value="FIXED">Fixed amount</option>
            </select>
          </label>
          <label style={label}>{form.discountType === 'PERCENT' ? 'Percent off' : 'Amount off'}
            <input className="form-input" required type="number" min={1} max={form.discountType === 'PERCENT' ? 100 : undefined}
              value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))} />
          </label>
          <label style={label}>Minimum spend (optional)
            <input className="form-input" type="number" min={0} value={form.minAmount}
              onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))} />
          </label>
          <label style={label}>Last day (optional)
            <input className="form-input" type="date" value={form.validUntil}
              onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} />
          </label>
          <label style={label}>Total uses (optional)
            <input className="form-input" type="number" min={1} value={form.maxUses}
              onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))} />
          </label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifySelf: 'start' }}>
          Create code
        </button>
      </form>
      {promos.map((p) => (
        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center',
          opacity: p.active ? 1 : 0.6 }}>
          <span><strong>{p.code}</strong> · {describe(p)}{p.active ? '' : ' · paused'}</span>
          <button type="button" className="btn btn-outline btn-sm"
            onClick={() => void apiFetch(`/api/provider-tools/promos/${p.id}/${p.active ? 'deactivate' : 'activate'}`, { method: 'PUT' })
              .then(load).catch((e) => setError(e?.message || 'Could not update the code.'))}>
            {p.active ? 'Pause' : 'Resume'}
          </button>
        </div>
      ))}
    </section>
  );
}
