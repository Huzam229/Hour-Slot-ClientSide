import Reveal from '@/components/Reveal';
import { TRUST_STATS } from './data';
import styles from './landing.module.css';

export default function LandingTrust() {
  return (
    <Reveal as="section" className={styles.trust}>
      <div className={styles.wrap}>
        <div className={`${styles.trustGrid} hs-stagger`}>
          {TRUST_STATS.map((stat) => (
            <div key={stat.label} className={styles.trustItem}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
