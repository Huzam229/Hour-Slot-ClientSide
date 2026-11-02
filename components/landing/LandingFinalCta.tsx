import Link from 'next/link';
import Reveal from '@/components/Reveal';
import styles from './landing.module.css';

export default function LandingFinalCta() {
  return (
    <Reveal as="section" className={styles.finalCta}>
      <div className={styles.finalPanel}>
        <p className={styles.brandWord}>Duemet</p>
        <h2 className={styles.finalTitle}>Ready when you are.</h2>
        <p>Find an opening, claim it, and keep the visit in one place.</p>
        <div className={styles.inlineActions}>
          <Link href="/auth/register" className={`${styles.btnPrimary} hs-press`}>
            Get started free
          </Link>
          <Link href="/auth/login" className={`${styles.btnGhost} hs-press`}>
            Sign in
          </Link>
        </div>
      </div>
    </Reveal>
  );
}
