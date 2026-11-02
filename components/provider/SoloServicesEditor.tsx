'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';

type Service = {
  id: number;
  name: string;
  description?: string;
  price?: number;
  basePrice?: number;
  currency?: string;
  durationMinutes: number;
  active?: boolean;
  pricingType?: string;
  serviceMode?: string;
  arrivalWindowMinutes?: number;
  urgentSurchargePercent?: number;
};

const WHERE_LABELS: Record<string, string> = {
  CUSTOMER_LOCATION: "At the customer's place",
  AT_PROVIDER: 'At my shop',
  BOTH: 'Either',
};

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  durationMinutes: '60',
  pricingType: 'FIXED',
  serviceMode: 'CUSTOMER_LOCATION',
  arrivalWindowMinutes: '0',
  urgentSurchargePercent: '0',
};

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 };

/** Add/list/delete a solo provider's services, including home-visit and urgent settings. */
export default function SoloServicesEditor({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const { format } = useOrgLocale();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Service[]>('/api/provider/services');
      setServices(data);
      onCountChange?.(data.length);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const homeVisit = form.serviceMode !== 'AT_PROVIDER';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/provider/services', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: Number(form.price || 0),
          durationMinutes: Number(form.durationMinutes || 60),
          pricingType: form.pricingType,
          requiresQuote: form.pricingType === 'QUOTE',
          serviceMode: form.serviceMode,
          allowsHomeService: homeVisit,
          arrivalWindowMinutes: homeVisit ? Number(form.arrivalWindowMinutes || 0) : 0,
          urgentSurchargePercent: Number(form.urgentSurchargePercent || 0),
        }),
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not save service.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this service?')) return;
    await apiFetch(`/api/provider/services/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <>
      {error && <div className="error-alert" style={{ marginBottom: 14 }}>{error}</div>}

      <form onSubmit={onSubmit} className="card" style={{ padding: 18, marginBottom: 18, display: 'grid', gap: 12 }}>
        <strong>Add a service</strong>
        <input
          required
          placeholder="Service name, e.g. Fan installation"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="form-input"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="form-input"
          rows={3}
        />
        <div style={gridStyle}>
          <input
            type="number"
            min={0}
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className="form-input"
            disabled={form.pricingType === 'QUOTE'}
          />
          <input
            type="number"
            min={15}
            placeholder="Duration (min)"
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            className="form-input"
          />
          <select
            value={form.pricingType}
            onChange={(e) => setForm((f) => ({ ...f, pricingType: e.target.value }))}
            className="form-input"
          >
            <option value="FIXED">Fixed price</option>
            <option value="QUOTE">Quote only</option>
          </select>
        </div>
        <div style={gridStyle}>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.85rem' }}>
            Where the work happens
            <select
              value={form.serviceMode}
              onChange={(e) => setForm((f) => ({ ...f, serviceMode: e.target.value }))}
              className="form-input"
            >
              {Object.entries(WHERE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {homeVisit && (
            <label style={{ display: 'grid', gap: 4, fontSize: '0.85rem' }}>
              Arrival window
              <select
                value={form.arrivalWindowMinutes}
                onChange={(e) => setForm((f) => ({ ...f, arrivalWindowMinutes: e.target.value }))}
                className="form-input"
              >
                <option value="0">Exact time</option>
                <option value="30">Within 30 min</option>
                <option value="60">Within 1 hour</option>
                <option value="120">Within 2 hours</option>
              </select>
            </label>
          )}
          <label style={{ display: 'grid', gap: 4, fontSize: '0.85rem' }}>
            Urgent job fee (%)
            <input
              type="number"
              min={0}
              max={200}
              value={form.urgentSurchargePercent}
              onChange={(e) => setForm((f) => ({ ...f, urgentSurchargePercent: e.target.value }))}
              className="form-input"
            />
          </label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Add service'}
        </button>
      </form>

      {loading ? (
        <Skeleton variant="card" height={160} />
      ) : services.length === 0 ? (
        <EmptyState icon="fa-tags" title="No services yet" description="Add the work you offer so customers can book or request quotes." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {services.map((s) => (
            <article key={s.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>{s.name}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                  {s.pricingType === 'QUOTE' ? 'Quote' : format(s.price ?? s.basePrice ?? 0)} · {s.durationMinutes} min
                  {s.serviceMode && WHERE_LABELS[s.serviceMode] ? ` · ${WHERE_LABELS[s.serviceMode]}` : ''}
                  {Number(s.urgentSurchargePercent) > 0 ? ` · urgent +${Number(s.urgentSurchargePercent)}%` : ''}
                </div>
                {s.description && <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>{s.description}</p>}
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => void remove(s.id)}>
                Delete
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
