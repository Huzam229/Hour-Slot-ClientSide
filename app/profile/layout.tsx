'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import HeaderNav from '@/components/HeaderNav';
import NotificationPanel from '@/components/NotificationPanel';
import { loginHref, registerHref } from '@/lib/auth-redirect';
import { apiFetch } from '@/lib/api';
import styles from './profile-layout.module.css';

const GUEST_NAV = [
  { href: '/profile/explore', label: 'Explore', icon: 'fa-compass' },
  { href: '/#pricing', label: 'Pricing', icon: 'fa-tags' },
  { href: '/#how-it-works', label: 'How it works', icon: 'fa-circle-question' },
];

const CUSTOMER_NAV = [
  { href: '/profile/explore', icon: 'fa-compass', label: 'Explore', short: 'Explore', accent: 'teal' },
  { href: '/profile/bookings', icon: 'fa-calendar-check', label: 'My Bookings', short: 'Bookings', accent: 'indigo' },
  { href: '/profile/requests', icon: 'fa-file-lines', label: 'My Requests', short: 'Requests', accent: 'coral' },
  { href: '/profile/jobs', icon: 'fa-briefcase', label: 'Jobs', short: 'Jobs', accent: 'indigo' },
  { href: '/community', icon: 'fa-people-group', label: 'Community', short: 'Community', accent: 'violet' },
  { href: '/profile/favorites', icon: 'fa-heart', label: 'Favorites', short: 'Saved', accent: 'rose' },
  { href: '/profile/packages', icon: 'fa-gift', label: 'Packages', short: 'Packages', accent: 'violet' },
  { href: '/profile/addresses', icon: 'fa-location-dot', label: 'Addresses', short: 'Addresses', accent: 'indigo' },
  { href: '/profile', icon: 'fa-gear', label: 'Settings', short: 'Account', exact: true, accent: 'sky' },
] as const;

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [providerWorkspace, setProviderWorkspace] = useState(user?.role === 'BUSINESS_OWNER');

  const isActive = (href: string, exact?: boolean) => {
    if (href.startsWith('/#')) return false;
    if (exact) return pathname === href;
    if (href === '/profile/explore') {
      return (
        pathname === href ||
        pathname.startsWith('/profile/explore') ||
        pathname.startsWith('/profile/business') ||
        pathname.startsWith('/profile/book')
      );
    }
    if (href === '/profile') return pathname === '/profile';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = () => {
    document.cookie = 'hourslot_user_session=; path=/; max-age=0';
    logout();
    router.push('/profile/explore');
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setProviderWorkspace(false);
      return;
    }
    apiFetch<{ providerWorkspace?: boolean }>('/api/users/me')
      .then((me) => setProviderWorkspace(Boolean(me.providerWorkspace) || user?.role === 'BUSINESS_OWNER'))
      .catch(() => setProviderWorkspace(user?.role === 'BUSINESS_OWNER'));
  }, [isAuthenticated, user?.role]);

  if (loading) {
    return (
      <div className={styles.loadingShell}>
        <div className={styles.loadingInner}>
          <SkeletonBar />
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const isExplore = pathname.startsWith('/profile/explore');

    return (
      <div className={styles.dash}>
        {menuOpen && (
          <button type="button" className={styles.backdrop} aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        )}
        <aside
          className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''} ${menuOpen ? styles.sidebarOpen : ''}`}
        >
          <div className={styles.sidebarHeader}>
            {!sidebarCollapsed ? (
              <Link href="/" className={styles.sideBrand}>
                <Image src="/logo-hourslot.png" alt="HourSlot" width={132} height={40} priority className={styles.sideLogo} />
              </Link>
            ) : (
              <Link href="/" className={styles.sideBrandIcon} title="HourSlot home">
                <i className="fa-solid fa-calendar-check" />
              </Link>
            )}
            <button
              type="button"
              className={styles.sideToggle}
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <i className={`fa-solid ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} />
            </button>
          </div>
          <nav className={styles.sideNav} aria-label="Customer">
            {CUSTOMER_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.sideLink} ${styles[`sideAccent${item.accent.charAt(0).toUpperCase()}${item.accent.slice(1)}`]} ${isActive(item.href, 'exact' in item ? item.exact : undefined) ? styles.sideLinkActive : ''}`}
                onClick={() => setMenuOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className={styles.sideLinkIcon}>
                  <i className={`fa-solid ${item.icon}`} aria-hidden />
                </span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
          <button type="button" className={styles.sideLogout} onClick={handleLogout} title={sidebarCollapsed ? 'Sign out' : undefined}>
            <i className="fa-solid fa-right-from-bracket" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </aside>

        <div className={styles.dashMain}>
          <header className={styles.topbar}>
            <button
              type="button"
              className={styles.hamburger}
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <i className="fa-solid fa-bars" />
            </button>
            <div className={styles.topbarRight}>
              {(user.role === 'BUSINESS_OWNER' || providerWorkspace) && (
                <Link href="/business/dashboard" className={styles.businessSwitch}>
                  <i className="fa-solid fa-briefcase" />
                  <span>Provider mode</span>
                </Link>
              )}
              <NotificationPanel />
              <div className={styles.userWrap}>
                <button type="button" className={styles.userBtn} onClick={() => setUserOpen((v) => !v)}>
                  <span className={styles.avatar}>{initials || 'U'}</span>
                  <span className={styles.userMeta}>
                    <strong>{fullName}</strong>
                    <em>{(user.role || 'CUSTOMER').replaceAll('_', ' ')}</em>
                  </span>
                </button>
                {userOpen && (
                  <div className={styles.userMenu}>
                    <Link href="/profile" onClick={() => setUserOpen(false)}>Account settings</Link>
                    <button type="button" onClick={handleLogout}>Sign out</button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className={isExplore ? styles.dashBodyFill : styles.dashBody}>{children}</div>
          <nav className={styles.bottomNav} aria-label="Customer">
            {CUSTOMER_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.bottomLink} ${isActive(item.href, 'exact' in item ? item.exact : undefined) ? styles.bottomLinkOn : ''}`}
              >
                <i className={`fa-solid ${item.icon}`} aria-hidden />
                <span>{item.short}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    );
  }

  const isGuestBrowseRoute =
    pathname.startsWith('/profile/explore') ||
    pathname.startsWith('/profile/business') ||
    pathname.startsWith('/profile/book');

  return (
    <div className={styles.shell}>
      <header className={`app-header ${styles.header}`}>
        <div className={styles.headerInner}>
          <div className={styles.left}>
            <button
              type="button"
              className={styles.guestMenuBtn}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <i className="fa-solid fa-bars" />
            </button>
            <Link href="/" className={styles.brand}>
              <Image src="/logo-hourslot.png" alt="HourSlot" width={156} height={47} priority className={styles.logo} />
            </Link>
            <nav className={styles.nav} aria-label="Customer">
              {GUEST_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive(item.href) ? styles.navActive : ''}`}
                >
                  <i className={`fa-solid ${item.icon}`} aria-hidden />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className={styles.right}>
            <Suspense fallback={null}>
              <HeaderNav />
            </Suspense>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button type="button" className={styles.guestMenuBackdrop} aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <nav className={styles.guestMenuSheet} aria-label="Mobile">
            <div className={styles.guestMenuHead}>
              <strong>HourSlot</strong>
              <button type="button" className={styles.guestMenuClose} aria-label="Close" onClick={() => setMenuOpen(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            {GUEST_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.guestMenuLink} ${isActive(item.href) ? styles.guestMenuLinkOn : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <i className={`fa-solid ${item.icon}`} aria-hidden />
                {item.label}
              </Link>
            ))}
            <Link href={loginHref(pathname)} className={styles.guestMenuLink} onClick={() => setMenuOpen(false)}>
              <i className="fa-solid fa-right-to-bracket" aria-hidden /> Sign in
            </Link>
            <Link href={registerHref(pathname)} className={styles.guestMenuCta} onClick={() => setMenuOpen(false)}>
              Create account
            </Link>
          </nav>
        </>
      )}

      <main className={isGuestBrowseRoute ? styles.mainWide : styles.main}>{children}</main>

      <footer className={styles.guestFooter}>
        <div className={styles.guestFooterInner}>
          <div className={styles.guestFooterMain}>
            <div className={styles.guestFooterBrand}>
              <Link href="/" className={styles.guestFooterLogo}>
                <Image src="/logo-hourslot.png" alt="HourSlot" width={166} height={49} className={styles.logo} />
              </Link>
              <p>
                The live marketplace for local services — browse businesses, compare packages, and book real open
                slots.
              </p>
              <div className={styles.guestFooterSocials}>
                <a href="mailto:support@hourslot.app" aria-label="Email support">
                  <i className="fa-solid fa-envelope" />
                </a>
                <Link href="/profile/explore" aria-label="Explore marketplace">
                  <i className="fa-solid fa-compass" />
                </Link>
                <Link href="/#faq" aria-label="FAQ">
                  <i className="fa-solid fa-circle-question" />
                </Link>
              </div>
            </div>

            <div className={styles.guestFooterCols}>
              <div className={styles.guestFooterCol}>
                <h4>Marketplace</h4>
                <ul>
                  <li><Link href="/profile/explore">Explore businesses</Link></li>
                  <li><Link href="/profile/explore">Search by category</Link></li>
                  <li><Link href="/">HourSlot home</Link></li>
                </ul>
              </div>
              <div className={styles.guestFooterCol}>
                <h4>Your account</h4>
                <ul>
                  <li><Link href={loginHref(pathname)}>Sign in</Link></li>
                  <li><Link href={registerHref(pathname)}>Create account</Link></li>
                  <li><Link href={registerHref(pathname, 'business')}>List your business</Link></li>
                </ul>
              </div>
              <div className={styles.guestFooterCol}>
                <h4>Learn more</h4>
                <ul>
                  <li><Link href="/#how-it-works">How it works</Link></li>
                  <li><Link href="/#pricing">Pricing</Link></li>
                  <li><Link href="/#faq">FAQ</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.guestFooterBottom}>
            <p>© {new Date().getFullYear()} HourSlot. All rights reserved.</p>
            <div className={styles.guestFooterLinks}>
              <Link href="/">Home</Link>
              <Link href="/profile/explore">Explore</Link>
              <a href="mailto:support@hourslot.app">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SkeletonBar() {
  return (
    <>
      <div className={styles.skeletonLine} style={{ width: '40%', height: 28 }} />
      <div className={styles.skeletonLine} style={{ width: '100%', height: 120, marginTop: 24 }} />
    </>
  );
}
