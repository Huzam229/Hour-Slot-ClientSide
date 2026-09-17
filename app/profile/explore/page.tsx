'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent, type PointerEvent } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { loginHref } from '@/lib/auth-redirect';
import type { Branch, Category } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import CustomSelect from '@/components/CustomSelect';
import styles from './explore.module.css';

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => <Skeleton variant="card" height={280} />,
});

interface ExploreBranch extends Branch {
  averageRating?: number;
  distanceKm?: number;
}

function branchProfileHref(branch: ExploreBranch) {
  const slug = branch.business?.slug;
  if (slug) return `/b/${encodeURIComponent(slug)}`;
  return `/profile/business/${branch.business.id}?branchId=${branch.id}`;
}

function withExploreMeta(list: ExploreBranch[]): ExploreBranch[] {
  return list.map((b) => ({
    ...b,
    averageRating: b.business?.rating ?? b.averageRating ?? 0,
    distanceKm: typeof b.distanceMeters === 'number' ? b.distanceMeters / 1000 : b.distanceKm,
  }));
}

const DISTANCES = [5, 10, 25, 50];

function discoveryFilterQs(filters: {
  serviceMode: string;
  listingMode: string;
  verifiedOnly: boolean;
  geoAreaId: string;
}) {
  const params = new URLSearchParams();
  if (filters.serviceMode) params.set('serviceMode', filters.serviceMode);
  if (filters.listingMode) params.set('listingMode', filters.listingMode);
  if (filters.verifiedOnly) params.set('verified', 'true');
  if (filters.geoAreaId) params.set('geoAreaId', filters.geoAreaId);
  const encoded = params.toString();
  return encoded ? `&${encoded}` : '';
}

const CATEGORY_ACCENTS = ['teal', 'coral', 'violet', 'sky', 'rose', 'indigo', 'amber', 'emerald'] as const;

export default function ExplorePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [branches, setBranches] = useState<ExploreBranch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState('Near you');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [sortBy, setSortBy] = useState<'recommended' | 'rating'>('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [serviceMode, setServiceMode] = useState('');
  const [listingMode, setListingMode] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [geoAreaId, setGeoAreaId] = useState('');
  const [geoAreas, setGeoAreas] = useState<{ id: number; name: string; city?: string }[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const bootstrapped = useRef(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const draggingSplit = useRef(false);
  const listPctRef = useRef(52);
  const [listPct, setListPct] = useState(52);
  const [splitting, setSplitting] = useState(false);

  const loadNearby = useCallback(async (lat: number, lon: number, queryVal = '', radius = radiusKm) => {
    setLoading(true);
    setError(null);
    try {
      const nearbyUrl = `/api/discover/nearby?lat=${lat}&lon=${lon}&radius=${radius * 1000}${queryVal ? `&q=${encodeURIComponent(queryVal)}` : ''}${discoveryFilterQs({ serviceMode, listingMode, verifiedOnly, geoAreaId })}`;
      const favPromise = isAuthenticated
        ? apiFetch<{ business: { id: number } }[]>('/api/favorites').catch(() => [])
        : Promise.resolve([] as { business: { id: number } }[]);
      const [branchData, catData, favData] = await Promise.all([
        apiFetch<ExploreBranch[]>(nearbyUrl, { skipAuth: true }),
        apiFetch<Category[]>('/api/discover/categories', { skipAuth: true }),
        favPromise,
      ]);
      const rated = withExploreMeta(branchData);
      setBranches(rated);
      setCategories(catData);
      setFavorites(favData.map((f) => f.business.id));
      setIsSearchActive(queryVal !== '');
      setLocationLabel('Near you');
      setSelectedId(null);
      setHoveredId(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load nearby businesses.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [radiusKm, isAuthenticated, serviceMode, listingMode, verifiedOnly, geoAreaId]);

  const loadSearch = useCallback(async (queryVal = '', isSearching = false) => {
    setLoading(true);
    setError(null);
    try {
      const searchUrl = `/api/discover/search?q=${encodeURIComponent(queryVal)}${discoveryFilterQs({ serviceMode, listingMode, verifiedOnly, geoAreaId })}`;
      const favPromise = isAuthenticated
        ? apiFetch<{ business: { id: number } }[]>('/api/favorites').catch(() => [])
        : Promise.resolve([] as { business: { id: number } }[]);
      const [branchData, catData, favData] = await Promise.all([
        apiFetch<ExploreBranch[]>(searchUrl, { skipAuth: true }),
        apiFetch<Category[]>('/api/discover/categories', { skipAuth: true }),
        favPromise,
      ]);
      const rated = withExploreMeta(branchData);
      setBranches(rated);
      setCategories(catData);
      setFavorites(favData.map((f) => f.business.id));
      setIsSearchActive(isSearching || queryVal !== '');
      setSelectedId(null);
      setHoveredId(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load explore data.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, serviceMode, listingMode, verifiedOnly, geoAreaId]);

  const loadCategoriesOnly = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catData = await apiFetch<Category[]>('/api/discover/categories', { skipAuth: true });
      setCategories(catData);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerSearchOrNearby = useCallback((query: string, radius = radiusKm) => {
    if (coords) {
      loadNearby(coords.lat, coords.lon, query, radius);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setCoords(next);
          loadNearby(next.lat, next.lon, query, radius);
        },
        (err) => {
          console.warn('Geolocation failed or denied:', err);
          loadSearch(query, true);
        },
        { timeout: 8000 }
      );
    } else {
      loadSearch(query, true);
    }
  }, [coords, loadNearby, loadSearch, radiusKm]);

  useEffect(() => {
    apiFetch<{ id: number; name: string; city?: string }[]>('/api/public/geo/areas', { skipAuth: true })
      .then(setGeoAreas)
      .catch(() => setGeoAreas([]));
  }, []);

  useEffect(() => {
    if (!bootstrapped.current) return;
    triggerSearchOrNearby(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceMode, listingMode, verifiedOnly, geoAreaId]);

  useEffect(() => {
    if (authLoading || bootstrapped.current) return;
    bootstrapped.current = true;

    let q = '';
    let latParam: number | null = null;
    let lonParam: number | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      q = params.get('q') || '';
      const lat = params.get('lat');
      const lon = params.get('lon');
      if (lat && lon) {
        const latN = Number(lat);
        const lonN = Number(lon);
        if (Number.isFinite(latN) && Number.isFinite(lonN)) {
          latParam = latN;
          lonParam = lonN;
        }
      }
      if (!q) {
        const raw = sessionStorage.getItem('hourslot_explore_q');
        if (raw) {
          sessionStorage.removeItem('hourslot_explore_q');
          const parsed = JSON.parse(raw);
          q = typeof parsed === 'string' ? parsed : parsed?.q || '';
        }
      }
      if (latParam == null) {
        const rawCoords = sessionStorage.getItem('hourslot_explore_coords');
        if (rawCoords) {
          sessionStorage.removeItem('hourslot_explore_coords');
          const parsed = JSON.parse(rawCoords) as { lat?: number; lon?: number };
          if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
            latParam = parsed.lat;
            lonParam = parsed.lon;
          }
        }
      }
    } catch {
      q = '';
    }

    if (latParam != null && lonParam != null) {
      setCoords({ lat: latParam, lon: lonParam });
      setLocationLabel('Near you');
    }

    if (q) {
      setSearchQuery(q);
      setActiveCategory(q);
      if (latParam != null && lonParam != null) {
        loadNearby(latParam, lonParam, q, radiusKm);
      } else {
        triggerSearchOrNearby(q);
      }
      return;
    }

    if (latParam != null && lonParam != null) {
      loadNearby(latParam, lonParam, '', radiusKm);
      return;
    }

    if (isAuthenticated) {
      triggerSearchOrNearby('');
      return;
    }

    loadCategoriesOnly();
  }, [authLoading, isAuthenticated, loadCategoriesOnly, loadNearby, radiusKm, triggerSearchOrNearby]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('hourslot_explore_split_pct');
      if (!stored) return;
      const n = Number(stored);
      if (Number.isFinite(n) && n >= 32 && n <= 72) {
        listPctRef.current = n;
        setListPct(n);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onSplitPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    draggingSplit.current = true;
    setSplitting(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onSplitPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!draggingSplit.current || !splitRef.current) return;
    const rect = splitRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = Math.min(72, Math.max(32, ((e.clientX - rect.left) / rect.width) * 100));
    listPctRef.current = next;
    setListPct(next);
  };

  const onSplitPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    draggingSplit.current = false;
    setSplitting(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    try {
      sessionStorage.setItem('hourslot_explore_split_pct', String(listPctRef.current));
    } catch {
      /* ignore */
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setActiveCategory(null);
    triggerSearchOrNearby(searchQuery);
  };

  const handleCategoryClick = (catName: string) => {
    setSearchQuery(catName);
    setActiveCategory(catName);
    triggerSearchOrNearby(catName);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchActive(false);
    setActiveCategory(null);
    setSelectedId(null);
    setHoveredId(null);
    if (coords) {
      loadNearby(coords.lat, coords.lon, '');
    } else {
      loadSearch('', false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, businessId: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      router.push(loginHref(`${window.location.pathname}${window.location.search}`));
      return;
    }
    const isFav = favorites.includes(businessId);
    setError(null);
    setSuccess(null);
    try {
      if (isFav) {
        await apiFetch(`/api/favorites/${businessId}`, { method: 'DELETE' });
        setFavorites((prev) => prev.filter((id) => id !== businessId));
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

  const startVoice = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => { lang: string; start: () => void; onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null };
      webkitSpeechRecognition?: new () => { lang: string; start: () => void; onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null };
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setSearchQuery(text);
      triggerSearchOrNearby(text);
    };
    rec.start();
  };

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('health') || lower.includes('medical') || lower.includes('dentist'))
      return 'fa-solid fa-heart-pulse';
    if (lower.includes('beauty') || lower.includes('spa') || lower.includes('wellness'))
      return 'fa-solid fa-spa';
    if (lower.includes('fitness') || lower.includes('yoga') || lower.includes('gym'))
      return 'fa-solid fa-dumbbell';
    if (lower.includes('salon') || lower.includes('hair') || lower.includes('barber'))
      return 'fa-solid fa-scissors';
    if (lower.includes('pet') || lower.includes('dog') || lower.includes('vet')) return 'fa-solid fa-paw';
    if (lower.includes('home') || lower.includes('service') || lower.includes('repair'))
      return 'fa-solid fa-wrench';
    return 'fa-solid fa-shapes';
  };

  const coverFor = (b: ExploreBranch) => {
    const gallery = b.business.galleryUrls
      ?.split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    if (gallery && gallery.length > 0) return gallery[0];
    if (b.business.logoUrl) return b.business.logoUrl;
    return null;
  };

  const sortedBranches = useMemo(() => {
    const list = [...branches];
    if (sortBy === 'rating') {
      list.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    }
    return list;
  }, [branches, sortBy]);

  const mapMarkers = useMemo(
    () =>
      sortedBranches
        .filter((b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude))
        .slice(0, 40)
        .map((b) => ({
          id: b.id,
          lat: b.latitude as number,
          lng: b.longitude as number,
          label: `<strong>${b.business?.name || b.name}</strong><br/>${b.address || b.name}`,
        })),
    [sortedBranches]
  );

  const previewId = hoveredId ?? selectedId;
  const selected = sortedBranches.find((b) => b.id === previewId) || null;

  if (authLoading) {
    return (
      <div className={styles.dashExplore} style={{ placeItems: 'center' }}>
        <Skeleton variant="card" height={220} />
      </div>
    );
  }

  const renderGuestCard = (b: ExploreBranch) => {
    if (!b.business) return null;
    const isFav = favorites.includes(b.business.id);
    const cover = coverFor(b);
    const cat = b.business.primaryCategory?.name || 'Service';
    return (
      <Link href={branchProfileHref(b)} key={b.id} className={styles.popularCard}>
        <div className={styles.popularCardImageWrapper}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={b.business.name} />
          ) : (
            <div className={styles.coverFallback}>{b.business.name.slice(0, 1)}</div>
          )}
          <span className={styles.cardCatPill}>{cat}</span>
          {typeof b.averageRating === 'number' && b.averageRating > 0 && (
            <div className={styles.ratingBadge}>
              <i className="fa-solid fa-star" /> {b.averageRating.toFixed(1)}
            </div>
          )}
          <button
            type="button"
            className={`${styles.cardFavBtn} ${isFav ? styles.isFav : ''}`}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => handleToggleFavorite(e, b.business.id)}
          >
            <i className={`fa-${isFav ? 'solid' : 'regular'} fa-heart`} />
          </button>
        </div>
        <div className={styles.popularCardContent}>
          <h4>
            {b.business.name}
            {b.business.verified ? (
              <i
                className="fa-solid fa-circle-check"
                title="Verified business"
                style={{ marginLeft: 6, color: 'var(--accent-primary)', fontSize: '0.85em' }}
              />
            ) : null}
          </h4>
          <p className={styles.categorySub}>{b.name}</p>
          <p className={styles.distanceText}>
            <i className="fa-solid fa-location-dot" />{' '}
            {[b.address, typeof b.distanceKm === 'number' ? `${b.distanceKm.toFixed(1)} km away` : [b.city, b.region].filter(Boolean).join(', ')]
              .filter(Boolean)
              .join(' · ') || b.name}
          </p>
          <span className={styles.cardCta}>
            View profile <i className="fa-solid fa-arrow-right" />
          </span>
        </div>
      </Link>
    );
  };

  const renderDashCard = (b: ExploreBranch) => {
    if (!b.business) return null;
    const isFav = favorites.includes(b.business.id);
    const cover = coverFor(b);
    const cat = b.business.primaryCategory?.name || 'Service';
    const href = branchProfileHref(b);
    return (
      <article
        key={b.id}
        className={styles.resultCard}
        onMouseEnter={() => setHoveredId(b.id)}
        onMouseLeave={() => setHoveredId((current) => (current === b.id ? null : current))}
        onClick={() => router.push(href)}
      >
        <div className={styles.resultThumb}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" />
          ) : (
            <div className={styles.coverFallback}>{b.business.name.slice(0, 1)}</div>
          )}
          {typeof b.averageRating === 'number' && b.averageRating > 0 && (
            <span className={styles.thumbRating}>
              <i className="fa-solid fa-star" /> {b.averageRating.toFixed(1)}
            </span>
          )}
        </div>
        <div className={styles.resultBody}>
          <div className={styles.resultTop}>
            <span className={styles.catPill}>{cat}</span>
            <button
              type="button"
              className={`${styles.heartBtn} ${isFav ? styles.isFav : ''}`}
              aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              onClick={(e) => handleToggleFavorite(e, b.business.id)}
            >
              <i className={`fa-${isFav ? 'solid' : 'regular'} fa-heart`} />
            </button>
          </div>
          <Link href={href} className={styles.resultName} onClick={(e) => e.stopPropagation()}>
            {b.business.name}
            {b.business.verified ? (
              <i
                className="fa-solid fa-circle-check"
                title="Verified business"
                style={{ marginLeft: 6, color: 'var(--accent-primary)', fontSize: '0.85em' }}
              />
            ) : null}
          </Link>
          <p className={styles.resultAddr}>
            <strong>{b.name}</strong>
            {b.address ? ` · ${b.address}` : ''}
            {typeof b.distanceKm === 'number' ? ` · ${b.distanceKm.toFixed(1)} km` : ''}
          </p>
          <div className={styles.resultMeta}>
            <Link
              href={href}
              className={styles.bookLink}
              onClick={(e) => e.stopPropagation()}
            >
              View this location
            </Link>
            <span className={styles.nextSlot}>Choose a service</span>
          </div>
        </div>
      </article>
    );
  };

  if (isAuthenticated) {
    const firstName = user?.firstName || 'there';
    return (
      <div
        ref={splitRef}
        className={`${styles.dashExplore} ${splitting ? styles.dashExploreSplitting : ''}`}
        style={{ ['--find-pane-width' as string]: `${listPct}%` }}
      >
        <section className={styles.findPane}>
          <header className={styles.findHead}>
            <div>
              <span className={styles.findEyebrow}>
                <i className="fa-solid fa-sparkles" /> Marketplace
              </span>
              <h1>Hi {firstName}, explore nearby</h1>
              <p>Search businesses, compare services, and book open slots.</p>
            </div>
            <span className={styles.locChip}>
              <i className="fa-solid fa-location-dot" aria-hidden />
              {locationLabel}
            </span>
          </header>

          <div className={styles.dashStats}>
            <div className={`${styles.dashStat} ${styles.dashStatTeal}`}>
              <i className="fa-solid fa-store" />
              <div>
                <strong>{sortedBranches.length}</strong>
                <span>Results</span>
              </div>
            </div>
            <div className={`${styles.dashStat} ${styles.dashStatRose}`}>
              <i className="fa-solid fa-heart" />
              <div>
                <strong>{favorites.length}</strong>
                <span>Saved</span>
              </div>
            </div>
            <div className={`${styles.dashStat} ${styles.dashStatIndigo}`}>
              <i className="fa-solid fa-ruler" />
              <div>
                <strong>{radiusKm} km</strong>
                <span>Radius</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className={styles.findSearch}>
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input
              type="text"
              placeholder="Search businesses, services, or categories"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search businesses and services"
            />
            <button type="button" className={styles.micBtn} onClick={startVoice} aria-label="Voice search">
              <i className="fa-solid fa-microphone" />
            </button>
            <button type="submit" className={styles.searchGo}>
              Search
            </button>
          </form>

          <div className={styles.filterRow}>
            <button
              type="button"
              className={`${styles.filterMain} ${filtersOpen ? styles.filterMainOn : ''}`}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <i className="fa-solid fa-sliders" /> Filters
            </button>
            <label className={styles.filterPill}>
              Distance
              <CustomSelect
                variant="compact"
                searchable={false}
                value={String(radiusKm)}
                onChange={(value) => {
                  const next = Number(value);
                  setRadiusKm(next);
                  triggerSearchOrNearby(searchQuery, next);
                }}
                options={DISTANCES.map((d) => ({ value: String(d), label: `${d} km` }))}
                placeholder="Distance"
              />
            </label>
            <label className={styles.filterPill}>
              Sort
              <CustomSelect
                variant="compact"
                searchable={false}
                value={sortBy}
                onChange={(value) => setSortBy(value as 'recommended' | 'rating')}
                options={[
                  { value: 'recommended', label: 'Recommended' },
                  { value: 'rating', label: 'Rating' },
                ]}
                placeholder="Sort by"
              />
            </label>
            <label className={styles.filterPill}>
              Service
              <CustomSelect
                variant="compact"
                searchable={false}
                value={serviceMode}
                onChange={(value) => setServiceMode(value)}
                options={[
                  { value: '', label: 'Any place' },
                  { value: 'AT_PROVIDER', label: 'At provider' },
                  { value: 'CUSTOMER_LOCATION', label: 'At your location' },
                  { value: 'HYBRID', label: 'Hybrid' },
                ]}
                placeholder="Service mode"
              />
            </label>
            <label className={styles.filterPill}>
              Listing
              <CustomSelect
                variant="compact"
                searchable={false}
                value={listingMode}
                onChange={(value) => setListingMode(value)}
                options={[
                  { value: '', label: 'All listings' },
                  { value: 'BUSINESS', label: 'Business' },
                  { value: 'INDIVIDUAL', label: 'Individual' },
                ]}
                placeholder="Listing"
              />
            </label>
            {geoAreas.length > 0 && (
              <label className={styles.filterPill}>
                Area
                <CustomSelect
                  variant="compact"
                  searchable
                  value={geoAreaId}
                  onChange={(value) => setGeoAreaId(value)}
                  options={[
                    { value: '', label: 'Any area' },
                    ...geoAreas.map((area) => ({
                      value: String(area.id),
                      label: area.city ? `${area.name} (${area.city})` : area.name,
                    })),
                  ]}
                  placeholder="Area"
                />
              </label>
            )}
            <button
              type="button"
              className={`${styles.filterMain} ${verifiedOnly ? styles.filterMainOn : ''}`}
              onClick={() => setVerifiedOnly((v) => !v)}
            >
              <i className="fa-solid fa-circle-check" /> Verified
            </button>
          </div>

          {filtersOpen && categories.length > 0 && (
            <div className={styles.categoryRow}>
              {categories.map((cat, idx) => {
                const accent = CATEGORY_ACCENTS[idx % CATEGORY_ACCENTS.length];
                return (
                  <button
                    type="button"
                    key={cat.id}
                    className={`${styles.categoryChip} ${styles[`chipAccent${accent.charAt(0).toUpperCase()}${accent.slice(1)}`]} ${activeCategory === cat.name ? styles.categoryChipActive : ''}`}
                    onClick={() => handleCategoryClick(cat.name)}
                  >
                    <i className={getCategoryIcon(cat.name)} />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className={styles.resultsBar}>
            <span>Showing {sortedBranches.length} results</span>
            <span>
              Sort by: {sortBy === 'rating' ? 'Rating' : 'Recommended'}
              {isSearchActive && (
                <button type="button" className={styles.clearInline} onClick={handleClearSearch}>
                  Clear
                </button>
              )}
            </span>
          </div>

          {error && (
            <div className="error-alert" style={{ marginBottom: 12 }}>
              <i className="fa-solid fa-triangle-exclamation" /> {error}
            </div>
          )}
          {success && (
            <div className="success-alert" style={{ marginBottom: 12 }}>
              <i className="fa-solid fa-circle-check" /> {success}
            </div>
          )}

          <div
            className={styles.resultList}
            onMouseLeave={() => setHoveredId(null)}
          >
            {loading ? (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className={styles.resultCard}>
                  <Skeleton variant="card" height={92} />
                </div>
              ))
            ) : sortedBranches.length === 0 ? (
              <EmptyState
                icon="fa-store-slash"
                title="No businesses found"
                description="Try another search or a wider distance."
                actionLabel="Refresh"
                onAction={() => triggerSearchOrNearby(searchQuery)}
              />
            ) : (
              sortedBranches.map(renderDashCard)
            )}
          </div>
        </section>

        <button
          type="button"
          className={`${styles.splitHandle} ${splitting ? styles.splitDragging : ''}`}
          aria-label="Resize explore list and map"
          title="Drag to resize"
          onPointerDown={onSplitPointerDown}
          onPointerMove={onSplitPointerMove}
          onPointerUp={onSplitPointerUp}
          onPointerCancel={onSplitPointerUp}
        />

        <section className={styles.mapPane}>
          <div className={styles.mapPaneHead}>
            <span><i className="fa-solid fa-map" /> Map view</span>
            <button type="button" className={styles.mapLocateBtn} onClick={() => triggerSearchOrNearby(searchQuery)}>
              <i className="fa-solid fa-crosshairs" /> Re-center
            </button>
          </div>
          <LocationMap
            markers={mapMarkers}
            userLocation={coords ? { lat: coords.lat, lng: coords.lon } : null}
            height="100%"
            selectedId={previewId}
            onMarkerClick={(id) => setSelectedId(Number(id))}
            showControls
            onLocate={() => triggerSearchOrNearby(searchQuery)}
            scrollWheelZoom
            className={styles.fillMap}
          />
          {selected?.business && (
            <div className={styles.mapCard}>
              <div className={styles.mapCardThumb}>
                {coverFor(selected) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverFor(selected) || ''} alt="" />
                ) : (
                  <div className={styles.coverFallback}>{selected.business.name.slice(0, 1)}</div>
                )}
              </div>
              <div className={styles.mapCardBody}>
                <Link href={branchProfileHref(selected)}>{selected.business.name}</Link>
                <p>
                  <strong>{selected.name}</strong>
                  {selected.address ? ` · ${selected.address}` : ''}
                </p>
                <span>
                  {typeof selected.averageRating === 'number' && selected.averageRating > 0
                    ? `${selected.averageRating.toFixed(1)} · `
                    : ''}
                  {typeof selected.distanceKm === 'number' ? `${selected.distanceKm.toFixed(1)} km` : 'Nearby'}
                </span>
              </div>
              <Link href={branchProfileHref(selected)} className={styles.mapCardBook}>
                View
              </Link>
              <button type="button" className={styles.mapCardClose} onClick={() => setSelectedId(null)} aria-label="Close">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  const isInitialState = !activeCategory && !isSearchActive;

  if (isInitialState) {
    return (
      <div className={styles.exploreApp}>
        {error && (
          <div className="error-alert" style={{ marginBottom: 16 }}>
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}

        <header className={styles.appHeader}>
          <div className={styles.appHeaderMain}>
            <span className={styles.appKicker}>
              <i className="fa-solid fa-compass" /> Directory
            </span>
            <h1 className={styles.appTitle}>Explore</h1>
            <p className={styles.appSub}>
              Live marketplace — search, filter, and open a business profile to book.
            </p>
          </div>
          <div className={styles.appHeaderMeta}>
            <span className={styles.guestBadge}>
              <i className="fa-solid fa-user" /> Guest
            </span>
            <button
              type="button"
              className={styles.locBtn}
              onClick={() => triggerSearchOrNearby('')}
              disabled={loading}
            >
              <i className="fa-solid fa-location-crosshairs" />
              {loading ? 'Locating…' : 'Use my location'}
            </button>
          </div>
        </header>

        <form onSubmit={handleSearchSubmit} className={styles.appSearchPanel}>
          <label className={styles.appSearchField}>
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Business name, service, or keyword…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search marketplace"
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        <div className={styles.appLayout}>
          <section className={styles.categoryPanel} aria-label="Categories">
            <div className={styles.panelHead}>
              <h2>Categories</h2>
              <span>{categories.length} listed</span>
            </div>

            {loading && categories.length === 0 ? (
              <div className={styles.categoryList}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className={styles.categoryRow} style={{ pointerEvents: 'none' }}>
                    <Skeleton width={40} height={40} />
                    <Skeleton variant="title" width="60%" />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.categoryList}>
                {categories.map((cat, idx) => {
                  const accent = CATEGORY_ACCENTS[idx % CATEGORY_ACCENTS.length];
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      className={styles.categoryRow}
                      data-accent={accent}
                      onClick={() => handleCategoryClick(cat.name)}
                    >
                      <span className={styles.categoryRowIcon}>
                        <i className={getCategoryIcon(cat.name)} />
                      </span>
                      <span className={styles.categoryRowBody}>
                        <strong>{cat.name}</strong>
                        <span>Browse {cat.name.toLowerCase()} near you</span>
                      </span>
                      <i className={`fa-solid fa-chevron-right ${styles.categoryRowChev}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className={styles.browsePanel}>
            <div className={styles.browseEmpty}>
              <div className={styles.browseEmptyIcon}>
                <i className="fa-solid fa-map-location-dot" />
              </div>
              <h3>Results appear here</h3>
              <p>
                Pick a category or run a search to load businesses on the map and in the list below.
              </p>
              <ul className={styles.browseTips}>
                <li>
                  <i className="fa-solid fa-check" /> View services &amp; packages without signing in
                </li>
                <li>
                  <i className="fa-solid fa-check" /> Sign in only when you confirm a booking
                </li>
                <li>
                  <i className="fa-solid fa-heart" />{' '}
                  <button type="button" className={styles.inlineLink} onClick={() => router.push(loginHref('/profile/explore'))}>
                    Sign in
                  </button>{' '}
                  to save favorites
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <footer className={styles.appFootnote}>
          <Link href="/" className={styles.homeLink}>
            <i className="fa-solid fa-arrow-left" /> HourSlot home
          </Link>
          <span>New here? Read about the product on the landing page.</span>
        </footer>
      </div>
    );
  }

  return (
    <div className={styles.exploreContainer}>
      <div className={`${styles.browseCompose} ${styles.resultsToolbar}`}>
        <div className={styles.browseComposeTop}>
          <div>
            <span className={styles.resultsEyebrow}>
              <i className="fa-solid fa-list-ul" /> Marketplace results
            </span>
            <h1>
              {isSearchActive ? `“${searchQuery}”` : `Businesses ${locationLabel.toLowerCase()}`}
            </h1>
            <p>Tap a listing to view services, packages, and book a slot.</p>
          </div>
          <div className={styles.resultsToolbarActions}>
            {!loading && branches.length > 0 && (
              <span className={styles.resultCount}>
                {branches.length} found
              </span>
            )}
            {isSearchActive && (
              <button type="button" onClick={handleClearSearch} className={styles.clearSearchBtn}>
                <i className="fa-solid fa-xmark" /> Clear
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className={styles.searchBar}>
          <div className={styles.searchInputWrapper}>
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Salons, studios, clinics, repairs…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search services"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>

        {categories.length > 0 && (
          <div className={styles.categoryRow}>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={`${styles.categoryChip} ${activeCategory === cat.name ? styles.categoryChipActive : ''}`}
                onClick={() => handleCategoryClick(cat.name)}
              >
                <i className={getCategoryIcon(cat.name)} />
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="error-alert" style={{ marginBottom: 20 }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}
      {success && (
        <div className="success-alert" style={{ marginBottom: 20 }}>
          <i className="fa-solid fa-circle-check" /> {success}
        </div>
      )}

      <div className={styles.sectionArea}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {isSearchActive ? 'Matching listings' : 'Nearby listings'}
          </h2>
        </div>

        {!loading && (mapMarkers.length > 0 || coords) && (
          <div className={styles.exploreMap}>
            <LocationMap
              markers={mapMarkers}
              userLocation={coords ? { lat: coords.lat, lng: coords.lon } : null}
              height={300}
            />
            <p className={styles.mapLegend}>
              <span className={styles.youDot} aria-hidden /> You are here
              {mapMarkers.length > 0 ? ' · Pins are nearby businesses' : ''}
            </p>
          </div>
        )}

        {loading ? (
          <div className={styles.popularGrid}>
            {[1, 2, 3].map((n) => (
              <div key={n} className={styles.skeletonCard}>
                <Skeleton variant="card" height={150} />
                <div className={styles.skeletonBody}>
                  <Skeleton variant="title" width="70%" />
                  <Skeleton width="50%" />
                  <Skeleton width="80%" />
                </div>
              </div>
            ))}
          </div>
        ) : branches.length === 0 ? (
          <EmptyState
            icon="fa-store-slash"
            title="No businesses found"
            description="Try another search, or check back after more businesses are approved."
            actionLabel="Refresh"
            onAction={() => (coords ? loadNearby(coords.lat, coords.lon) : loadSearch(''))}
          />
        ) : (
          <div className={styles.popularGrid}>{sortedBranches.map(renderGuestCard)}</div>
        )}
      </div>
    </div>
  );
}
