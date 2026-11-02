import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { PROVIDER_POINTS } from './data';
import styles from './landing.module.css';

export default function LandingProviders() {
  return (
    <Reveal as="section" className={styles.providers} id="providers">
      <div className={styles.providersInner}>
        <div className={styles.providersCopy}>
          <p className={styles.eyebrowOnDark}>For providers</p>
          <h2>Fill the week without spreadsheet chaos.</h2>
          <p>
            Owners and independents get live calendars, conflict-safe booking, staff invites,
            quotes, and verification — in one dashboard.
          </p>
          <div className={styles.inlineActions}>
            <Link href="/auth/register?role=business" className={styles.btnOnDark}>
              List a business
            </Link>
            <Link href="/auth/register?role=individual" className={styles.btnOutlineOnDark}>
              Join as individual
            </Link>
          </div>
        </div>
        <ul className={`${styles.providersList} hs-stagger`}>
          {PROVIDER_POINTS.map((point) => (
            <li key={point}>
              <i className="fa-solid fa-check" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}
