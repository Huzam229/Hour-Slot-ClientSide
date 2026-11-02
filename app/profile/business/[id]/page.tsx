'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { loginHref } from '@/lib/auth-redirect';
import type { ServicePackage } from '@/lib/types';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import CustomSelect from '@/components/CustomSelect';
import { formatMoney } from '@/lib/money';
import { buildBookingHref } from '@/lib/booking-flow';
import CustomerFlowBar from '@/components/CustomerFlowBar';
import GuestBrowseBanner from '@/components/guest/GuestBrowseBanner';
import styles from './business-profile.module.css';

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => <Skeleton variant="card" height={260} />,
});

type TabId = 'overview' | 'services' | 'packages' | 'team' | 'reviews' | 'visit';

interface Branch {
  id: number;
  name: string;
  address: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
}

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  currency?: string;
}

interface Staff {
  id: number;
  name: string;
  specialty?: string;
  designation?: string;
  rating?: number;
  branch?: { id: number; name?: string };
}

interface Review {
  id: number;
  customer: { user: { firstName: string; lastName: string } };
  rating: number;
  comment?: string;
  createdAt: string;
}

interface WorkingHour {
  id: number;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  closed: boolean;
  intervals?: { startTime: string; endTime: string }[];
}

interface BusinessProfile {
  business: {
    id: number;
    name: string;
    description?: string;
    logoUrl?: string;
    galleryUrls?: string;
    verified?: boolean;
    currency?: string;
    primaryCategory?: { name: string };
  };
  branches: Branch[];
  services: Service[];
  staff: Staff[];
  reviews: Review[];
  packages?: ServicePackage[];
  averageRating: number;
}

const DAY_LABELS: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

const TABS: { id: TabId; label: string; show?: (p: BusinessProfile) => boolean }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'services', label: 'Services' },
  { id: 'packages', label: 'Packages', show: (p) => (p.packages?.length ?? 0) > 0 },
  { id: 'team', label: 'Team' },
  { id: 'reviews', label: 'Reviews', show: (p) => p.reviews.length > 0 },
  { id: 'visit', label: 'Visit' },
];

function formatHm(time?: string) {
  if (!time) return '';
  return time.slice(0, 5);
}

function formatDayHours(day: WorkingHour): string {
  if (day.closed) return 'Closed';
  if (day.intervals && day.intervals.length > 0) {
    return day.intervals.map((i) => `${formatHm(i.startTime)}–${formatHm(i.endTime)}`).join(', ');
  }
  if (day.startTime && day.endTime) return `${formatHm(day.startTime)} – ${formatHm(day.endTime)}`;
  return 'Closed';
}

function todayDow(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

export default function BusinessProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [reliability, setReliability] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [serviceFilter, setServiceFilter] = useState('All');

  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const [customerPackage, setCustomerPackage] = useState<any | null>(null);

  const pkgId = searchParams.get('customerPackageId') || searchParams.get('packageId');
  useEffect(() => {
    if (!pkgId || !isAuthenticated) return;
    apiFetch<any[]>('/api/customer/packages')
      .then((pkgs) => {
        const match = pkgs.find((p) => String(p.id) === pkgId);
        if (match) {
          setCustomerPackage((prev: any) => (prev?.id === match.id ? prev : match));
        }
      })
      .catch(() => {});
  }, [pkgId, isAuthenticated]);

  const money = (amount: number, code?: string) =>
    formatMoney(amount, code || profile?.business?.currency);

  const getServiceBookingHref = (serviceId: number) => {
    return profile
      ? buildBookingHref(profile.business.id, {
          step: 'details',
          serviceId: String(serviceId),
          branchId: selectedBranchId || undefined,
          customerPackageId: customerPackage ? String(customerPackage.id) : undefined,
        })
      : '#';
  };

  const loadHours = async (branchId: number) => {
    const hours = await apiFetch<WorkingHour[]>(
      `/api/public/branches/${branchId}/working-hours`,
      { skipAuth: true }
    );
    setWorkingHours(hours);
  };

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const favPromise = isAuthenticated
        ? apiFetch<{ business: { id: number } }[]>('/api/favorites').catch(() => [])
        : Promise.resolve([] as { business: { id: number } }[]);
      const [profileData, favData] = await Promise.all([
        apiFetch<BusinessProfile>(`/api/discover/business/${id}`, { skipAuth: true }),
        favPromise,
      ]);
      setProfile(profileData);
      setFavorites(favData.map((f) => f.business.id));
      apiFetch<{ reliabilityScore: number | null }>(`/api/public/businesses/${id}/booking-terms`, { skipAuth: true })
        .then((t) => setReliability(t?.reliabilityScore ?? null))
        .catch(() => setReliability(null));
      if (profileData.branches.length > 0) {
        const requested = searchParams.get('branchId');
        const match = requested && profileData.branches.some((b) => String(b.id) === requested);
        setSelectedBranchId(match ? requested : String(profileData.branches[0].id));
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load business profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!selectedBranchId) return;
    loadHours(Number.parseInt(selectedBranchId, 10)).catch(() => setWorkingHours([]));
  }, [selectedBranchId]);

  useEffect(() => {
    if (!profile) return;
    const requested = searchParams.get('branchId');
    if (requested && profile.branches.some((b) => String(b.id) === requested)) {
      setSelectedBranchId(requested);
    }
  }, [searchParams, profile]);

  const selectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('branchId', branchId);
    router.replace(`/profile/business/${id}?${params.toString()}`, { scroll: false });
  };

  const handleToggleFavorite = async () => {
    if (!profile) return;
    if (!isAuthenticated) {
      router.push(loginHref(`${window.location.pathname}${window.location.search}`));
      return;
    }
    const businessId = profile.business.id;
    const isFav = favorites.includes(businessId);
    setError(null);
    setSuccess(null);
    try {
      if (isFav) {
        await apiFetch(`/api/favorites/${businessId}`, { method: 'DELETE' });
        setFavorites((prev) => prev.filter((fid) => fid !== businessId));
        setSuccess('Removed from favorites.');
      } else {
        await apiFetch(`/api/favorites/${businessId}`, { method: 'POST' });
        setFavorites((prev) => [...prev, businessId]);
        setSuccess('Added to favorites!');
      }
    } catch {
      setError('Could not update favorite status.');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.business.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setSuccess('Link copied to clipboard.');
      }
    } catch {
      /* cancelled */
    }
  };

  const handleOpenPurchaseModal = (pkg: ServicePackage) => {
    if (!isAuthenticated) {
      router.push(loginHref(`${window.location.pathname}${window.location.search}`));
      return;
    }
    setSelectedPackage(pkg);
    setShowPurchaseModal(true);
  };

  const handlePurchaseSubmit = async (method: 'ONLINE' | 'VENUE') => {
    if (!selectedPackage) return;
    setPurchaseLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (method === 'ONLINE') {
        const data = await apiFetch<{ url: string }>(
          `/api/payments/checkout?packageId=${selectedPackage.id}`,
          { method: 'POST' }
        );
        if (data?.url) window.location.href = data.url;
        else throw new Error('Failed to generate payment url');
      } else {
        await apiFetch(`/api/packages/${selectedPackage.id}/purchase?paymentMethod=VENUE`, {
          method: 'POST',
        });
        setSuccess(`Package "${selectedPackage.name}" purchased. Available in your wallet.`);
        setShowPurchaseModal(false);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Package purchase failed.');
      setShowPurchaseModal(false);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const bookStartHref = profile
    ? buildBookingHref(profile.business.id, {
        step: 'service',
        branchId: selectedBranchId || undefined,
        customerPackageId: customerPackage ? String(customerPackage.id) : undefined,
      })
    : '#';

  const galleryImages = useMemo(() => {
    if (!profile) return [] as string[];
    const urls = profile.business.galleryUrls
      ? String(profile.business.galleryUrls)
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean)
      : [];
    if (profile.business.logoUrl && !urls.includes(profile.business.logoUrl)) {
      urls.unshift(profile.business.logoUrl);
    }
    return urls;
  }, [profile]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="card" className={styles.skeletonCover} />
        <div className={styles.skeletonBody}>
          <Skeleton variant="card" height={420} />
          <Skeleton variant="card" height={320} />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon="fa-store-slash"
          title="Business not found"
          description={error}
          actionLabel="Back to explore"
          onAction={() => router.push('/profile/explore')}
        />
      </div>
    );
  }

  if (!profile) return null;

  const { business, branches, services, staff, reviews, averageRating } = profile;
  const isFav = favorites.includes(business.id);
  const coverSrc = galleryImages[heroIndex] || galleryImages[0] || null;
  const activeBranch = branches.find((b) => String(b.id) === selectedBranchId) || branches[0];
  const branchStaff = staff.filter(
    (s) => !s.branch?.id || String(s.branch.id) === String(activeBranch?.id)
  );
  const hasCoords =
    activeBranch &&
    Number.isFinite(activeBranch.latitude) &&
    Number.isFinite(activeBranch.longitude);
  const mapQuery = encodeURIComponent(activeBranch?.address || business.name);
  const packages = profile.packages || [];
  const categoryName = business.primaryCategory?.name;
  const visibleTabs = TABS.filter((t) => !t.show || t.show(profile));
  const canBook = services.length > 0;

  const filters = (() => {
    const tags = new Set<string>(['All']);
    let hasConsult = false;
    let hasOther = false;
    services.forEach((s) => {
      if (s.name.toLowerCase().includes('consult')) hasConsult = true;
      else hasOther = true;
    });
    if (hasConsult) tags.add('Consultations');
    if (hasOther) tags.add('Services');
    return Array.from(tags);
  })();

  const filteredServices = services.filter((s) => {
    if (serviceFilter === 'All') return true;
    if (serviceFilter === 'Consultations') return s.name.toLowerCase().includes('consult');
    return !s.name.toLowerCase().includes('consult');
  });

  const highlights = [
    business.verified
      ? { icon: 'fa-certificate', label: 'Verified business' }
      : { icon: 'fa-shield-halved', label: 'Trusted listing' },
    workingHours.some((w) => !w.closed)
      ? { icon: 'fa-clock', label: 'Online booking' }
      : { icon: 'fa-calendar', label: 'By appointment' },
    staff.length > 0
      ? { icon: 'fa-user-group', label: `${branchStaff.length} specialist${branchStaff.length === 1 ? '' : 's'} at this location` }
      : { icon: 'fa-store', label: 'Local venue' },
    services.length > 0
      ? { icon: 'fa-list-check', label: `${services.length} service${services.length === 1 ? '' : 's'}` }
      : { icon: 'fa-sparkles', label: 'Curated offerings' },
  ];

  const sortedHours = [...workingHours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const todayHours = sortedHours.find((d) => d.dayOfWeek === todayDow());
  const todayLabel = todayHours ? formatDayHours(todayHours) : 'Hours not listed';
  const isOpenToday = todayHours && !todayHours.closed;

  return (
    <div className={styles.page}>
      <div className={styles.flowBarWrap}>
        <CustomerFlowBar businessId={business.id} businessName={business.name} current="business" />
      </div>
      {/* Cover */}
      <div className={styles.coverWrap}>
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc} alt="" className={styles.coverImg} />
        ) : null}
        <div className={styles.coverShade} />
        <div className={styles.coverTop}>
          <Link href="/profile/explore" className={styles.backBtn}>
            <i className="fa-solid fa-arrow-left" /> Explore
          </Link>
          <div className={styles.coverActions}>
            <button
              type="button"
              className={`${styles.iconBtn} ${isFav ? styles.iconBtnOn : ''}`}
              onClick={handleToggleFavorite}
              aria-label={isFav ? 'Remove from favorites' : 'Save to favorites'}
            >
              <i className={`fa-${isFav ? 'solid' : 'regular'} fa-heart`} />
            </button>
            <button type="button" className={styles.iconBtn} onClick={handleShare} aria-label="Share">
              <i className="fa-solid fa-arrow-up-from-bracket" />
            </button>
          </div>
        </div>
        {galleryImages.length > 1 && (
          <div className={styles.galleryDots}>
            {galleryImages.map((src, idx) => (
              <button
                key={src}
                type="button"
                className={`${styles.dot} ${idx === heroIndex ? styles.dotOn : ''}`}
                onClick={() => setHeroIndex(idx)}
                aria-label={`Photo ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Identity */}
      <div className={styles.identity}>
        <div className={styles.identityCard}>
          <div className={styles.logoMark}>
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt="" />
            ) : (
              business.name.charAt(0)
            )}
          </div>
          <div className={styles.identityMain}>
            <h1>
              {business.name}
              {business.verified && (
                <i className={`fa-solid fa-circle-check ${styles.verified}`} title="Verified" />
              )}
            </h1>
            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                <i className="fa-solid fa-star" />
                {averageRating > 0 ? averageRating.toFixed(1) : 'New'}
                {reviews.length > 0 && ` (${reviews.length})`}
              </span>
              {reliability != null && (
                <>
                  <span className={styles.metaDot} />
                  <span className={styles.metaItem} title="Share of bookings kept in the last 12 months">
                    <i className="fa-solid fa-calendar-check" /> Keeps {reliability}% of bookings
                  </span>
                </>
              )}
              {categoryName && (
                <>
                  <span className={styles.metaDot} />
                  <span className={styles.categoryTag}>
                    <i className="fa-solid fa-tag" /> {categoryName}
                  </span>
                </>
              )}
              {activeBranch && (
                <>
                  <span className={styles.metaDot} />
                  <span className={styles.metaItem}>
                    <i className="fa-solid fa-location-dot" />
                    {activeBranch.name}
                    {activeBranch.address ? ` · ${activeBranch.address}` : ''}
                  </span>
                </>
              )}
            </div>
            {branches.length > 1 && (
              <div className={styles.branchSwitch} role="group" aria-label="Locations">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`${styles.branchChip} ${String(b.id) === String(activeBranch?.id) ? styles.branchChipOn : ''}`}
                    onClick={() => selectBranch(String(b.id))}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            href={canBook ? bookStartHref : '#'}
            className={`${styles.bookCta} ${styles.bookCtaDesk} ${!canBook ? styles.bookCtaDisabled : ''}`}
            aria-disabled={!canBook}
          >
            Book appointment <i className="fa-solid fa-calendar-check" />
          </Link>
        </div>

        <div className={styles.tabBar} role="tablist">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabOn : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {(success || error) && (
        <div className={success ? 'success-alert' : 'error-alert'} style={{ marginTop: 16 }}>
          <i className={`fa-solid ${success ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} /> {success || error}
        </div>
      )}

      {!isAuthenticated && (
        <>
          <GuestBrowseBanner />
          <div className={styles.guestQuickStrip}>
            <span className={styles.guestPill}>
              <i className="fa-solid fa-list-check" /> {services.length} services
            </span>
            {packages.length > 0 && (
              <span className={`${styles.guestPill} ${styles.guestPillViolet}`}>
                <i className="fa-solid fa-gift" /> {packages.length} packages
              </span>
            )}
            <span className={`${styles.guestPill} ${styles.guestPillSky}`}>
              <i className="fa-solid fa-clock" /> {isOpenToday ? `Open today · ${todayLabel}` : todayLabel}
            </span>
            <span className={`${styles.guestPill} ${styles.guestPillCoral}`}>
              <i className="fa-solid fa-heart" /> Sign in to save favorites
            </span>
          </div>
        </>
      )}

      <div className={styles.content}>
        {customerPackage && (
          <div className={styles.packageBanner}>
            <i className="fa-solid fa-gift" />
            <div>
              <strong>Redeeming Session from: {customerPackage.servicePackage.name}</strong>
              <p>{customerPackage.sessionsRemaining} sessions remaining in wallet</p>
            </div>
            <button
              type="button"
              className={styles.clearPackageBtn}
              onClick={() => setCustomerPackage(null)}
              title="Cancel redemption"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

          {activeTab === 'overview' && (
            <div className={styles.panel} role="tabpanel">
              <div className={styles.aboutBlock}>
                <h2 className={styles.panelTitle}>About {business.name}</h2>
                <p className={styles.panelLead}>Learn more before you book</p>
                <p className={styles.aboutText}>
                  {business.description?.trim() ||
                    'Browse services and book an open slot. Availability updates live from the business calendar.'}
                </p>
              </div>
              <div className={styles.featureGrid}>
                {highlights.map((h) => (
                  <div key={h.label} className={styles.feature}>
                    <span className={styles.featureIcon}>
                      <i className={`fa-solid ${h.icon}`} />
                    </span>
                    <span>{h.label}</span>
                  </div>
                ))}
              </div>
              {todayHours && (
                <div className={styles.todayHours}>
                  <div>
                    <strong>Today&apos;s hours</strong>
                    <em className={isOpenToday ? styles.todayOpen : styles.todayClosed}>{todayLabel}</em>
                  </div>
                  <button type="button" className={styles.filterBtn} onClick={() => setActiveTab('visit')}>
                    Full schedule <i className="fa-solid fa-chevron-right" />
                  </button>
                </div>
              )}
              {services.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <h2 className={styles.panelTitle}>Popular services</h2>
                  <p className={styles.panelLead}>Starting prices — full list in the booking flow</p>
                  <div className={styles.serviceList}>
                    {services.slice(0, 4).map((s) => {
                      const isIncludedInPackage = customerPackage?.servicePackage?.services?.some(
                        (ps: any) => ps.id === s.id
                      );
                      return (
                        <div key={s.id} className={styles.serviceCatalogRow}>
                          <div className={styles.serviceInfo}>
                            <strong>
                              {s.name}
                              {isIncludedInPackage && (
                                <span className={styles.packageBadge}>
                                  <i className="fa-solid fa-gift" style={{ marginRight: 4 }} /> Included in package
                                </span>
                              )}
                            </strong>
                            <p>{s.description || `${s.durationMinutes}-minute session`}</p>
                            <span>
                              <i className="fa-regular fa-clock" /> {s.durationMinutes} min · {money(s.price, s.currency)}
                            </span>
                          </div>
                          {canBook && (
                            <Link
                              href={getServiceBookingHref(s.id)}
                              className="btn btn-outline btn-sm"
                              style={{ alignSelf: 'center', marginLeft: 'auto' }}
                            >
                              Book now
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {services.length > 4 && (
                    <button
                      type="button"
                      className={styles.filterBtn}
                      style={{ marginTop: 14 }}
                      onClick={() => setActiveTab('services')}
                    >
                      View all {services.length} services
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'services' && (
            <div className={styles.panel} role="tabpanel">
              <h2 className={styles.panelTitle}>Services</h2>
              <p className={styles.panelLead}>All services offered at this business</p>
              {filters.length > 1 && (
                <div className={styles.serviceToolbar}>
                  {filters.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`${styles.filterBtn} ${serviceFilter === f ? styles.filterBtnOn : ''}`}
                      onClick={() => setServiceFilter(f)}
                    >
                      {f === 'All' ? 'All services' : f}
                    </button>
                  ))}
                </div>
              )}
              {filteredServices.length === 0 ? (
                <EmptyState icon="fa-scissors" title="No services listed" description="This business has not published services yet." />
              ) : (
                <div className={styles.serviceList}>
                  {filteredServices.map((s) => {
                    const isIncludedInPackage = customerPackage?.servicePackage?.services?.some(
                      (ps: any) => ps.id === s.id
                    );
                    return (
                      <div key={s.id} className={styles.serviceCatalogRow}>
                        <div className={styles.serviceInfo}>
                          <strong>
                            {s.name}
                            {isIncludedInPackage && (
                              <span className={styles.packageBadge}>
                                <i className="fa-solid fa-gift" style={{ marginRight: 4 }} /> Included in package
                              </span>
                            )}
                          </strong>
                          <p>{s.description || `${s.durationMinutes}-minute appointment with live availability.`}</p>
                          <span>
                            <i className="fa-regular fa-clock" /> {s.durationMinutes} min · {money(s.price, s.currency)}
                          </span>
                        </div>
                        {canBook && (
                          <Link
                            href={getServiceBookingHref(s.id)}
                            className="btn btn-outline btn-sm"
                            style={{ alignSelf: 'center', marginLeft: 'auto' }}
                          >
                            Book now
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'packages' && packages.length > 0 && (
            <div className={styles.panel} role="tabpanel">
              <h2 className={styles.panelTitle}>Packages</h2>
              <p className={styles.panelLead}>Save with bundled sessions</p>
              <div className={styles.packageRow}>
                {packages.map((pkg) => (
                  <article key={pkg.id} className={styles.packageCard}>
                    <strong>{pkg.name}</strong>
                    <p>
                      {pkg.sessionsCount} sessions
                      {pkg.expiryDays > 0 ? ` · valid ${pkg.expiryDays} days` : ' · no expiry'}
                    </p>
                    <div className={styles.packageFoot}>
                      <span className={styles.packagePrice}>{money(pkg.price, pkg.currency)}</span>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleOpenPurchaseModal(pkg)}>
                        Buy
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className={styles.panel} role="tabpanel">
              <h2 className={styles.panelTitle}>Our team</h2>
              <p className={styles.panelLead}>
                Specialists at {activeBranch?.name || 'this location'}
              </p>
              {branchStaff.length === 0 ? (
                <EmptyState icon="fa-user-group" title="No team listed here" description="You can still book with any available staff at this location." />
              ) : (
                <div className={styles.teamGrid}>
                  {branchStaff.map((s) => (
                    <article key={s.id} className={styles.teamMember}>
                      <div className={styles.teamAvatar}>{s.name.charAt(0)}</div>
                      <strong>{s.name}</strong>
                      <span className={styles.teamRole}>{s.specialty || s.designation || 'Team member'}</span>
                      <span className={styles.teamRating}>
                        <i className="fa-solid fa-star" />
                        {typeof s.rating === 'number' && s.rating > 0 ? s.rating.toFixed(1) : '5.0'}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && reviews.length > 0 && (
            <div className={styles.panel} role="tabpanel">
              <h2 className={styles.panelTitle}>Reviews</h2>
              <p className={styles.panelLead}>Feedback from recent clients</p>
              <div className={styles.reviewSummary}>
                <span className={styles.reviewBig}>{averageRating > 0 ? averageRating.toFixed(1) : '—'}</span>
                <div className={styles.reviewSummaryMeta}>
                  <div>
                    <i className="fa-solid fa-star" /> Average rating
                  </div>
                  <div>{reviews.length} review{reviews.length === 1 ? '' : 's'}</div>
                </div>
              </div>
              <div className={styles.reviewFeed}>
                {reviews.slice(0, 8).map((r) => (
                  <article key={r.id} className={styles.reviewItem}>
                    <div className={styles.reviewItemHead}>
                      <strong>
                        {r.customer.user.firstName} {r.customer.user.lastName.charAt(0)}.
                      </strong>
                      <span className={styles.stars} aria-label={`${r.rating} stars`}>
                        {'★'.repeat(r.rating)}
                      </span>
                    </div>
                    {r.comment && <p>{r.comment}</p>}
                    <span className={styles.reviewDate}>
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'visit' && (
            <div className={styles.panel} role="tabpanel">
              <h2 className={styles.panelTitle}>Visit us</h2>
              <p className={styles.panelLead}>Hours, location, and contact details</p>
              <div className={styles.visitStack}>
                {branches.length > 1 && (
                  <div className={styles.branchPick}>
                    <CustomSelect
                      options={branches.map((b) => ({ value: String(b.id), label: b.name, sublabel: b.address }))}
                      value={selectedBranchId}
                      onChange={selectBranch}
                      placeholder="Select location"
                    />
                  </div>
                )}
                <div className={styles.hoursTable}>
                  {sortedHours.length === 0 ? (
                    <p className={styles.aboutText} style={{ padding: 16 }}>
                      Hours not published yet.
                    </p>
                  ) : (
                    sortedHours.map((day) => {
                      const isToday = day.dayOfWeek === todayDow();
                      const hoursText = formatDayHours(day);
                      return (
                        <div
                          key={day.id || day.dayOfWeek}
                          className={`${styles.hoursRow} ${isToday ? styles.hoursRowToday : ''}`}
                        >
                          <strong>{DAY_LABELS[day.dayOfWeek] || `Day ${day.dayOfWeek}`}</strong>
                          <span className={day.closed ? styles.hoursClosed : undefined}>{hoursText}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className={styles.mapBlock}>
                  {hasCoords ? (
                    <LocationMap
                      markers={[
                        {
                          id: activeBranch!.id,
                          lat: activeBranch!.latitude as number,
                          lng: activeBranch!.longitude as number,
                          label: activeBranch!.name,
                        },
                      ]}
                      height={260}
                      zoom={15}
                    />
                  ) : (
                    <div className={styles.mapFallback}>
                      <i className="fa-solid fa-map-location-dot" />
                      <span>{activeBranch?.address || 'Address unavailable'}</span>
                    </div>
                  )}
                </div>
                <div className={styles.contactStrip}>
                  {activeBranch?.address && (
                    <span className={styles.contactChip}>
                      <i className="fa-solid fa-location-dot" /> {activeBranch.address}
                    </span>
                  )}
                  {activeBranch?.phoneNumber && (
                    <span className={styles.contactChip}>
                      <i className="fa-solid fa-phone" /> {activeBranch.phoneNumber}
                    </span>
                  )}
                  <a
                    className={styles.directionsLink}
                    href={
                      hasCoords
                        ? `https://www.openstreetmap.org/?mlat=${activeBranch!.latitude}&mlon=${activeBranch!.longitude}#map=16/${activeBranch!.latitude}/${activeBranch!.longitude}`
                        : `https://www.openstreetmap.org/search?query=${mapQuery}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="fa-solid fa-diamond-turn-up" /> Directions
                  </a>
                </div>
              </div>
            </div>
          )}
      </div>

      {canBook && (
        <div className={styles.mobileDock}>
          <div className={styles.mobileDockInner}>
            <div className={styles.mobileDockMeta}>
              <strong>{business.name}</strong>
              <span>{services.length} service{services.length === 1 ? '' : 's'} available</span>
            </div>
            <Link href={bookStartHref} className={styles.mobileDockBtn}>
              Book appointment
            </Link>
          </div>
        </div>
      )}

      <Modal
        open={showPurchaseModal && !!selectedPackage}
        title={selectedPackage ? `Purchase ${selectedPackage.name}` : 'Purchase package'}
        onClose={() => setShowPurchaseModal(false)}
        footer={
          <button type="button" className="btn btn-outline" onClick={() => setShowPurchaseModal(false)} disabled={purchaseLoading}>
            Cancel
          </button>
        }
      >
        {selectedPackage && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
              Choose payment for <strong>{selectedPackage.name}</strong> ({selectedPackage.sessionsCount} sessions) —{' '}
              <strong>{money(selectedPackage.price, selectedPackage.currency)}</strong>.
            </p>
            <div className={styles.purchaseChoices}>
              <button type="button" className="btn btn-primary" onClick={() => handlePurchaseSubmit('ONLINE')} disabled={purchaseLoading}>
                <i className="fa-solid fa-credit-card" /> Pay online
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => handlePurchaseSubmit('VENUE')} disabled={purchaseLoading}>
                <i className="fa-solid fa-store" /> Pay at venue
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
