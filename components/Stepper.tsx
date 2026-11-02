'use client';

import styles from './ui.module.css';

interface Step {
  id: string;
  label: string;
}

interface StepperProps {
  steps: Step[];
  current: number;
  /** Tighter spacing for fixed-height auth screens */
  compact?: boolean;
}

export default function Stepper({ steps, current, compact = false }: StepperProps) {
  return (
    <div
      className={`${styles.stepper} ${compact ? styles.stepperCompact : ''}`}
      aria-label="Progress"
    >
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`${styles.step} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}>
              <div className={styles.stepDot}>
                {done ? <i className="fa-solid fa-check" aria-hidden /> : i + 1}
              </div>
              {!compact && <span className={styles.stepLabel}>{step.label}</span>}
              {compact && (
                <span className={styles.stepLabelCompact}>{step.label}</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={`${styles.stepConnector} ${compact ? styles.stepConnectorCompact : ''} ${done ? styles.stepConnectorDone : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
