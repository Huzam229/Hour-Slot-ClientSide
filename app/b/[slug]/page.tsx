'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { buildBookingHref } from '@/lib/booking-flow';
import { formatMoney } from '@/lib/money';
import BrandLogo from '@/components/BrandLogo';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Reveal from '@/components/Reveal';
import styles from './provider-profile.module.css';

type PublicService = {
  id: number;
  name: string;
  description?: string;
  price?: number;
  basePrice?: number;
  currency?: string;
  durationMinutes?: number;
  pricingType?: string;
  requiresQuote?: boolean;
};

type PublicStaff = {
  id: number;
  displayName?: string;
  designation?: string;
  specialty?: string;
  bio?: string;
  rating?: number;
};

type PublicLocation = {
  id?: number;
  name?: string;
  city?: string;
  region?: string;
  countryCode?: string;
  implicit?: boolean;
};

type PublicReview = {
  id: number;
  rating?: number;
  comment?: string;
  createdAt?: string;
};

type PublicProvider = {
  id: number;
  name: string;
  slug: string;
  bio?: string;
  listingMode?: string;
  providerType?: string;
  verified?: boolean;
  rating?: number;
  logoUrl?: string;
  galleryUrls?: string;
  serviceMode?: string;
  yearsExperience?: number;
  isOnline?: boolean;
  opsStatus?: string;
  category?: { name?: string; slug?: string };
  services?: PublicService[];
  staff?: PublicStaff[];
  serviceAreas?: { type?: string; name?: string }[];
  locations?: PublicLocation[];
  primaryBranchId?: number;
  metrics?: {
    rating?: number;
    reviewCount?: number;
    jobsCompleted?: number;
    bookingsCompleted?: number;
    yearsExperience?: number;
    verified?: boolean;
  };
  reviews?: PublicReview[];
};

function serviceModeLabel(mode?: string) {
  if (mode === 'CUSTOMER_LOCATION') return 'At your location';
  if (mode === 'HYBRID' || mode === 'BOTH') return 'Studio & home service';
  return 'At provider location';
}

function parseGallery(galleryUrls?: string): string[] {
  return (galleryUrls || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

function isIndividual(provider: PublicProvider) {
  const mode = (provider.listingMode || provider.providerType || '').toUpperCase();
  return mode.includes('INDIVIDUAL');
}

function formatReviewDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span className={styles.stars} aria-label={`${rating.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} className={`fa-solid fa-star ${i < full ? styles.starOn : styles.starOff}`} />
      ))}
    </span>
  );
}

export default function PublicProviderPage() {
  const { slug } = useParams<{ slug: string }>();
  const [provider, setProvider] = useState<PublicProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [activeGallery, setActiveGallery] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!slug) return;
    apiFetch<PublicProvider>(`/api/providers/${encodeURIComponent(slug)}`, { skipAuth: true })
      .then((data) => {
        setProvider(data);
        document.title = `${data.name} · Duemet`;
      })
      .catch((err: { message?: string }) => setError(err?.message || 'This provider is not available.'))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const gallery = useMemo(() => parseGallery(provider?.galleryUrls), [provider?.galleryUrls]);
  const cover = gallery[0] || null;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: provider?.name, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
        setTimeout(() => setShared(false), 2200);
      }
    } catch {
      /* cancelled */
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadWrap}>
          <Skeleton variant="card" height={320} />
          <Skeleton variant="card" height={180} />
          <Skeleton variant="card" height={260} />
        </div>
      </div>
    );
  }

  if (!provider || error) {
    return (
      <div className={styles.page}>
        <header className={styles.topNav}>
          <Link href="/" className={styles.brand}>
            <BrandLogo kind="wordmark" variant="white" height={28} className={styles.brandLogo} />
          </Link>
          <Link href="/profile/explore" className={styles.navGhost}>
            Explore
          </Link>
        </header>
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-user-slash"
            title="Provider not found"
            description={error || 'This listing may not be published yet.'}
          />
          <Link href="/profile/explore" className={styles.primaryBtn}>
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  const individual = isIndividual(provider);
  const services = provider.services || [];
  const staff = (provider.staff || []).filter((m) => m.displayName);
  const locations = (provider.locations || []).filter((l) => !l.implicit || l.city || l.name);
  const areas = (provider.serviceAreas || []).filter((a) => a.name);
  const reviews = provider.reviews || [];
  const rating = provider.metrics?.rating ?? provider.rating ?? 0;
  const reviewCount = provider.metrics?.reviewCount ?? reviews.length;
  const firstBranchId = provider.primaryBranchId || locations.find((l) => l.id)?.id;
  const bookHref = buildBookingHref(provider.id, {
    step: 'service',
    branchId: firstBranchId ? String(firstBranchId) : undefined,
  });

  const stats = [
    rating > 0
      ? { icon: 'fa-star', label: 'Rating', value: rating.toFixed(1) }
      : { icon: 'fa-star', label: 'Rating', value: 'New' },
    { icon: 'fa-comments', label: 'Reviews', value: String(reviewCount) },
    individual
      ? {
          icon: 'fa-briefcase',
          label: 'Jobs done',
          value: String(provider.metrics?.jobsCompleted ?? 0),
        }
      : {
          icon: 'fa-calendar-check',
          label: 'Bookings',
          value: String(provider.metrics?.bookingsCompleted ?? 0),
        },
    provider.yearsExperience != null
      ? { icon: 'fa-award', label: 'Experience', value: `${provider.yearsExperience}y` }
      : {
          icon: 'fa-shapes',
          label: 'Services',
          value: String(services.length),
        },
  ];

  return (
    <div className={`${styles.page} ${individual ? styles.individualTheme : styles.businessTheme}`}>
      <header className={`${styles.topNav} ${scrolled ? styles.topNavSolid : ''}`}>
        <Link href="/" className={styles.brand}>
          <BrandLogo
            kind="wordmark"
            variant={scrolled ? 'color' : 'white'}
            height={28}
            className={styles.brandLogo}
          />
        </Link>
        <nav className={styles.topLinks} aria-label="Page">
          <a href="#about">About</a>
          <a href="#services">Services</a>
          {staff.length > 0 && <a href="#team">Team</a>}
          {reviews.length > 0 && <a href="#reviews">Reviews</a>}
        </nav>
        <div className={styles.topActions}>
          <button type="button" className={styles.shareBtn} onClick={share}>
            <i className={`fa-solid ${shared ? 'fa-check' : 'fa-arrow-up-from-bracket'}`} />
            {shared ? 'Copied' : 'Share'}
          </button>
          <Link href={bookHref} className={styles.primaryBtn}>
            Book now
          </Link>
        </div>
      </header>

      <section className={styles.cover}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className={styles.coverImg} />
        ) : (
          <div className={styles.coverFallback} />
        )}
        <div className={styles.coverShade} />
        <div className={styles.coverGlow} />
        <div className={styles.coverContent}>
          <div className={styles.coverBadges}>
            <span className={styles.typeBadge}>
              <i className={`fa-solid ${individual ? 'fa-user' : 'fa-store'}`} />
              {individual ? 'Individual professional' : 'Business'}
            </span>
            {provider.category?.name && <span className={styles.catBadge}>{provider.category.name}</span>}
            {provider.isOnline && (
              <span className={styles.onlineBadge}>
                <i className="fa-solid fa-circle" /> Online now
              </span>
            )}
          </div>
          <h1>
            {provider.name}
            {provider.verified && (
              <i className={`fa-solid fa-circle-check ${styles.verified}`} title="Verified" aria-label="Verified" />
            )}
          </h1>
          <p className={styles.coverLead}>
            {provider.bio ||
              (individual
                ? 'Book directly with this independent professional on Duemet.'
                : 'Browse services, pick a time, and book with this business on Duemet.')}
          </p>
          <div className={styles.coverCtas}>
            <Link href={bookHref} className={styles.primaryBtnLg}>
              <i className="fa-solid fa-calendar-plus" /> Book an appointment
            </Link>
            <a href="#services" className={styles.ghostBtn}>
              View services
            </a>
          </div>
        </div>
        <div className={styles.coverVisual} aria-hidden>
          {provider.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={provider.logoUrl} alt="" />
          ) : cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" />
          ) : (
            <span className={styles.coverVisualMark}>{provider.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
      </section>

      <div className={styles.identityRow}>
        <div className={styles.avatar}>
          {provider.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={provider.logoUrl} alt="" />
          ) : (
            <span>{provider.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className={styles.identityCopy}>
          <strong>{provider.name}</strong>
          <span>
            {serviceModeLabel(provider.serviceMode)}
            {locations[0]?.city ? ` · ${locations[0].city}` : ''}
            {locations[0]?.region ? `, ${locations[0].region}` : ''}
          </span>
        </div>
        <div className={styles.identityActions}>
          <Link href={bookHref} className={styles.primaryBtn}>
            Book
          </Link>
        </div>
      </div>

      <section className={styles.stats}>
        {stats.map((stat) => (
          <article key={stat.label} className={styles.statCard}>
            <i className={`fa-solid ${stat.icon}`} />
            <div>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          </article>
        ))}
      </section>

      <main className={styles.main}>
        <div className={styles.primaryCol}>
          <Reveal as="section" className={styles.section} id="about">
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>About</p>
              <h2>Get to know {individual ? 'them' : 'the business'}</h2>
            </div>
            <p className={styles.aboutText}>
              {provider.bio ||
                `${provider.name} is listed on Duemet for appointment booking. Choose a service below to see live availability.`}
            </p>
            <div className={styles.factGrid}>
              <div className={styles.fact}>
                <i className="fa-solid fa-map-location-dot" />
                <div>
                  <strong>Service mode</strong>
                  <span>{serviceModeLabel(provider.serviceMode)}</span>
                </div>
              </div>
              <div className={styles.fact}>
                <i className={`fa-solid ${individual ? 'fa-user-check' : 'fa-building'}`} />
                <div>
                  <strong>Listing type</strong>
                  <span>{individual ? 'Individual professional' : 'Business listing'}</span>
                </div>
              </div>
              {provider.verified && (
                <div className={styles.fact}>
                  <i className="fa-solid fa-shield-halved" />
                  <div>
                    <strong>Verification</strong>
                    <span>Verified on Duemet</span>
                  </div>
                </div>
              )}
              {provider.yearsExperience != null && (
                <div className={styles.fact}>
                  <i className="fa-solid fa-award" />
                  <div>
                    <strong>Experience</strong>
                    <span>{provider.yearsExperience} years</span>
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          {gallery.length > 0 && (
            <Reveal as="section" className={styles.section} id="gallery">
              <div className={styles.sectionHead}>
                <p className={styles.eyebrow}>Gallery</p>
                <h2>A look inside</h2>
              </div>
              <div className={styles.galleryHero}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gallery[activeGallery] || gallery[0]} alt="" />
              </div>
              {gallery.length > 1 && (
                <div className={styles.galleryThumbs}>
                  {gallery.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      className={`${styles.thumb} ${activeGallery === index ? styles.thumbOn : ''}`}
                      onClick={() => setActiveGallery(index)}
                      aria-label={`Gallery image ${index + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </Reveal>
          )}

          <Reveal as="section" className={styles.section} id="services">
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>Services</p>
              <h2>Book a service</h2>
              <p>Pick what you need, then choose a live opening.</p>
            </div>
            {services.length === 0 ? (
              <EmptyState
                title="No services listed"
                description="This provider has not published services yet."
                icon="fa-scissors"
              />
            ) : (
              <div className={`${styles.serviceGrid} hs-stagger`}>
                {services.map((service) => {
                  const quoteOnly = service.requiresQuote || service.pricingType === 'QUOTE';
                  return (
                    <article key={service.id} className={styles.serviceCard}>
                      <div className={styles.serviceTop}>
                        <span className={styles.serviceIcon}>
                          <i className="fa-solid fa-wand-magic-sparkles" />
                        </span>
                        <div>
                          <h3>{service.name}</h3>
                          <span className={styles.duration}>
                            <i className="fa-solid fa-clock" />{' '}
                            {service.durationMinutes ? `${service.durationMinutes} min` : 'Flexible'}
                          </span>
                        </div>
                      </div>
                      <p>{service.description || 'Book this service on Duemet.'}</p>
                      <div className={styles.serviceFoot}>
                        <strong className={styles.price}>
                          {quoteOnly
                            ? 'Quote required'
                            : formatMoney(service.price ?? service.basePrice ?? 0, service.currency)}
                        </strong>
                        {quoteOnly ? (
                          <Link
                            className={styles.secondaryBtn}
                            href={`/profile/requests/new?serviceId=${service.id}&providerSlug=${encodeURIComponent(provider.slug)}&title=${encodeURIComponent(service.name)}`}
                          >
                            Request quote
                          </Link>
                        ) : (
                          <Link
                            className={styles.primaryBtn}
                            href={buildBookingHref(provider.id, {
                              step: 'details',
                              serviceId: String(service.id),
                              branchId: firstBranchId ? String(firstBranchId) : undefined,
                            })}
                          >
                            Book
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Reveal>

          {staff.length > 0 && (
            <Reveal as="section" className={styles.section} id="team">
              <div className={styles.sectionHead}>
                <p className={styles.eyebrow}>Team</p>
                <h2>{individual ? 'Your specialist' : 'Meet the team'}</h2>
              </div>
              <div className={`${styles.teamGrid} hs-stagger`}>
                {staff.map((member) => (
                  <article key={member.id} className={styles.teamCard}>
                    <div className={styles.teamAvatar}>{(member.displayName || '?').charAt(0)}</div>
                    <div>
                      <h3>{member.displayName}</h3>
                      <span>{member.designation || member.specialty || 'Specialist'}</span>
                      {member.bio && <p>{member.bio}</p>}
                      {member.rating != null && member.rating > 0 && (
                        <em>
                          <i className="fa-solid fa-star" /> {Number(member.rating).toFixed(1)}
                        </em>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </Reveal>
          )}

          {reviews.length > 0 && (
            <Reveal as="section" className={styles.section} id="reviews">
              <div className={styles.sectionHead}>
                <p className={styles.eyebrow}>Reviews</p>
                <h2>What customers say</h2>
              </div>
              <div className={`${styles.reviewGrid} hs-stagger`}>
                {reviews.map((review) => (
                  <article key={review.id} className={styles.reviewCard}>
                    <div className={styles.reviewTop}>
                      <Stars rating={review.rating || 0} />
                      <span>{formatReviewDate(review.createdAt)}</span>
                    </div>
                    <p>{review.comment || 'Rated this experience without a written comment.'}</p>
                  </article>
                ))}
              </div>
            </Reveal>
          )}
        </div>

        <aside className={styles.sideCol}>
          <div className={styles.bookCard}>
            <p className={styles.eyebrow}>Ready when you are</p>
            <h3>Book with {provider.name}</h3>
            <p>
              Live openings, conflict-safe booking, and clear pricing before you confirm.
            </p>
            <Link href={bookHref} className={styles.primaryBtnLg}>
              <i className="fa-solid fa-calendar-check" /> Start booking
            </Link>
            <Link href="/profile/explore" className={styles.textLink}>
              Back to Explore
            </Link>
          </div>

          {locations.length > 0 && (
            <Reveal as="section" className={styles.sideSection}>
              <h3>
                <i className="fa-solid fa-location-dot" /> Locations
              </h3>
              <ul className={styles.sideList}>
                {locations.map((loc, index) => (
                  <li key={`${loc.id || loc.name}-${index}`}>
                    <strong>{loc.name || 'Location'}</strong>
                    <span>
                      {[loc.city, loc.region, loc.countryCode].filter(Boolean).join(', ') || 'Local service'}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {areas.length > 0 && (
            <Reveal as="section" className={styles.sideSection}>
              <h3>
                <i className="fa-solid fa-map" /> Service areas
              </h3>
              <div className={styles.chipWrap}>
                {areas.map((area, index) => (
                  <span key={`${area.name}-${index}`} className={styles.chip}>
                    {area.name}
                  </span>
                ))}
              </div>
            </Reveal>
          )}

          <section className={styles.sideSection}>
            <h3>
              <i className="fa-solid fa-circle-info" /> Snapshot
            </h3>
            <ul className={styles.snapshot}>
              <li>
                <span>Type</span>
                <strong>{individual ? 'Individual' : 'Business'}</strong>
              </li>
              <li>
                <span>Category</span>
                <strong>{provider.category?.name || 'General'}</strong>
              </li>
              <li>
                <span>Services</span>
                <strong>{services.length}</strong>
              </li>
              {provider.verified && (
                <li>
                  <span>Status</span>
                  <strong>Verified</strong>
                </li>
              )}
            </ul>
          </section>
        </aside>
      </main>

      <div className={styles.mobileBar}>
        <div>
          <strong>{provider.name}</strong>
          <span>{rating > 0 ? `${rating.toFixed(1)} ★` : 'New on Duemet'}</span>
        </div>
        <Link href={bookHref} className={styles.primaryBtn}>
          Book
        </Link>
      </div>
    </div>
  );
}
