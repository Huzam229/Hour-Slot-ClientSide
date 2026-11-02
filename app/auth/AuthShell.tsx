'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import AuthFlipStage from './AuthFlip';
import styles from './auth-layout.module.css';

const FEATURES = [
  {
    icon: 'fa-bolt',
    title: 'Book in seconds',
    text: 'Live availability across salons, clinics, and pros near you.',
  },
  {
    icon: 'fa-chart-line',
    title: 'Run your day',
    text: 'Services, staff, and calendars stay in one calm workspace.',
  },
  {
    icon: 'fa-lock',
    title: 'Built for trust',
    text: 'Verified listings and secure accounts for every side of the booking.',
  },
];

export default function AuthShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const isRegister = pathname?.startsWith('/auth/register');

  return (
    <div className={`${styles.shell} ${className} ${isRegister ? styles.shellRegister : ''}`}>
      <aside className={styles.brandPanel} aria-label="Duemet">
        <div className={styles.brandGlow} aria-hidden />
        <div className={styles.brandOrbA} aria-hidden />
        <div className={styles.brandOrbB} aria-hidden />
        <div className={styles.brandGrid} aria-hidden />

        <div className={styles.brandInner}>
          <Link href="/" className={styles.brandMark}>
            <BrandLogo kind="wordmark" variant="white" height={36} priority className={styles.brandLogo} />
          </Link>

          <p className={styles.brandEyebrow}>Appointment platform</p>
          <h1 className={styles.brandTitle}>
            Your time,
            <span className={styles.brandTitleAccent}> well booked.</span>
          </h1>
          <p className={styles.brandCopy}>
            Discover services, claim the right slot, and run appointments with clarity.
          </p>

          <ul className={styles.featureList}>
            {FEATURES.map((f, i) => (
              <li
                key={f.title}
                className={styles.featureItem}
                style={{ animationDelay: `${0.15 + i * 0.08}s` }}
              >
                <span className={styles.featureIcon} aria-hidden>
                  <i className={`fa-solid ${f.icon}`} />
                </span>
                <div className={styles.featureCopy}>
                  <strong>{f.title}</strong>
                  <p>{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.brandFoot}>Trusted by service teams & independents</p>
      </aside>

      <div className={`${styles.formPanel} ${isRegister ? styles.formPanelRegister : ''}`}>
        <div className={styles.formAtmosphere} aria-hidden />
        <div className={styles.mobileBrand}>
          <Link href="/">
            <BrandLogo kind="wordmark" variant="color" height={28} priority className={styles.mobileLogo} />
          </Link>
        </div>
        <div className={`${styles.formInner} ${isRegister ? styles.formInnerWide : ''}`}>
          <AuthFlipStage>{children}</AuthFlipStage>
        </div>
        {!isRegister && (
          <p className={styles.formFooter}>
            <Link href="/">← Back to Duemet home</Link>
          </p>
        )}
      </div>
    </div>
  );
}
