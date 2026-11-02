'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import BookingProgress from './BookingProgress';
import BookingSummary from './BookingSummary';
import BookingPrefillBar from './BookingPrefillBar';
import GuestBrowseBanner from '@/components/guest/GuestBrowseBanner';
import CustomerFlowBar from '@/components/CustomerFlowBar';
import type { Branch, Service, Staff } from '@/lib/types';
import type { BookingFlowState, BookingStep } from '@/lib/booking-flow';
import { formatMoney } from '@/lib/money';
import styles from './booking.module.css';

interface BookingShellProps {
  businessId: string | number;
  businessName: string;
  businessThumb?: string | null;
  currentStep: BookingStep;
  stepTitle: string;
  stepLead: string;
  flow: BookingFlowState;
  service?: Service | null;
  branch?: Branch | null;
  staff?: Staff | null;
  specialistLabel?: string | null;
  specialistHint?: string | null;
  date?: string;
  slot?: string;
  price?: number;
  currency?: string;
  customerPackageLabel?: string | null;
  onBack: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  showFooter?: boolean;
  showGuestNote?: boolean;
  children: ReactNode;
}

export default function BookingShell({
  businessId,
  businessName,
  businessThumb,
  currentStep,
  stepTitle,
  stepLead,
  flow,
  service,
  branch,
  staff,
  specialistLabel,
  specialistHint,
  date,
  slot,
  price,
  currency,
  customerPackageLabel,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  showFooter = true,
  showGuestNote = false,
  children,
}: BookingShellProps) {
  const money = (amount: number) => formatMoney(amount, currency || service?.currency);

  const flowStep =
    currentStep === 'confirm' ? 'confirm' : currentStep === 'service' ? 'book' : 'book';

  return (
    <div className={styles.shell}>
      <CustomerFlowBar businessId={businessId} businessName={businessName} current={flowStep} />

      <header className={styles.header}>
        <div className={styles.backRow}>
          <button type="button" className={styles.backLink} onClick={onBack}>
            <i className="fa-solid fa-arrow-left" /> Back
          </button>
          <span className={styles.businessChip}>
            <span className={styles.businessThumb}>
              {businessThumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={businessThumb} alt="" />
              ) : (
                businessName.charAt(0)
              )}
            </span>
            {businessName}
          </span>
        </div>
        <BookingProgress currentStep={currentStep} />
        <div className={styles.titleBlock}>
          <h1>{stepTitle}</h1>
          <p>{stepLead}</p>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          {showGuestNote && <GuestBrowseBanner variant="booking" />}
          <BookingPrefillBar
            businessId={businessId}
            flow={flow}
            currentStep={currentStep}
            service={service}
            branch={branch}
            staff={staff}
            specialistLabel={specialistLabel}
            customerPackageLabel={customerPackageLabel}
          />
          <div key={currentStep} className="hs-rise-in">
            {children}
          </div>
        </div>
        <aside className={styles.aside}>
          <BookingSummary
            businessName={businessName}
            businessThumb={businessThumb}
            service={service}
            branch={branch}
            staff={staff}
            specialistLabel={specialistLabel}
            specialistHint={specialistHint}
            date={date}
            slot={slot}
            price={price}
            currency={currency}
          />
        </aside>
      </div>

      {showFooter && onContinue && (
        <div className={styles.footerActions}>
          <button type="button" className={styles.continueBtn} onClick={onContinue} disabled={continueDisabled}>
            {continueLabel} <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      )}

      {onContinue && (
        <div className={styles.mobileBar}>
          <div className={styles.mobileBarInner}>
            <div className={styles.mobileMeta}>
              <strong>{service?.name || 'Select a service'}</strong>
              <span>
                {service && price != null
                  ? `${money(price)} · ${service.durationMinutes} min`
                  : 'Complete the steps above'}
              </span>
            </div>
            <button type="button" className={styles.continueBtn} onClick={onContinue} disabled={continueDisabled}>
              {continueLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { Link };
