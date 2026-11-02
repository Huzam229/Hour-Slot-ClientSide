import Reveal from '@/components/Reveal';
import { VOICES } from './data';
import styles from './landing.module.css';

export default function LandingVoices() {
  return (
    <Reveal as="section" className={styles.voices} id="stories">
      <div className={styles.wrap}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Stories</p>
            <h2 className={styles.displayTitle}>What people notice first</h2>
            <p className={styles.sectionSub}>
              Clear openings, fewer missed appointments, and a quieter booking flow.
            </p>
          </div>
        </div>

        <div className={`${styles.voiceGrid} hs-stagger`}>
          {VOICES.map((voice) => (
            <blockquote key={voice.name} className={styles.voiceItem}>
              <p>&ldquo;{voice.quote}&rdquo;</p>
              <footer>
                <strong>{voice.name}</strong>
                <span>{voice.role}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
