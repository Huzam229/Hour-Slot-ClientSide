'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { loginHref, registerHref } from '@/lib/auth-redirect';
import type { CustomerPackage } from '@/lib/types';
import styles from './booking.module.css';

export type PaymentChoice = 'ONLINE' | 'VENUE' | 'PACKAGE';

type CustomerAddress = { id: number; label?: string; addressLine: string; areaName?: string; city?: string; isDefault?: boolean };

/** Home-visit / urgent options, shown when the service can be done at the customer's location. */
export interface VisitOptions {
  /** Provider can come to the customer. */
  supported: boolean;
  /** Service only happens at the customer's location. */
  required: boolean;
  arrivalWindowMinutes: number;
  /** Provider is taking urgent jobs right now. */
  urgentAvailable: boolean;
  urgentSurchargePercent: number;
  addressId: number | null;
  urgent: boolean;
  onAddressChange: (id: number | null) => void;
  onUrgentChange: (urgent: boolean) => void;
}

interface ConfirmStepProps {
  isAuthenticated: boolean;
  returnUrl: string;
  serviceId: string;
  paymentMethod: PaymentChoice;
  selectedPackageId: number | null;
  clientNotes: string;
  termsAccepted: boolean;
  submitting: boolean;
  onPaymentChange: (method: PaymentChoice) => void;
  onPackageSelect: (id: number | null) => void;
  onNotesChange: (notes: string) => void;
  onTermsChange: (accepted: boolean) => void;
  onConfirm: () => void;
  visit?: VisitOptions;
  /** Provider's cancellation terms, shown above the confirm button. */
  terms?: { freeCancelHours: number; lateCancelFeePercent: number; noShowFeePercent: number; policyText?: string | null } | null;
  repeat?: RepeatOptions;
  /** Business whose promo codes apply; when set, a promo code field is shown. */
  promoBusinessId?: string;
  /** Called with the code once it has been checked, or null when removed. */
  onPromoChange?: (code: string | null) => void;
}

export type RepeatFrequency = 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

/** Book the same slot repeatedly; only offered for pay-at-venue. */
export interface RepeatOptions {
  frequency: RepeatFrequency;
  occurrences: number;
  onChange: (frequency: RepeatFrequency, occurrences: number) => void;
}

export default function ConfirmStep({
  isAuthenticated,
  returnUrl,
  serviceId,
  paymentMethod,
  selectedPackageId,
  clientNotes,
  termsAccepted,
  submitting,
  onPaymentChange,
  onPackageSelect,
  onNotesChange,
  onTermsChange,
  onConfirm,
  visit,
  terms,
  repeat,
  promoBusinessId,
  onPromoChange,
}: ConfirmStepProps) {
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; discount: number; finalPrice: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const applyPromo = async () => {
    setPromoError(null);
    try {
      const res = await apiFetch<{ code: string; discount: number; finalPrice: number }>(
        `/api/customer/promo-check?businessId=${promoBusinessId}&serviceId=${serviceId}&code=${encodeURIComponent(promoInput.trim())}`
      );
      setPromo(res);
      onPromoChange?.(res.code);
    } catch (e: unknown) {
      setPromo(null);
      onPromoChange?.(null);
      setPromoError((e as { message?: string })?.message || 'That code could not be applied.');
    }
  };
  const [eligiblePackages, setEligiblePackages] = useState<CustomerPackage[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);
  const visitSupported = !!visit?.supported;
  const onAddressChange = visit?.onAddressChange;
  const currentAddressId = visit?.addressId ?? null;
  const visitRequired = !!visit?.required;

  useEffect(() => {
    if (!isAuthenticated || !visitSupported) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddresses(null);
      return;
    }
    apiFetch<CustomerAddress[]>('/api/profile/addresses')
      .then((data) => {
        const list = data || [];
        setAddresses(list);
        // Home-only services need an address; preselect the default so most customers just confirm.
        if (visitRequired && currentAddressId == null && list.length > 0) {
          onAddressChange?.((list.find((a) => a.isDefault) || list[0]).id);
        }
      })
      .catch(() => setAddresses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, visitSupported]);

  useEffect(() => {
    if (!isAuthenticated || !serviceId) {
      setEligiblePackages([]);
      return;
    }
    apiFetch<CustomerPackage[]>(`/api/customer/packages/eligible?serviceId=${serviceId}`)
      .then((data) => setEligiblePackages(data || []))
      .catch(() => setEligiblePackages([]));
  }, [isAuthenticated, serviceId]);

  if (!isAuthenticated) {
    return (
      <div className={styles.signInPanel}>
        <h3>Sign in to complete your booking</h3>
        <p>
          You&apos;ve chosen your service and time. Sign in or create a free account to confirm —
          your selections are saved.
        </p>
        <div className={styles.signInActions}>
          <Link href={loginHref(returnUrl)} className={styles.signInBtn}>
            <i className="fa-solid fa-right-to-bracket" /> Sign in to continue
          </Link>
          <Link href={registerHref(returnUrl, 'customer')} className={styles.signInSecondary}>
            Create free account
          </Link>
        </div>
      </div>
    );
  }

  const atHome = visitSupported && visit?.addressId != null;
  const addressMissing = visitRequired && visit?.addressId == null;

  return (
    <>
      {visit?.supported && (
        <div className={styles.notesBlock}>
          <label>{visit.required ? 'Where should the provider come?' : 'Home visit (optional)'}</label>
          {addresses === null ? (
            <p>Loading your addresses…</p>
          ) : addresses.length === 0 ? (
            <p>
              No saved addresses yet. <Link href="/profile/addresses">Add an address</Link> and come back to this page.
            </p>
          ) : (
            <div className={styles.packageList}>
              {!visit.required && (
                <button
                  type="button"
                  className={`${styles.packageChip} ${visit.addressId == null ? styles.packageChipOn : ''}`}
                  onClick={() => visit.onAddressChange(null)}
                >
                  <strong>I&apos;ll go to the provider</strong>
                </button>
              )}
              {addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`${styles.packageChip} ${visit.addressId === a.id ? styles.packageChipOn : ''}`}
                  onClick={() => visit.onAddressChange(a.id)}
                >
                  <strong>{a.label || 'Address'}</strong>
                  <span>{[a.addressLine, a.areaName, a.city].filter(Boolean).join(', ')}</span>
                </button>
              ))}
            </div>
          )}
          {atHome && visit.arrivalWindowMinutes > 0 && (
            <p>The provider will arrive within {visit.arrivalWindowMinutes} minutes of your chosen time.</p>
          )}
        </div>
      )}

      {visit?.urgentAvailable && (
        <label className={styles.terms}>
          <input type="checkbox" checked={visit.urgent} onChange={(e) => visit.onUrgentChange(e.target.checked)} />
          <span>
            <strong>Urgent job</strong> — the provider is taking urgent work right now
            {visit.urgentSurchargePercent > 0 ? ` (+${visit.urgentSurchargePercent}% urgent fee)` : ''}.
          </span>
        </label>
      )}

      <div className={styles.payOptions}>
        <button
          type="button"
          className={`${styles.payOption} ${paymentMethod === 'ONLINE' ? styles.payOptionOn : ''}`}
          onClick={() => {
            onPaymentChange('ONLINE');
            onPackageSelect(null);
          }}
        >
          <span className={styles.payIcon}>
            <i className="fa-solid fa-credit-card" />
          </span>
          <div>
            <strong>Pay online</strong>
            <p>Secure card payment via Stripe</p>
          </div>
          <span className={styles.payRadio} />
        </button>
        <button
          type="button"
          className={`${styles.payOption} ${paymentMethod === 'VENUE' ? styles.payOptionOn : ''}`}
          onClick={() => {
            onPaymentChange('VENUE');
            onPackageSelect(null);
          }}
        >
          <span className={styles.payIcon}>
            <i className="fa-solid fa-store" />
          </span>
          <div>
            <strong>{atHome ? 'Pay the provider' : 'Pay at venue'}</strong>
            <p>{atHome ? 'Cash or transfer when the job is done' : 'Pay when you arrive'}</p>
          </div>
          <span className={styles.payRadio} />
        </button>
        {eligiblePackages.length > 0 && (
          <button
            type="button"
            className={`${styles.payOption} ${paymentMethod === 'PACKAGE' ? styles.payOptionOn : ''}`}
            onClick={() => onPaymentChange('PACKAGE')}
          >
            <span className={styles.payIcon}>
              <i className="fa-solid fa-gift" />
            </span>
            <div>
              <strong>Use package session</strong>
              <p>Redeem a remaining session</p>
            </div>
            <span className={styles.payRadio} />
          </button>
        )}
      </div>

      {paymentMethod === 'PACKAGE' && (
        <div className={styles.packageList}>
          {eligiblePackages.map((cp) => (
            <button
              key={cp.id}
              type="button"
              className={`${styles.packageChip} ${selectedPackageId === cp.id ? styles.packageChipOn : ''}`}
              onClick={() => onPackageSelect(cp.id)}
            >
              <strong>{cp.servicePackage.name}</strong>
              <span>{cp.sessionsRemaining} left</span>
            </button>
          ))}
        </div>
      )}

      {repeat && paymentMethod === 'VENUE' && (
        <div className={styles.notesBlock}>
          <label htmlFor="repeatFrequency">Repeat this booking</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              id="repeatFrequency"
              className="form-input"
              value={repeat.frequency}
              onChange={(e) => repeat.onChange(e.target.value as RepeatFrequency, repeat.occurrences)}
            >
              <option value="NONE">Just once</option>
              <option value="WEEKLY">Every week</option>
              <option value="BIWEEKLY">Every 2 weeks</option>
              <option value="MONTHLY">Every month</option>
            </select>
            {repeat.frequency !== 'NONE' && (
              <select
                className="form-input"
                aria-label="Number of appointments"
                value={repeat.occurrences}
                onChange={(e) => repeat.onChange(repeat.frequency, Number(e.target.value))}
              >
                {[2, 3, 4, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>{n} appointments</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {promoBusinessId && paymentMethod !== 'PACKAGE' && (
        <div className={styles.notesBlock}>
          <label htmlFor="promoCode">Promo code (optional)</label>
          {promo ? (
            <p style={{ margin: 0 }}>
              <strong>{promo.code}</strong> applied — you save about {promo.discount}.{' '}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                setPromo(null);
                setPromoInput('');
                onPromoChange?.(null);
              }}>Remove</button>
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="promoCode" className="form-input" value={promoInput} maxLength={32}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="e.g. EID20" />
              <button type="button" className="btn btn-outline btn-sm" disabled={!promoInput.trim()}
                onClick={() => void applyPromo()}>Apply</button>
            </div>
          )}
          {promoError && <p style={{ margin: 0, color: 'var(--accent-red)' }}>{promoError}</p>}
        </div>
      )}

      <div className={styles.notesBlock}>
        <label htmlFor="bookingNotes">Notes for the business (optional)</label>
        <textarea
          id="bookingNotes"
          value={clientNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Preferences, accessibility needs, or other details…"
        />
      </div>

      {terms && (terms.freeCancelHours > 0 || terms.policyText) && (
        <div className={styles.notesBlock}>
          <label>Cancellation policy</label>
          <p style={{ margin: 0 }}>
            {terms.freeCancelHours > 0
              ? `Free cancellation up to ${terms.freeCancelHours} hours before.` +
                (Number(terms.lateCancelFeePercent) > 0 ? ` Later cancellations: ${terms.lateCancelFeePercent}% fee.` : '') +
                (Number(terms.noShowFeePercent) > 0 ? ` No-shows: ${terms.noShowFeePercent}% fee.` : '')
              : ''}
            {terms.policyText ? ` ${terms.policyText}` : ''}
          </p>
        </div>
      )}

      <label className={styles.terms}>
        <input type="checkbox" checked={termsAccepted} onChange={(e) => onTermsChange(e.target.checked)} />
        <span>I agree to the Terms &amp; Conditions and Cancellation Policy.</span>
      </label>

      <button
        type="button"
        className={`btn btn-cta ${styles.confirmBtn}`}
        onClick={onConfirm}
        disabled={
          submitting || !termsAccepted || addressMissing || (paymentMethod === 'PACKAGE' && !selectedPackageId)
        }
      >
        {submitting ? 'Booking…' : 'Confirm booking'}
        {!submitting && <i className="fa-solid fa-check" />}
      </button>
    </>
  );
}
