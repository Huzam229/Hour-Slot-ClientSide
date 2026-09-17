'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { OwnerPlanProvider, useOwnerPlan } from '@/lib/owner-plan-context';
import { OrgLocaleProvider } from '@/lib/org-locale-context';
import { hasFeature } from '@/lib/plan';
import { apiFetch } from '@/lib/api';
import NotificationPanel from '@/components/NotificationPanel';
import styles from './business-layout.module.css';

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

const OWNER_NAV: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'fa-chart-pie',
    children: [
      { href: '/business/dashboard', icon: 'fa-house', label: 'Dashboard' },
      { href: '/business/analytics', icon: 'fa-chart-line', label: 'Analytics' },
      { href: '/business/plan', icon: 'fa-crown', label: 'Subscription' },
      { href: '/business/organization', icon: 'fa-building', label: 'Organization' },
      { href: '/business/verification', icon: 'fa-file-shield', label: 'Verification' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: 'fa-calendar-check',
    children: [
      { href: '/business/bookings', icon: 'fa-calendar-check', label: 'Bookings' },
      { href: '/business/calendar', icon: 'fa-calendar-days', label: 'Calendar' },
      { href: '/business/requests', icon: 'fa-inbox', label: 'Requests' },
      { href: '/business/quotes', icon: 'fa-file-invoice-dollar', label: 'Quotes' },
      { href: '/business/jobs', icon: 'fa-briefcase', label: 'Jobs' },
      { href: '/business/customers', icon: 'fa-users', label: 'Customers' },
      { href: '/business/availability', icon: 'fa-clock', label: 'Availability' },
      { href: '/business/payments', icon: 'fa-wallet', label: 'Payments' },
    ],
  },
  {
    id: 'locations',
    label: 'Locations & team',
    icon: 'fa-network-wired',
    children: [
      { href: '/business/branches', icon: 'fa-location-dot', label: 'Branches' },
      { href: '/business/service-areas', icon: 'fa-map-location-dot', label: 'Service areas', entitlement: 'home_service' },
      { href: '/business/staff', icon: 'fa-user-tie', label: 'Staff' },
      { href: '/business/staff-services', icon: 'fa-handshake', label: 'Staff rates' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    icon: 'fa-tags',
    children: [
      { href: '/business/services', icon: 'fa-tags', label: 'Services' },
      { href: '/business/packages', icon: 'fa-gift', label: 'Packages', entitlement: 'packages' },
      { href: '/business/peak-pricing', icon: 'fa-bolt', label: 'Peak pricing', entitlement: 'peak_pricing' },
      { href: '/business/gallery', icon: 'fa-images', label: 'Gallery' },
    ],
  },
];

const STAFF_LINKS: NavLeaf[] = [
  { href: '/business/bookings', icon: 'fa-calendar-check', label: 'Bookings' },
  { href: '/business/availability', icon: 'fa-calendar-days', label: 'My availability' },
  { href: '/business/staff-profile', icon: 'fa-id-badge', label: 'My profile' },
];

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <OwnerPlanProvider>
      <OrgLocaleProvider>
        <BusinessLayoutInner>{children}</BusinessLayoutInner>
      </OrgLocaleProvider>
    </OwnerPlanProvider>
  );
}

function BusinessLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { plan, loaded: planLoaded } = useOwnerPlan();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [listingMode, setListingMode] = useState<string | null>(null);

  const isStaff = user?.role === 'BUSINESS_STAFF';
  const isIndividual = listingMode === 'INDIVIDUAL';
  const navGroups = useMemo(
    () =>
      OWNER_NAV.map((group) => ({
        ...group,
        children: isIndividual
          ? group.children.filter((child) => ![
              '/business/branches',
              '/business/staff',
              '/business/staff-services',
            ].includes(child.href))
          : group.children,
      })).filter((group) => group.children.length > 0),
    [isIndividual]
  );

  useEffect(() => {
    if (user?.role !== 'BUSINESS_OWNER') {
      return;
    }
    apiFetch<{ business?: { listingMode?: string } }>('/api/provider/profile')
      .then((profile) => setListingMode(profile.business?.listingMode || null))
      .catch(() => setListingMode(null));
  }, [user?.role, pathname]);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
      } else if (user?.role !== 'BUSINESS_OWNER' && user?.role !== 'BUSINESS_STAFF') {
        router.push('/profile/explore');
      } else if (isStaff) {
        const allowed = STAFF_LINKS.some((l) => pathname.startsWith(l.href));
        if (!allowed && pathname !== '/business/register') {
          router.replace('/business/bookings');
        }
      }
    }
  }, [loading, isAuthenticated, user, router, pathname, isStaff]);

  if (loading || !isAuthenticated || (user?.role !== 'BUSINESS_OWNER' && user?.role !== 'BUSINESS_STAFF')) {
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
          style={{ width: '40px', height: '40px', borderTopColor: 'var(--accent-primary)', borderWidth: '4px' }}
        />
      </div>
    );
  }

  const handleLogout = () => {
    document.cookie = 'hourslot_user_session=; path=/; max-age=0';
    logout();
    router.push('/auth/login');
  };

  const flatLeaves = isStaff
    ? STAFF_LINKS
    : navGroups.flatMap((g) => g.children);

  const getPageTitle = () => {
    const match = flatLeaves.find((l) => pathname.startsWith(l.href));
    return match?.label || 'Business dashboard';
  };

  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

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
          <i className={`fa-solid ${link.icon}`}></i>
        </span>
        {(!collapsed || forceShowLabel) && <span>{link.label}</span>}
        {(!collapsed || forceShowLabel) && locked && (
          <i className={`fa-solid fa-lock ${styles.navLock}`} aria-label="Upgrade required" />
        )}
      </Link>
    );
  };

  return (
    <div className={styles.adminContainer}>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            border: 'none',
            zIndex: 1090,
          }}
        />
      )}

      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}
      >
        <div className={styles.sidebarHeader}>
          {!collapsed && (
            <Link href={isStaff ? '/business/bookings' : '/business/dashboard'} className={styles.logoArea}>
              <img
                src="/logo-hourslot.png"
                alt="HourSlot Logo"
                style={{ height: '39px', width: 'auto', objectFit: 'contain' }}
              />
            </Link>
          )}
          {collapsed && (
            <button
              type="button"
              className={styles.logoIcon}
              style={{ marginLeft: '-25px', marginTop: '8px', cursor: 'pointer', background: 'none', border: 'none' }}
              onClick={() => setCollapsed(!collapsed)}
              title="Expand sidebar"
            >
              <img src="/logo-hourslot.png" alt="HourSlot Logo" style={{ height: '39px', width: 'auto' }} />
            </button>
          )}
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {isStaff
            ? STAFF_LINKS.map((link) => renderLeaf(link))
            : navGroups.map((group) => {
                const open = !collapsed && (
                  openGroups[group.id] ?? group.children.some((child) => pathname.startsWith(child.href))
                );
                const shouldRenderChildren = collapsed || open;
                return (
                  <div key={group.id} className={styles.navGroup}>
                    <button
                      type="button"
                      className={styles.navGroupBtn}
                      onClick={() =>
                        !collapsed && setOpenGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                      }
                      title={group.label}
                    >
                      <span className={styles.navIcon}>
                        <i className={`fa-solid ${group.icon}`}></i>
                      </span>
                      {!collapsed && <span>{group.label}</span>}
                      {!collapsed && (
                        <i
                          className={`fa-solid fa-chevron-${open ? 'down' : 'right'} ${styles.navChevron}`}
                        />
                      )}
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
            <span className={styles.navIcon}>
              <i className="fa-solid fa-right-from-bracket"></i>
            </span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className={styles.mainContent}>
        <header className={styles.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className={styles.mobileMenuBtn}
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <i className="fa-solid fa-bars" />
            </button>
            <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
          </div>

          <div className={styles.topbarActions} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {!isStaff && (
              <Link href="/profile" className={styles.roleSwitchBtn} title="Switch to customer view">
                <i className="fa-solid fa-users"></i>
                <span>Customer Mode</span>
              </Link>
            )}

            <NotificationPanel />

            <div className={styles.userProfile}>
              <div className={styles.userAvatar}>{initials}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {user.firstName} {user.lastName}
                </div>
                <div className={styles.userRole}>
                  {user.role === 'BUSINESS_OWNER' ? 'Business Owner' : 'Staff Member'}
                  {!isStaff && plan?.planName && <span className={styles.planChip}>{plan.planName}</span>}
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
