'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import { StatCard, MetricGrid } from '@/components/StatCard';
import styles from './dashboard.module.css';

interface PlatformStats {
  totalUsers: number;
  totalBusinesses: number;
  totalBookings: number;
  totalCommissionEarnings: number;
  pendingVerifications: number;
}

interface UserReg {
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

interface BusinessReg {
  id: number;
  name: string;
  category?: string;
  status: string;
  createdAt: string;
  owner: {
    email: string;
  };
}

interface RecentRegs {
  users: UserReg[];
  businesses: BusinessReg[];
}

interface RevenuePoint {
  month: string;
  bookings: number;
  totalRevenue: number;
  commissionEarnings: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recent, setRecent] = useState<RecentRegs | null>(null);
  const [trend, setTrend] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, recentData, trendData] = await Promise.all([
        apiFetch<PlatformStats>('/api/admin/dashboard/stats'),
        apiFetch<RecentRegs>('/api/admin/dashboard/recent-registrations'),
        apiFetch<RevenuePoint[]>('/api/admin/dashboard/revenue-trend'),
      ]);
      setStats(statsData);
      setRecent(recentData);
      setTrend(trendData);
    } catch (err: any) {
      setError(err.message || 'Could not retrieve admin dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getSvgCoordinates = () => {
    if (trend.length === 0) return { path: '', area: '', points: [] as { x: number; y: number; value: number; label: string }[] };
    const width = 500;
    const height = 150;
    const padding = 20;
    const maxEarnings = Math.max(...trend.map((d) => d.commissionEarnings), 10);
    const minEarnings = 0;
    const xStep = (width - padding * 2) / Math.max(trend.length - 1, 1);
    const yScale = (height - padding * 2) / (maxEarnings - minEarnings || 1);

    const points = trend.map((d, index) => {
      const x = padding + index * xStep;
      const y = height - padding - (d.commissionEarnings - minEarnings) * yScale;
      return { x, y, value: d.commissionEarnings, label: d.month };
    });

    const path = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    return { path, area, points };
  };

  const { path: svgPath, area: svgArea, points: svgPoints } = getSvgCoordinates();

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading && !stats) {
    return (
      <div className={styles.dashboardWrapper}>
        <Skeleton variant="title" />
        <div className={styles.skeletonMetrics}>
          <Skeleton variant="card" count={4} />
        </div>
        <Skeleton variant="card" height={220} />
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper}>
      <PageHeader
        title="Admin dashboard"
        subtitle="Platform health, commission trends, and recent registrations."
      />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      )}

      {stats && stats.pendingVerifications > 0 && (
        <div className={`surface ${styles.pendingAlertCard}`}>
          <div className={styles.alertLeft}>
            <div className={styles.alertIcon}>
              <i className="fa-solid fa-bell" />
            </div>
            <div className={styles.alertText}>
              <span className={styles.alertTitle}>Businesses pending verification</span>
              <span className={styles.alertDesc}>
                {stats.pendingVerifications} registered businesses await documentation review.
              </span>
            </div>
          </div>
          <Link href="/admin/businesses?status=PENDING" className="btn btn-primary btn-sm">
            Go verify <i className="fa-solid fa-arrow-right" />
          </Link>
        </div>
      )}

      {stats && (
        <MetricGrid>
          <StatCard
            label="Commission earnings"
            value={`$${stats.totalCommissionEarnings.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon="fa-wallet"
          />
          <StatCard label="Total bookings" value={stats.totalBookings} icon="fa-calendar-check" />
          <StatCard label="Businesses" value={stats.totalBusinesses} icon="fa-store" />
          <StatCard label="Platform users" value={stats.totalUsers} icon="fa-users" />
        </MetricGrid>
      )}

      {trend.length > 0 && (
        <div className={styles.chartsSection}>
          <div className={`surface ${styles.chartCard}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Platform commission trends (last 6 months)</span>
              <span className={styles.muted}>Estimated USD</span>
            </div>
            <div className={styles.svgChartContainer}>
              <svg viewBox="0 0 500 150" className={styles.svgChart}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-primary)" />
                    <stop offset="100%" stopColor="var(--bg-secondary)" />
                  </linearGradient>
                </defs>
                <line x1="20" y1="20" x2="480" y2="20" className={styles.chartGrid} />
                <line x1="20" y1="52.5" x2="480" y2="52.5" className={styles.chartGrid} />
                <line x1="20" y1="85" x2="480" y2="85" className={styles.chartGrid} />
                <line x1="20" y1="117.5" x2="480" y2="117.5" className={styles.chartGrid} />
                <line x1="20" y1="130" x2="480" y2="130" className={styles.chartAxis} />
                {svgArea && <path d={svgArea} className={styles.chartArea} />}
                {svgPath && <path d={svgPath} className={styles.chartLine} />}
                {svgPoints.map((p, index) => (
                  <circle key={index} cx={p.x} cy={p.y} r="5" className={styles.chartPoint}>
                    <title>{`${p.label}: $${p.value}`}</title>
                  </circle>
                ))}
                {svgPoints.map((p, index) => (
                  <text key={`l-${index}`} x={p.x} y="146" textAnchor="middle" className={styles.chartLabels}>
                    {p.label}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          <div className={`surface ${styles.chartCard}`}>
            <span className={styles.cardTitle}>Recent earning metrics</span>
            <div className={styles.earnList}>
              {trend.slice(-3).map((t, idx) => (
                <div key={idx} className={styles.earnRow}>
                  <span>{t.month} commission</span>
                  <strong>${t.commissionEarnings.toFixed(2)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {recent && (
        <div className={styles.listsSection}>
          <div className="surface">
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Recent user registrations</span>
              <Link href="/admin/users" className={styles.viewAll}>
                View all
              </Link>
            </div>
            <div className={styles.simpleTableWrap}>
              <table className={styles.simpleTable}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={styles.emptyCell}>
                        No registrations yet.
                      </td>
                    </tr>
                  ) : (
                    recent.users.slice(0, 5).map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className={styles.regName}>
                            {u.firstName ? `${u.firstName} ${u.lastName || ''}` : 'New user'}
                          </div>
                          <div className={styles.regEmail}>{u.email}</div>
                        </td>
                        <td>
                          <StatusBadge status={u.role === 'CUSTOMER' ? 'ACTIVE' : u.role} />
                        </td>
                        <td className={styles.muted}>{formatDate(u.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {recent.users.length > 0 && (
                <div className={styles.mobileList} aria-label="Recent user registrations">
                  {recent.users.slice(0, 5).map((u) => (
                    <article key={u.id} className={styles.mobileRow}>
                      <div className={styles.mobileRowMain}>
                        <div className={styles.regName}>
                          {u.firstName ? `${u.firstName} ${u.lastName || ''}` : 'New user'}
                        </div>
                        <div className={styles.regEmail}>{u.email}</div>
                        <div className={styles.muted}>{formatDate(u.createdAt)}</div>
                      </div>
                      <StatusBadge status={u.role === 'CUSTOMER' ? 'ACTIVE' : u.role} />
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="surface">
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Recent businesses</span>
              <Link href="/admin/businesses" className={styles.viewAll}>
                View all
              </Link>
            </div>
            <div className={styles.simpleTableWrap}>
              <table className={styles.simpleTable}>
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Status</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.businesses.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={styles.emptyCell}>
                        No business applications.
                      </td>
                    </tr>
                  ) : (
                    recent.businesses.slice(0, 5).map((b) => (
                      <tr key={b.id}>
                        <td>
                          <div className={styles.regName}>{b.name}</div>
                          <div className={styles.regEmail}>
                            {b.category || 'Service business'} · {b.owner?.email}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={b.status} />
                        </td>
                        <td className={styles.muted}>{formatDate(b.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {recent.businesses.length > 0 && (
                <div className={styles.mobileList} aria-label="Recent businesses">
                  {recent.businesses.slice(0, 5).map((b) => (
                    <article key={b.id} className={styles.mobileRow}>
                      <div className={styles.mobileRowMain}>
                        <div className={styles.regName}>{b.name}</div>
                        <div className={styles.regEmail}>
                          {b.category || 'Service business'} · {b.owner?.email}
                        </div>
                        <div className={styles.muted}>{formatDate(b.createdAt)}</div>
                      </div>
                      <StatusBadge status={b.status} />
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
