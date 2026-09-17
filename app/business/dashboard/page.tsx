'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import CustomSelect from '@/components/CustomSelect';
import { StatCard, MetricGrid } from '@/components/StatCard';
import { useOrgLocale } from '@/lib/org-locale-context';
import styles from './dashboard.module.css';

interface Category {
  id: number;
  name: string;
}

interface Customer {
  id: number;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Booking {
  id: number;
  customer: Customer;
  branch: {
    id: number;
    name: string;
  };
  service: {
    id: number;
    name: string;
    durationMinutes: number;
  };
  bookingTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'IN_PROGRESS' | 'RESCHEDULED';
  price: number;
}

interface BusinessProfile {
  id: number;
  name: string;
  description: string;
  logoUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  verified: boolean;
  commissionRate: number;
  rating: number;
  rejectionReason?: string;
  slug?: string;
  registrationNumber?: string;
  galleryUrls?: string;
  primaryCategory?: Category | null;
  secondaryCategories?: Category[];
}

export default function BusinessDashboardPage() {
  const { format } = useOrgLocale();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile'>('overview');
  
  const [setup, setSetup] = useState({
    branches: 0,
    services: 0,
    staff: 0,
    hours: 0,
  });
  const [docsReady, setDocsReady] = useState(false);
  const [todayOps, setTodayOps] = useState<{ bookingsCount: number; jobsCount: number } | null>(null);
  const [opsStatus, setOpsStatus] = useState('AVAILABLE');
  const [savingOps, setSavingOps] = useState(false);

  // Quote of the day and Weather states
  const [quote, setQuote] = useState<{ quote: string; author: string } | null>(null);
  const [weather, setWeather] = useState<{ temp: number; wind: number; code: number; description: string; icon: string } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    logoUrl: string;
    registrationNumber: string;
    primaryCategoryId: string;
    secondaryCategoryIds: number[];
  }>({
    name: '',
    description: '',
    logoUrl: '',
    registrationNumber: '',
    primaryCategoryId: '',
    secondaryCategoryIds: [],
  });

  const fetchWeather = async (lat: number, lng: number) => {
    setLoadingWeather(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
      const data = await res.json();
      if (data?.current_weather) {
        const temp = data.current_weather.temperature;
        const wind = data.current_weather.windspeed;
        const code = data.current_weather.weathercode;
        
        // Map WMO weather code to icon and text
        let description = 'Clear Sky';
        let icon = 'fa-sun';
        
        if (code === 0) { description = 'Clear Sky'; icon = 'fa-sun'; }
        else if (code >= 1 && code <= 3) { description = 'Partly Cloudy'; icon = 'fa-cloud-sun'; }
        else if (code === 45 || code === 48) { description = 'Foggy'; icon = 'fa-smog'; }
        else if (code >= 51 && code <= 55) { description = 'Light Drizzle'; icon = 'fa-cloud-rain'; }
        else if (code >= 61 && code <= 65) { description = 'Rainy'; icon = 'fa-cloud-showers-heavy'; }
        else if (code >= 71 && code <= 75) { description = 'Snowy'; icon = 'fa-snowflake'; }
        else if (code >= 80 && code <= 82) { description = 'Rain Showers'; icon = 'fa-cloud-sun-rain'; }
        else if (code === 95) { description = 'Thunderstorms'; icon = 'fa-cloud-bolt'; }
        
        setWeather({ temp, wind, code, description, icon });
      }
    } catch (err) {
      console.warn('Failed to fetch weather data for branch, using static fallback.', err);
      setWeather({
        temp: 24.5,
        wind: 12.0,
        code: 1,
        description: 'Partly Cloudy',
        icon: 'fa-cloud-sun',
      });
    } finally {
      setLoadingWeather(false);
    }
  };

  const loadBusinessProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, categoriesData, branches, services, staff] = await Promise.all([
        apiFetch<BusinessProfile>('/api/business/profile'),
        apiFetch<any[]>('/api/public/categories'),
        apiFetch<{ id: number; latitude?: number; longitude?: number }[]>('/api/business/branches').catch(() => []),
        apiFetch<{ id: number }[]>('/api/business/services').catch(() => []),
        apiFetch<{ id: number }[]>('/api/business/staff').catch(() => []),
      ]);
      setBusiness(data);

      let hoursCount = 0;
      let bookingsData: Booking[] = [];
      let lat = 37.7749;
      let lng = -122.4194;

      if (branches.length > 0) {
        const primaryBranch = branches[0];
        const primaryBranchId = primaryBranch.id;
        const hours = await apiFetch<unknown[]>(
          `/api/business/branches/${primaryBranchId}/working-hours`
        ).catch(() => []);
        hoursCount = hours.length;

        bookingsData = await apiFetch<Booking[]>(
          `/api/bookings/branch/${primaryBranchId}`
        ).catch(() => []);

        if (primaryBranch?.latitude && primaryBranch?.longitude) {
          lat = primaryBranch.latitude;
          lng = primaryBranch.longitude;
        }
      }
      setBookings(bookingsData);

      // Load weather dynamically
      void fetchWeather(lat, lng);

      setSetup({
        branches: branches.length,
        services: services.length,
        staff: staff.length,
        hours: hoursCount,
      });

      const flat: Category[] = [];
      const traverse = (node: any) => {
        flat.push({ id: node.id, name: node.name });
        if (node.subcategories && node.subcategories.length > 0) {
          node.subcategories.forEach(traverse);
        }
      };
      categoriesData.forEach(traverse);
      setAvailableCategories(flat);

      setFormData({
        name: data.name || '',
        description: data.description || '',
        logoUrl: data.logoUrl || '',
        registrationNumber: data.registrationNumber || '',
        primaryCategoryId: data.primaryCategory ? data.primaryCategory.id.toString() : '',
        secondaryCategoryIds: data.secondaryCategories ? data.secondaryCategories.map((c) => c.id) : [],
      });
    } catch (err: any) {
      setError(err?.message || 'Could not load business profile. Have you registered yet?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessProfile();
    
    // Load daily inspirational business quote dynamically on mount
    fetch('https://dummyjson.com/quotes/random')
      .then((res) => res.json())
      .then((data) => {
        if (data?.quote) {
          setQuote({ quote: data.quote, author: data.author });
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch quote of the day, using static fallback.', err);
        setQuote({
          quote: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
          author: 'Winston Churchill',
        });
      });

    apiFetch<{
      readiness?: {
        tier1SubmittedCount?: number;
        tier1RequiredCount?: number;
      };
    }>('/api/business/verification-documents')
      .then((data) => {
        const submitted = data.readiness?.tier1SubmittedCount ?? 0;
        const required = data.readiness?.tier1RequiredCount ?? 3;
        setDocsReady(submitted >= required);
      })
      .catch(() => setDocsReady(false));

    apiFetch<{ bookings?: unknown[]; jobs?: unknown[]; opsStatus?: string }>('/api/provider/ops/today')
      .then((data) => {
        setTodayOps({
          bookingsCount: Array.isArray(data.bookings) ? data.bookings.length : 0,
          jobsCount: Array.isArray(data.jobs) ? data.jobs.length : 0,
        });
        if (data.opsStatus) setOpsStatus(data.opsStatus);
      })
      .catch(() => setTodayOps(null));
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSecondaryCategoryChange = (categoryId: number) => {
    setFormData((prev) => {
      const current = prev.secondaryCategoryIds;
      const updated = current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId];
      return { ...prev, secondaryCategoryIds: updated };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Business name is required.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await apiFetch('/api/business/profile', {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          primaryCategoryId: formData.primaryCategoryId ? parseInt(formData.primaryCategoryId) : null,
          galleryUrls: business?.galleryUrls || '',
        }),
      });
      setMessage('Profile updated successfully!');
      await loadBusinessProfile();
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        <Skeleton variant="title" />
        <Skeleton variant="card" count={1} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', margin: '20px 0' }}>
          <Skeleton variant="card" count={4} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  if (error && !business) {
    return (
      <div className={styles.dashboardContainer}>
        <EmptyState
          icon="fa-briefcase"
          title="No business registered"
          description="Register your business on HourSlot to list branches, staff, and start taking bookings."
          actionLabel="Register Business"
          onAction={() => {
            window.location.href = '/business/register';
          }}
        />
      </div>
    );
  }

  const checklist = [
    { done: !!business?.name && !!business?.description, label: 'Complete profile info', href: '/business/dashboard' },
    { done: setup.branches > 0, label: 'Add a branch location', href: '/business/branches' },
    { done: setup.services > 0, label: 'Create offered services', href: '/business/services' },
    { done: setup.staff > 0, label: 'Assign staff members', href: '/business/staff' },
    { done: setup.hours > 0, label: 'Set active hours', href: '/business/availability' },
    { done: docsReady, label: 'Upload Tier 1 verification documents', href: '/business/verification' },
  ];
  const readyForReview = checklist.every((c) => c.done);
  const doneCount = checklist.filter((c) => c.done).length;
  const setupPercent = Math.round((doneCount / checklist.length) * 100);

  const previewPath = business?.id ? `/profile/business/${business.id}` : '';

  const handlePreviewListing = () => {
    if (!previewPath) return;
    window.open(previewPath, '_blank', 'noopener,noreferrer');
  };

  // Compute dynamic stats
  const activeBookingsCount = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING').length;
  const estimatedRevenue = bookings.reduce((sum, b) => b.status !== 'CANCELLED' ? sum + b.price : sum, 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookingsCount = bookings.filter((b) => b.bookingTime.startsWith(todayStr)).length;

  const upcomingAppointments = bookings
    .filter((b) => b.status !== 'CANCELLED' && b.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.bookingTime).getTime() - new Date(b.bookingTime).getTime())
    .slice(0, 5);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${date} at ${time}`;
  };

  return (
    <div className={styles.dashboardContainer}>
      <PageHeader
        title={business?.name || 'Business dashboard'}
        subtitle="Manage your business operations, listing status, and public bookings page."
      />

      {business?.status === 'PENDING' && (
        <div className={styles.statusAlertPending}>
          <i className="fa-solid fa-clock-rotate-left" />
          <div>
            <strong>Listing Pending Super Admin Review</strong>
            <p>
              Your listing is being audited. Complete setup and upload Tier 1 documents under Verification so Super Admin can approve your listing.
            </p>
          </div>
        </div>
      )}

      {business?.status === 'REJECTED' && (
        <div className={styles.statusAlertRejected}>
          <i className="fa-solid fa-circle-xmark" />
          <div>
            <strong>Registration Update Requested</strong>
            <p>
              Reason: {business.rejectionReason || 'Details require revision'}. Update your license details or verification files below, then submit for review.
            </p>
          </div>
        </div>
      )}

      {business?.status === 'SUSPENDED' && (
        <div className={styles.statusAlertSuspended}>
          <i className="fa-solid fa-triangle-exclamation" />
          <div>
            <strong>Account Temporarily Suspended</strong>
            <p>Your listing is hidden from search and client booking is locked. Contact support for assistance.</p>
          </div>
        </div>
      )}

      {message && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" /> {message}
        </div>
      )}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {/* Tabs Selector */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="fa-solid fa-chart-line" /> Overview
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'profile' ? styles.tabButtonActive : ''}`}
          onClick={() => {
            setActiveTab('profile');
            setMessage(null);
            setError(null);
          }}
        >
          <i className="fa-solid fa-store" /> Profile Settings
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className={styles.overviewWrapper}>
          {/* Welcome Banner */}
          <div className={styles.dashboardHero}>
            <div className={styles.heroMain}>
              <div className={styles.heroAvatarContainer}>
                {business?.logoUrl ? (
                  <img src={business.logoUrl} alt="Logo" className={styles.heroLogo} />
                ) : (
                  <div className={styles.heroLogoPlaceholder}>
                    <i className="fa-solid fa-store" />
                  </div>
                )}
              </div>
              <div className={styles.heroMeta}>
                <h3>{business?.name}</h3>
                <p className={styles.heroSubtitle}>
                  {business?.primaryCategory?.name || 'Service Provider'} •{' '}
                  <span className={styles.heroRating}>
                    <i className="fa-solid fa-star" /> {business?.rating ? business.rating.toFixed(1) : '0.0'}
                  </span>
                </p>
                <div className={styles.heroBadgeRow}>
                  <StatusBadge status={business?.status || 'PENDING'} />
                  {business?.verified && (
                    <span className={styles.verifiedPartnerBadge}>
                      <i className="fa-solid fa-circle-check" /> Verified Partner
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.heroPreviewBox}>
              <span className={styles.linkTitle}>Customer listing</span>
              <p className={styles.previewHint}>See how clients view your profile and book appointments.</p>
              {business?.id && (
                <button type="button" className={`btn btn-primary ${styles.previewBtn}`} onClick={handlePreviewListing}>
                  <i className="fa-solid fa-eye" /> Preview listing
                </button>
              )}
            </div>
          </div>

          {/* Inspirational Quote Banner */}
          {quote && (
            <div className={styles.quoteBanner}>
              <i className="fa-solid fa-lightbulb" />
              <div className={styles.quoteContent}>
                <span className={styles.quoteLabel}>Tip of the day</span>
                <span className={styles.quoteText}>
                  "{quote.quote}" — <strong>{quote.author}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Metric Grid */}
          <MetricGrid>
            <StatCard label="Active Bookings" value={activeBookingsCount} hint="Pending or confirmed slots" icon="fa-calendar-days" />
            <StatCard label="Today's Bookings" value={todayOps?.bookingsCount ?? todayBookingsCount} hint="Appointments today" icon="fa-clock" />
            <StatCard label="Today's Jobs" value={todayOps?.jobsCount ?? 0} hint="Service jobs scheduled today" icon="fa-briefcase" />
            <StatCard label="Est. Revenue" value={format(estimatedRevenue)} hint="Total active slot rates" icon="fa-wallet" />
            <StatCard label="Rating Score" value={business?.rating ? `${business.rating.toFixed(1)} / 5` : '0.0'} hint="Customer reviews feedback" icon="fa-star" />
          </MetricGrid>

          <div className="surface" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <strong>Availability status</strong>
            <CustomSelect
              searchable={false}
              value={opsStatus}
              onChange={(value) => {
                setOpsStatus(value);
                setSavingOps(true);
                apiFetch('/api/provider/ops/status', {
                  method: 'PATCH',
                  body: JSON.stringify({ opsStatus: value }),
                })
                  .then(() => setMessage(`Status set to ${value.replaceAll('_', ' ').toLowerCase()}.`))
                  .catch((err: { message?: string }) => setError(err?.message || 'Could not update status.'))
                  .finally(() => setSavingOps(false));
              }}
              options={[
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'BUSY', label: 'Busy' },
                { value: 'UNAVAILABLE', label: 'Unavailable' },
                { value: 'VACATION', label: 'Vacation' },
              ]}
              placeholder="Status"
            />
            {savingOps && <span className={styles.previewHint}>Saving…</span>}
            <Link href="/business/calendar" className="btn btn-outline btn-sm">Open calendar</Link>
            <Link href="/business/analytics" className="btn btn-outline btn-sm">Analytics</Link>
          </div>

          <div className={styles.dashboardLayout}>
            {/* Main Panel */}
            <div className={styles.dashboardMain}>
              {/* Setup checklist progress */}
              {setupPercent < 100 && (
                <div className={`surface ${styles.setupProgressCard}`}>
                  <div className={styles.setupCardHeader}>
                    <div>
                      <h4>Complete Setup Checklist</h4>
                      <p>Finish these setup items to launch your scheduling listing successfully.</p>
                    </div>
                    <span className={styles.setupPercentage}>{setupPercent}% Complete</span>
                  </div>
                  <div className={styles.progressBarOuter}>
                    <div className={styles.progressBarInner} style={{ width: `${setupPercent}%` }} />
                  </div>
                  <ul className={styles.setupList}>
                    {checklist.map((item) => (
                      <li key={item.label} className={item.done ? styles.setupDone : ''}>
                        <div className={styles.setupLabelArea}>
                          <i className={`fa-solid ${item.done ? 'fa-circle-check' : 'fa-circle'}`} />
                          <span>{item.label}</span>
                        </div>
                        {!item.done && (
                          <Link href={item.href} className="btn btn-outline btn-sm">
                            Configure
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Upcoming Appointments Table */}
              <div className={`surface ${styles.appointmentsCard}`}>
                <div className={styles.appointmentsHeader}>
                  <h4>Upcoming Appointments</h4>
                  <Link href="/business/bookings" className={styles.viewAllLink}>
                    View Bookings Calendar <i className="fa-solid fa-chevron-right" />
                  </Link>
                </div>

                {upcomingAppointments.length === 0 ? (
                  <div className={styles.emptyTableState}>
                    <i className="fa-solid fa-calendar-minus" />
                    <h5>No upcoming appointments</h5>
                    <p>When clients schedule bookings, their upcoming slots will be tracked here.</p>
                    <Link href="/business/availability" className="btn btn-secondary btn-sm">
                      Check your availability
                    </Link>
                  </div>
                ) : (
                  <>
                  <div className={styles.tableResponsive}>
                    <table className={styles.appointmentsTable}>
                      <thead>
                        <tr>
                          <th>Client</th>
                          <th>Service</th>
                          <th>Date & Time</th>
                          <th>Price</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingAppointments.map((booking) => (
                          <tr key={booking.id}>
                            <td>
                              <div className={styles.clientCell}>
                                <strong>
                                  {booking.customer.user.firstName} {booking.customer.user.lastName}
                                </strong>
                                <span>{booking.customer.user.email}</span>
                              </div>
                            </td>
                            <td>{booking.service.name}</td>
                            <td>{formatDateTime(booking.bookingTime)}</td>
                            <td>
                              <strong className={styles.priceText}>{format(booking.price)}</strong>
                            </td>
                            <td>
                              <StatusBadge status={booking.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={styles.appointmentsCards} aria-label="Upcoming appointments">
                    {upcomingAppointments.map((booking) => (
                      <article key={booking.id} className={styles.appointmentCard}>
                        <div className={styles.appointmentCardTop}>
                          <strong>
                            {booking.customer.user.firstName} {booking.customer.user.lastName}
                          </strong>
                          <StatusBadge status={booking.status} />
                        </div>
                        <p className={styles.appointmentCardMeta}>{booking.service.name}</p>
                        <p className={styles.appointmentCardMeta}>{formatDateTime(booking.bookingTime)}</p>
                        <p className={styles.appointmentCardPrice}>{format(booking.price)}</p>
                      </article>
                    ))}
                  </div>
                  </>
                )}
              </div>
            </div>

            {/* Sidebar Actions & Info */}
            <aside className={styles.sideColumn}>
              {/* Quick Actions Panel */}
              <div className="surface">
                <h4 className={styles.sideTitle}>Management Shortcuts</h4>
                <div className={styles.quickActionsGrid}>
                  <Link href="/business/services" className={styles.actionCard}>
                    <div className={`${styles.actionCardIcon} ${styles.actionServices}`}>
                      <i className="fa-solid fa-plus" />
                    </div>
                    <span>Add Service</span>
                  </Link>
                  <Link href="/business/availability" className={styles.actionCard}>
                    <div className={`${styles.actionCardIcon} ${styles.actionHours}`}>
                      <i className="fa-solid fa-clock" />
                    </div>
                    <span>Set Hours</span>
                  </Link>
                  <Link href="/business/staff" className={styles.actionCard}>
                    <div className={`${styles.actionCardIcon} ${styles.actionStaff}`}>
                      <i className="fa-solid fa-user-plus" />
                    </div>
                    <span>Add Staff</span>
                  </Link>
                  <Link href="/business/verification" className={styles.actionCard}>
                    <div className={`${styles.actionCardIcon} ${styles.actionDocs}`}>
                      <i className="fa-solid fa-file-shield" />
                    </div>
                    <span>Verification</span>
                  </Link>
                </div>
              </div>

              {/* Weather Forecast Widget */}
              {weather ? (
                <div className={`surface ${styles.weatherCard}`}>
                  <div className={styles.weatherHeader}>
                    <i className="fa-solid fa-cloud-sun" />
                    <h4>Branch Weather Forecast</h4>
                  </div>
                  <div className={styles.weatherMain}>
                    <div className={styles.weatherInfo}>
                      <i className={`fa-solid ${weather.icon} ${styles.weatherIconAnim}`} />
                      <div>
                        <strong className={styles.weatherTemp}>{weather.temp.toFixed(1)}°C</strong>
                        <span className={styles.weatherDesc}>{weather.description}</span>
                      </div>
                    </div>
                    <div className={styles.weatherMeta}>
                      <span><i className="fa-solid fa-wind" /> {weather.wind} km/h</span>
                    </div>
                  </div>
                  <p className={styles.weatherNote}>
                    Current conditions at your primary location. Rain or weather anomalies may impact customer turnout.
                  </p>
                </div>
              ) : loadingWeather ? (
                <div className={`surface ${styles.weatherCard}`}>
                  <div className={styles.weatherHeader}>
                    <i className="fa-solid fa-spinner fa-spin" />
                    <h4>Loading weather...</h4>
                  </div>
                </div>
              ) : null}

              {/* Verified badge CTA */}
              {!business?.verified && (
                <div className={`surface ${styles.tipCard}`}>
                  <div className={styles.tipIconHeader}>
                    <i className="fa-solid fa-file-shield" />
                    <h4>Verification Document Status</h4>
                  </div>
                  <p>
                    Upload Tier 1 documents (Owner ID, trade license, address proof) to get listed. Upload Tax ID and a
                    bank statement (amounts can be redacted) for a Verified Partner badge.
                  </p>
                  <Link href="/business/verification" className="btn btn-secondary btn-sm" style={{ marginTop: '12px', display: 'inline-block' }}>
                    Open Verification Uploads
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className={`surface ${styles.profileFormContainer}`}>
          <div className={styles.profileHeader}>
            <div className={styles.profileLogoContainer}>
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className={styles.profileLogo} />
              ) : (
                <div className={styles.logoPlaceholder}>
                  <i className="fa-solid fa-store" />
                </div>
              )}
            </div>
            <div className={styles.profileTitleInfo}>
              <h2>Business Listing Profile Settings</h2>
              <p>Configure your listing description, registration fields, and categories displayed on the marketplace.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.profileForm}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">
              Business name
            </label>
              <input
                id="name"
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
              Description
            </label>
              <textarea
                id="description"
                className={`input-field ${styles.textarea}`}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="logoUrl">
              Logo image URL
            </label>
              <input
                id="logoUrl"
                type="text"
                className="input-field"
                value={formData.logoUrl}
                onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="registrationNumber">
              Government registration / license number
            </label>
              <input
                id="registrationNumber"
                type="text"
                className="input-field"
                value={formData.registrationNumber}
                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="primaryCategorySelect">
              Primary category
            </label>
              <CustomSelect
                id="primaryCategorySelect"
                options={[
                  { value: '', label: 'Select primary category' },
                  ...availableCategories.map((c) => ({
                    value: String(c.id),
                    label: c.name,
                  })),
                ]}
                value={String(formData.primaryCategoryId || '')}
                onChange={(value) => handleInputChange('primaryCategoryId', value)}
                placeholder="Select primary category"
                disabled={business?.status === 'SUSPENDED'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
              Secondary Categories (Optional)
            </label>
              <div className={styles.categoryGrid}>
                {availableCategories
                  .filter((c) => c.id.toString() !== formData.primaryCategoryId)
                  .map((c) => (
                    <label key={c.id} className={styles.categoryItem}>
                      <input
                        type="checkbox"
                        checked={formData.secondaryCategoryIds.includes(c.id)}
                        onChange={() => handleSecondaryCategoryChange(c.id)}
                        disabled={business?.status === 'SUSPENDED'}
                      />
                      {c.name}
                    </label>
                  ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || business?.status === 'SUSPENDED'}
            >
              {submitting ? 'Saving changes...' : 'Save Profile Settings'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
