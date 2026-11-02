'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import styles from './onboarding.module.css';

const CUSTOMER_FEATURES = [
  { icon: 'fa-magnifying-glass', title: 'Discover', desc: 'Find businesses near you by location or category' },
  { icon: 'fa-calendar-days', title: 'Book instantly', desc: 'Pick a time slot and book in seconds' },
  { icon: 'fa-clock', title: 'Reminders', desc: 'Never miss an appointment with smart notifications' },
  { icon: 'fa-star', title: 'Rate & review', desc: 'Share your experience and help others choose' },
];

const BUSINESS_FEATURES = [
  { icon: 'fa-store', title: 'Setup shop', desc: 'Add branches, services, staff & working hours' },
  { icon: 'fa-chart-simple', title: 'Dashboard', desc: 'Track bookings, revenue & customer insights' },
  { icon: 'fa-calendar-check', title: 'Smart scheduling', desc: 'Automated availability & conflict detection' },
  { icon: 'fa-chart-line', title: 'Grow', desc: 'Get discovered by thousands of local customers' },
];

export default function OnboardingPage() {
  const { user } = useAuth();

  const isBusiness = user?.role === 'BUSINESS_OWNER';
  const features = isBusiness ? BUSINESS_FEATURES : CUSTOMER_FEATURES;
  const firstName = user?.firstName || 'there';

  return (
    <div className={styles.page}>
      <div className={`surface ${styles.onboardingCard}`}>
        <span className={styles.welcomeIcon}>
          <i
            className={`fa-solid ${isBusiness ? 'fa-circle-check' : 'fa-hand-wave'}`}
            style={{ color: isBusiness ? 'var(--accent-secondary)' : 'var(--accent-primary)' }}
          />
        </span>
        <h1 className={styles.welcomeTitle}>
          Welcome, <span className={styles.welcomeHighlight}>{firstName}</span>
        </h1>
        <p className={styles.welcomeSubtitle}>
          {isBusiness
            ? 'Your business registration is being reviewed. Once approved you appear on Explore; Tax ID and bank statement unlock a Verified badge:'
            : 'You’re all set. Here’s how to get the most out of Duemet:'}
        </p>

        <div className={styles.features}>
          {features.map((f) => (
            <div key={f.title} className={styles.featureItem}>
              <span className={styles.featureIcon}>
                <i className={`fa-solid ${f.icon}`} />
              </span>
              <div className={styles.featureContent}>
                <span className={styles.featureTitle}>{f.title}</span>
                <span className={styles.featureDesc}>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.actionButtons}>
          {isBusiness ? (
            <>
              <Link href="/business/dashboard" className="btn btn-primary">
                Go to dashboard
              </Link>
              <Link href="/profile" className="btn btn-outline">
                View profile
              </Link>
            </>
          ) : (
            <>
              <Link href="/profile/explore" className="btn btn-primary">
                Explore businesses
              </Link>
              <Link href="/profile" className="btn btn-outline">
                Complete profile
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
