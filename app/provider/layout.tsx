'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { OwnerPlanProvider, useOwnerPlan } from '@/lib/owner-plan-context';
import { OrgLocaleProvider } from '@/lib/org-locale-context';
import { hasFeature } from '@/lib/plan';
import { apiFetch } from '@/lib/api';
import NotificationPanel from '@/components/NotificationPanel';
import { fetchPresence, pushPresence } from '@/lib/provider-presence';
import styles from './provider-layout.module.css';

type NavLeaf = {
  href: string;
  icon: string;
  label: string;
  entitlement?: string;
};

type NavGroup = {
  id: string;
  label: string;
  icon: string;
  children: NavLeaf[];
};

const PROVIDER_NAV: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'fa-chart-pie',
    children: [
      { href: '/provider/dashboard', icon: 'fa-house', label: 'Dashboard' },
      { href: '/provider/analytics', icon: 'fa-chart-line', label: 'Reports' },
      { href: '/provider/plan', icon: 'fa-crown', label: 'Subscription' },
      { href: '/provider/verification', icon: 'fa-file-shield', label: 'Verification' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: 'fa-calendar-check',
    children: [
      { href: '/provider/bookings', icon: 'fa-calendar-check', label: 'Bookings' },
      { href: '/provider/calendar', icon: 'fa-calendar-days', label: 'Calendar' },
      { href: '/provider/requests', icon: 'fa-inbox', label: 'Requests' },
      { href: '/provider/quotes', icon: 'fa-file-invoice-dollar', label: 'Quotes' },
      { href: '/provider/jobs', icon: 'fa-briefcase', label: 'Jobs' },
      { href: '/provider/customers', icon: 'fa-users', label: 'Customers' },
      { href: '/provider/availability', icon: 'fa-clock', label: 'Availability' },
      { href: '/provider/booking-tools', icon: 'fa-sliders', label: 'Booking tools' },
      { href: '/provider/queue', icon: 'fa-people-line', label: 'Walk-in queue' },
      { href: '/provider/payments', icon: 'fa-wallet', label: 'Payments' },
    ],
  },
  {
    id: 'coverage',
    label: 'Coverage & catalog',
    icon: 'fa-map-location-dot',
    children: [
      { href: '/provider/service-areas', icon: 'fa-map-location-dot', label: 'Service areas', entitlement: 'home_service' },
      { href: '/provider/services', icon: 'fa-tags', label: 'Services' },
      { href: '/provider/gallery', icon: 'fa-images', label: 'Gallery' },
    ],
  },
];

const BLOCKED_PREFIXES = [
  '/provider/staff',
  '/provider/staff-services',
  '/provider/staff-profile',
  '/provider/branches',
  '/provider/organization',
  '/provider/packages',
  '/provider/peak-pricing',
];

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <OwnerPlanProvider>
      <OrgLocaleProvider>
        <ProviderLayoutInner>{children}</ProviderLayoutInner>
      </OrgLocaleProvider>
    </OwnerPlanProvider>
  );
}

function ProviderLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout, updateSession } = useAuth();
  const { plan, loaded: planLoaded } = useOwnerPlan();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [online, setOnline] = useState(Boolean(user?.isOnline));
  const [presenceBusy, setPresenceBusy] = useState(false);

  const isOnboarding = pathname.startsWith('/provider/onboarding');
  const flatLeaves = useMemo(() => PROVIDER_NAV.flatMap((g) => g.children), []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    const intentIndividual = user?.providerIntent === 'INDIVIDUAL';
    const listingIndividual = user?.listingMode === 'INDIVIDUAL';
    const isOwner = user?.role === 'BUSINESS_OWNER';
    if (!intentIndividual && !listingIndividual && !isOwner) {
      router.push('/profile/explore');
      return;
    }
    if (isOwner && user?.listingMode && user.listingMode !== 'INDIVIDUAL') {
      router.replace('/business/dashboard');
      return;
    }
    if (BLOCKED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      router.replace('/provider/dashboard');
    }
  }, [loading, isAuthenticated, user, router, pathname]);

  useEffect(() => {
    if (!isAuthenticated || user?.listingMode !== 'INDIVIDUAL' || isOnboarding) return;
    apiFetch<{ business?: { listingMode?: string; onboardingState?: string } }>('/api/provider/profile')
      .then((profile) => {
        updateSession({
          listingMode: profile.business?.listingMode || 'INDIVIDUAL',
          onboardingState: profile.business?.onboardingState,
          providerWorkspace: true,
        });
      })
      .catch(() => undefined);
  }, [isAuthenticated, user?.listingMode, isOnboarding, updateSession, pathname]);

  useEffect(() => {
    if (!isAuthenticated || user?.listingMode !== 'INDIVIDUAL' || isOnboarding) return;
    let cancelled = false;
    const beat = async () => {
      const snap = await pushPresence(true, 'HEARTBEAT');
      if (!cancelled && snap) {
        setOnline(Boolean(snap.isOnline));
        updateSession({ isOnline: snap.isOnline });
      }
    };
    void beat();
    const id = window.setInterval(() => void beat(), 90_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void beat();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isAuthenticated, user?.listingMode, isOnboarding, updateSession]);

  useEffect(() => {
    if (!isAuthenticated || user?.listingMode !== 'INDIVIDUAL') return;
    void fetchPresence().then((snap) => {
      if (snap) setOnline(Boolean(snap.isOnline));
    });
  }, [isAuthenticated, user?.listingMode]);

  if (loading || !isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent-primary)', borderWidth: 4 }} />
      </div>
    );
  }

  const togglePresence = async () => {
    setPresenceBusy(true);
    try {
      const next = !online;
      const snap = await pushPresence(next, next ? 'LOGIN' : 'MANUAL_OFFLINE');
      setOnline(Boolean(snap?.isOnline ?? next));
      updateSession({ isOnline: snap?.isOnline ?? next });
    } finally {
      setPresenceBusy(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const getPageTitle = () => {
    if (isOnboarding) return 'Onboarding';
    const match = flatLeaves.find((l) => pathname.startsWith(l.href));
    return match?.label || 'Provider dashboard';
  };

  const initials = `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`;

  const renderLeaf = (link: NavLeaf, forceShowLabel = false) => {
    const locked = !!link.entitlement && planLoaded && !hasFeature(plan, link.entitlement);
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`${styles.navItem} ${styles.navChild} ${pathname.startsWith(link.href) ? styles.navActive : ''} ${locked ? styles.navLocked : ''}`}
        onClick={() => setMobileOpen(false)}
      >
        <span className={styles.navIcon}>
          <i className={`fa-solid ${link.icon}`} />
        </span>
        {(!collapsed || forceShowLabel) && <span>{link.label}</span>}
        {(!collapsed || forceShowLabel) && locked && (
          <i className={`fa-solid fa-lock ${styles.navLock}`} aria-label="Upgrade required" />
        )}
      </Link>
    );
  };

  if (isOnboarding) {
    return <main style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>{children}</main>;
  }

  return (
    <div className={styles.adminContainer}>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', border: 'none', zIndex: 1090 }}
        />
      )}

      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          {!collapsed && (
            <Link href="/provider/dashboard" className={styles.logoArea}>
              <img src="/duemet-logo-nav.png" alt="Duemet Logo" style={{ height: 26, width: 'auto', objectFit: 'contain', display: 'block' }} />
            </Link>
          )}
          {collapsed ? (
            <button type="button" className={styles.logoIcon} style={{ cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }} onClick={() => setCollapsed(false)} title="Expand sidebar">
              <img src="/duemet-mark.png" alt="Duemet" style={{ width: 29, height: 29, objectFit: 'contain', display: 'block' }} />
            </button>
          ) : (
            <button type="button" className={styles.toggleBtn} onClick={() => setCollapsed(true)} title="Collapse sidebar">
              <i className="fa-solid fa-angles-left" />
            </button>
          )}
        </div>

        <nav className={styles.sidebarNav}>
          {PROVIDER_NAV.map((group) => {
            const open = !collapsed && (openGroups[group.id] ?? group.children.some((child) => pathname.startsWith(child.href)));
            const shouldRenderChildren = collapsed || open;
            return (
              <div key={group.id} className={styles.navGroup}>
                <button
                  type="button"
                  className={styles.navGroupBtn}
                  onClick={() => !collapsed && setOpenGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                  title={group.label}
                >
                  <span className={styles.navIcon}><i className={`fa-solid ${group.icon}`} /></span>
                  {!collapsed && <span>{group.label}</span>}
                  {!collapsed && <i className={`fa-solid fa-chevron-${open ? 'down' : 'right'} ${styles.navChevron}`} />}
                </button>
                {shouldRenderChildren && (
                  <div className={`${styles.navChildren} ${open ? styles.navChildrenOpen : ''}`}>
                    {group.children.map((child) => renderLeaf(child, collapsed))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            <span className={styles.navIcon}><i className="fa-solid fa-right-from-bracket" /></span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className={styles.mainContent}>
        <header className={styles.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className={styles.mobileMenuBtn} aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <i className="fa-solid fa-bars" />
            </button>
            <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
          </div>

          <div className={styles.topbarActions}>
            <button
              type="button"
              className={styles.roleSwitchBtn}
              onClick={() => void togglePresence()}
              disabled={presenceBusy || user?.listingMode !== 'INDIVIDUAL'}
              title={online ? 'Go offline' : 'Go online'}
            >
              <i aria-hidden style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: online ? '#22c55e' : '#9ca3af', display: 'inline-block',
                boxShadow: online ? '0 0 0 3px #dcfce7' : 'none',
              }} />
              <span>{online ? 'Online' : 'Offline'}</span>
            </button>

            <Link href="/profile" className={styles.roleSwitchBtn} title="Switch to customer view">
              <i className="fa-solid fa-users" />
              <span>Customer Mode</span>
            </Link>

            <NotificationPanel />

            <div className={styles.userProfile}>
              <div className={styles.userAvatar}>{initials}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{user?.firstName} {user?.lastName}</div>
                <div className={styles.userRole}>
                  Individual professional
                  {plan?.planName && <span className={styles.planChip}>{plan.planName}</span>}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.pageBody}>{children}</main>
      </div>
    </div>
  );
}
