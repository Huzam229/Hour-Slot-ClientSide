import { ReactNode } from 'react';
import styles from './register-shell.module.css';

/** Widen the auth form column for the multi-step register experience. */
export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
