'use client';

import styles from './AuthProgress.module.css';

interface Step {
  id: string;
  label: string;
}

export default function AuthProgress({ steps, current }: { steps: Step[]; current: number }) {
  const total = Math.max(steps.length - 1, 1);
  const fill =
    steps.length <= 1 ? 1 : Math.min(Math.max(current / total, 0), 1);
  const active = steps[Math.min(current, steps.length - 1)] || steps[0];

  return (
    <div className={styles.wrap} aria-label="Registration progress">
      <div className={styles.meta}>
        <span className={styles.stepIndex}>
          {String(current + 1).padStart(2, '0')}
          <span className={styles.stepOf}>/{String(steps.length).padStart(2, '0')}</span>
        </span>
        <span className={styles.stepName}>{active?.label}</span>
      </div>
      <div className={styles.rail} role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={steps.length}>
        <div className={styles.railTrack} />
        <div className={styles.railFill} style={{ width: `${fill * 100}%` }} />
        <div className={styles.dots}>
          {steps.map((step, i) => {
            const done = i < current;
            const on = i === current;
            return (
              <span
                key={step.id}
                className={`${styles.dot} ${done ? styles.dotDone : ''} ${on ? styles.dotOn : ''}`}
                title={step.label}
              >
                {done ? <i className="fa-solid fa-check" aria-hidden /> : null}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
