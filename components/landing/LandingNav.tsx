'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import styles from './landing.module.css';

const LINKS = [
  { href: '/profile/explore', label: 'Explore', external: true },
  { href: '#how', label: 'How it works' },
  { href: '#providers', label: 'For providers' },
  { href: '#faq', label: 'FAQ' },
];

export default function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand}>
          <BrandLogo kind="wordmark" variant="color" height={28} priority className={styles.logo} />
        </Link>
        <nav className={styles.navCenter} aria-label="Primary">
          {LINKS.map((link) =>
            link.external ? (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            )
          )}
        </nav>
        <div className={styles.navActions}>
          <Link href="/auth/login" className={styles.navLink}>
            Sign in
          </Link>
          <Link href="/auth/register" className={styles.navCta}>
            Get started
          </Link>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {LINKS.map((link) =>
            link.external ? (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            )
          )}
          <Link href="/auth/login" onClick={() => setMenuOpen(false)}>
            Sign in
          </Link>
          <Link href="/auth/register" className={styles.navCta} onClick={() => setMenuOpen(false)}>
            Get started
          </Link>
        </div>
      )}
    </header>
  );
}
