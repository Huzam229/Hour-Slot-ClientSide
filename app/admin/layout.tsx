'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import NotificationPanel from '@/components/NotificationPanel';
import styles from './admin-layout.module.css';

const LINKS = [
  { href: '/admin/dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
  { href: '/admin/users', icon: 'fa-users', label: 'User Accounts' },
  { href: '/admin/businesses', icon: 'fa-store', label: 'Businesses' },
  { href: '/admin/categories', icon: 'fa-tags', label: 'Categories' },
  { href: '/admin/geo-areas', icon: 'fa-map-location-dot', label: 'Geo areas' },
  { href: '/admin/disputes', icon: 'fa-scale-balanced', label: 'Disputes' },
  { href: '/admin/community', icon: 'fa-flag', label: 'Community' },
  { href: '/admin/settings', icon: 'fa-sliders', label: 'Settings' },
  { href: '/admin/audit-logs', icon: 'fa-shield-halved', label: 'Audit Trail' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'SUPER_ADMIN')) {
      router.push('/auth/login');
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading || !isAuthenticated || user?.role !== 'SUPER_ADMIN') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div
          className="spinner"
          style={{ width: 40, height: 40, borderTopColor: 'var(--accent-primary)', borderWidth: 4 }}
        />
      </div>
    );
  }

  const handleLogout = () => {
    document.cookie = 'hourslot_user_session=; path=/; max-age=0';
    logout();
    router.push('/auth/login');
  };

  const getPageTitle = () => {
    const match = LINKS.find((l) => pathname.startsWith(l.href));
    if (pathname.match(/\/admin\/businesses\/\d+/)) return 'Business verification';
    return match?.label || 'Administration';
  };

  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

  return (
    <div className={styles.adminContainer}>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className={styles.mobileOverlay}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${
          mobileOpen ? styles.sidebarMobileOpen : ''
        }`}
      >
        <div className={styles.sidebarHeader}>
          {!collapsed && (
            <Link href="/admin/dashboard" className={styles.logoArea}>
              <img src="/logo-hourslot.png" alt="HourSlot" className={styles.logoImg} />
            </Link>
          )}
          {collapsed && (
            <button type="button" className={styles.logoIcon} onClick={() => setCollapsed(false)} title="Expand">
              <img src="/logo-hourslot.png" alt="HourSlot" className={styles.logoImg} />
            </button>
          )}
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} />
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navItem} ${pathname.startsWith(link.href) ? styles.navActive : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className={styles.navIcon}>
                <i className={`fa-solid ${link.icon}`} />
              </span>
              {!collapsed && <span>{link.label}</span>}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
            <span className={styles.navIcon}>
              <i className="fa-solid fa-power-off" />
            </span>
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              type="button"
              className={styles.mobileMenuBtn}
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <i className="fa-solid fa-bars" />
            </button>
            <div>
              <div className={styles.platformLabel}>Platform</div>
              <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
            </div>
          </div>
          <div className={styles.topbarActions}>
            <span className={styles.roleIndicator}>Super Admin</span>
            <NotificationPanel />
            <div className={styles.adminProfile}>
              <div className={styles.avatar}>{initials}</div>
              <span className={styles.adminName}>
                {user.firstName} {user.lastName}
              </span>
            </div>
          </div>
        </header>
        <div className={styles.pageBody}>{children}</div>
      </main>
    </div>
  );
}
