'use client';

import { FormEvent, useState } from 'react';
import { apiFetch, openAuthedFile } from '@/lib/api';
import FormField from '@/components/FormField';
import { formatMoney } from '@/lib/money';
import styles from '@/app/phase1.module.css';

export type JobMaterial = { id: number; name: string; quantity: number; unitPrice: number; lineTotal: number };

export type JobVisit = {
  addressText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  arrivalWindowMinutes?: number;
  urgent?: boolean;
  urgentFee?: number;
};

/** Extra fields returned by GET /api/jobs/{id} alongside job/history/notes/media. */
export type JobExtrasDetail = {
  job?: { id: number; status?: string; currency?: string; estimatedAmount?: number; finalAmount?: number; customerConfirmedAt?: string | null };
  materials?: JobMaterial[];
  materialsTotal?: number;
  visit?: JobVisit;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
};

const LOCKED = ['COMPLETED', 'CANCELLED', 'DISPUTED'];

/** Visit address, materials, on-site payment, customer sign-off and receipt for a job. */
export default function JobExtras({
  detail,
  role,
  onChanged,
}: {
  detail: JobExtrasDetail;
  role: 'provider' | 'customer';
  onChanged: (message: string) => Promise<void> | void;
}) {
  const job = detail.job;
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!job) return null;
  const status = (job.status || '').toUpperCase();
  const currency = job.currency;
  const materials = detail.materials || [];
  const visit = detail.visit;
  const paid = (detail.paymentStatus || '').toUpperCase() === 'PAID';
  const canEditMaterials = role === 'provider' && !LOCKED.includes(status);
  const canCollect = role === 'provider' && !paid && (status === 'COMPLETED' || status === 'AWAITING_PAYMENT');
  const canConfirm = role === 'customer' && status === 'COMPLETED' && !job.customerConfirmedAt;
  const amountDue = job.finalAmount ?? (job.estimatedAmount ?? 0) + (detail.materialsTotal ?? 0);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged(success);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const addMaterial = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter what was used, e.g. "Cable 10m".');
      return;
    }
    void run(async () => {
      await apiFetch(`/api/jobs/${job.id}/materials`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), quantity: Number(quantity || 1), unitPrice: Number(unitPrice || 0) }),
      });
      setName('');
      setQuantity('1');
      setUnitPrice('');
    }, 'Material added.');
  };

  const mapHref =
    visit?.latitude != null && visit?.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${visit.latitude},${visit.longitude}`
      : visit?.addressText
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.addressText)}`
        : null;

  return (
    <>
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {visit && (visit.addressText || visit.urgent) && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>{visit.addressText ? 'Visit' : 'Urgent job'}</h2>
              {visit.arrivalWindowMinutes ? (
                <p>Arrival window: {visit.arrivalWindowMinutes} minutes from the booked time</p>
              ) : null}
            </div>
            {visit.urgent && <span className="btn btn-sm btn-warm">Urgent</span>}
          </div>
          {visit.addressText && <p>{visit.addressText}</p>}
          {visit.urgent && Number(visit.urgentFee) > 0 && (
            <p className={styles.muted}>Includes urgent fee of {formatMoney(Number(visit.urgentFee), currency)}</p>
          )}
          {role === 'provider' && mapHref && (
            <div className={styles.actions}>
              <a href={mapHref} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                <i className="fa-solid fa-route" /> Directions
              </a>
            </div>
          )}
        </section>
      )}

      {(materials.length > 0 || canEditMaterials) && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Materials</h2>
              <p>Parts used on this job are added to the bill.</p>
            </div>
            <strong>{formatMoney(detail.materialsTotal ?? 0, currency)}</strong>
          </div>
          {materials.length === 0 ? (
            <p className={styles.muted}>No materials added.</p>
          ) : (
            <div className={styles.quoteList}>
              {materials.map((m) => (
                <article className={styles.quoteCard} key={m.id}>
                  <div className={styles.cardHead}>
                    <div>
                      <h3>{m.name}</h3>
                      <p className={styles.muted}>
                        {m.quantity} × {formatMoney(m.unitPrice, currency)} = {formatMoney(m.lineTotal, currency)}
                      </p>
                    </div>
                    {canEditMaterials && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => apiFetch(`/api/jobs/${job.id}/materials/${m.id}`, { method: 'DELETE' }),
                            'Material removed.'
                          )
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {canEditMaterials && (
            <form onSubmit={addMaterial} className={styles.quoteAcceptForm} style={{ marginTop: 12 }}>
              <FormField label="Item" htmlFor="materialName" value={name} onChange={(e) => setName(e.target.value)} />
              <FormField
                label="Qty"
                htmlFor="materialQty"
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <FormField
                label="Unit price"
                htmlFor="materialPrice"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
              <div className={styles.actions}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                  Add material
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {(status === 'COMPLETED' || status === 'AWAITING_PAYMENT') && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Payment &amp; receipt</h2>
              <p>
                {paid
                  ? `Paid${detail.paymentMethod ? ` by ${detail.paymentMethod.replaceAll('_', ' ').toLowerCase()}` : ''}`
                  : `Amount due ${formatMoney(amountDue, currency)}`}
              </p>
            </div>
            {job.customerConfirmedAt && <span className={styles.muted}>Confirmed by customer</span>}
          </div>

          {canCollect && (
            <div className={styles.quoteAcceptForm}>
              <label htmlFor="collectMethod">Received by</label>
              <select id="collectMethod" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="WALLET">Mobile wallet</option>
              </select>
              <div className={styles.actions}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        apiFetch(`/api/jobs/${job.id}/collect-payment`, {
                          method: 'POST',
                          body: JSON.stringify({ method }),
                        }),
                      'Payment recorded.'
                    )
                  }
                >
                  Record {formatMoney(amountDue, currency)} received
                </button>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            {canConfirm && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={() =>
                  void run(() => apiFetch(`/api/jobs/${job.id}/confirm`, { method: 'POST' }), 'Thanks — work confirmed.')
                }
              >
                Confirm work is done
              </button>
            )}
            {status === 'COMPLETED' && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => openAuthedFile(`/api/jobs/${job.id}/receipt`).catch(() => setError('Could not open the receipt.'))}
              >
                <i className="fa-solid fa-file-invoice" /> Receipt (PDF)
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
