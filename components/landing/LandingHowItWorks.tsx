import Reveal from '@/components/Reveal';
import { STEPS } from './data';
import styles from './landing.module.css';

export default function LandingHowItWorks() {
  return (
    <Reveal as="section" className={`${styles.band} ${styles.bandAlt}`} id="how">
      <div className={styles.wrap}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>How it works</p>
            <h2 className={styles.displayTitle}>From search to seat</h2>
            <p className={styles.sectionSub}>Three steps. Real openings. No chase.</p>
          </div>
        </div>

        <ol className={`${styles.stepTrack} hs-stagger`}>
          {STEPS.map((step) => (
            <li key={step.num} className={styles.stepItem}>
              <span className={styles.stepNum}>{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}
