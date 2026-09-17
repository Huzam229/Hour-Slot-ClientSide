'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { buildBookingHref } from '@/lib/booking-flow';
import { formatMoney } from '@/lib/money';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import styles from '@/app/phase1.module.css';

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

type PublicProvider = {
  id: number;
  name: string;
  slug: string;
  bio?: string;
  verified?: boolean;
  rating?: number;
  logoUrl?: string;
  serviceMode?: string;
  yearsExperience?: number;
  category?: { name?: string };
  services?: PublicService[];
  serviceAreas?: { type?: string; name?: string }[];
  locations?: { id?: number; name?: string; city?: string; region?: string }[];
  metrics?: {
    rating?: number;
    reviewCount?: number;
    jobsCompleted?: number;
    bookingsCompleted?: number;
    yearsExperience?: number;
    verified?: boolean;
  };
  reviews?: { id: number; rating?: number; comment?: string }[];
};

const serviceModeLabel = (mode?: string) => {
  if (mode === 'CUSTOMER_LOCATION') return 'At your location';
  if (mode === 'HYBRID' || mode === 'BOTH') return 'Studio and home service';
  return 'At provider location';
};

export default function PublicProviderPage() {
  const { slug } = useParams<{ slug: string }>();
  const [provider, setProvider] = useState<PublicProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!slug) return;
    apiFetch<PublicProvider>(`/api/providers/${encodeURIComponent(slug)}`, { skipAuth: true })
      .then((data) => {
        setProvider(data);
        document.title = `${data.name} · HourSlot`;
      })
      .catch((err: { message?: string }) => setError(err?.message || 'This provider is not available.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: provider?.name, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
      }
    } catch {
      // Sharing was cancelled.
    }
  };

  if (loading) {
    return (
      <main className={styles.publicMain}>
        <Skeleton variant="card" height={300} />
        <Skeleton variant="card" height={260} />
      </main>
    );
  }

  if (!provider || error) {
    return (
      <main className={styles.publicMain}>
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-user-slash"
            title="Provider not found"
            description={error || 'This listing may not be published yet.'}
          />
        </div>
      </main>
    );
  }

  const services = provider.services || [];
  const areas = (provider.serviceAreas || []).filter((area) => area.name);
  const firstBranchId = provider.locations?.find((location) => location.id)?.id;

  return (
    <div className={styles.publicPage}>
      <header className={styles.publicHeader}>
        <Link href="/" className={styles.brand}>HourSlot</Link>
        <button type="button" className="btn btn-outline btn-sm" onClick={share}>
          <i className={`fa-solid ${shared ? 'fa-check' : 'fa-arrow-up-from-bracket'}`} />
          {shared ? 'Link copied' : 'Share'}
        </button>
      </header>

      <main className={styles.publicMain}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>{provider.category?.name || 'Independent professional'}</span>
            <h1>
              {provider.name}{' '}
              {provider.verified && <i className="fa-solid fa-circle-check" title="Verified provider" />}
            </h1>
            <p>{provider.bio || 'Browse services and book an available time with this provider.'}</p>
            <div className={styles.meta}>
              <span className={styles.pill}><i className="fa-solid fa-location-arrow" /> {serviceModeLabel(provider.serviceMode)}</span>
              {provider.yearsExperience != null && (
                <span className={styles.pill}><i className="fa-solid fa-award" /> {provider.yearsExperience} years experience</span>
              )}
              {provider.rating != null && provider.rating > 0 && (
                <span className={styles.pill}><i className="fa-solid fa-star" /> {provider.rating.toFixed(1)}</span>
              )}
              {provider.metrics?.reviewCount ? (
                <span className={styles.pill}><i className="fa-solid fa-comments" /> {provider.metrics.reviewCount} reviews</span>
              ) : null}
              {provider.metrics?.jobsCompleted ? (
                <span className={styles.pill}><i className="fa-solid fa-briefcase" /> {provider.metrics.jobsCompleted} jobs</span>
              ) : null}
              {provider.metrics?.bookingsCompleted ? (
                <span className={styles.pill}><i className="fa-solid fa-calendar-check" /> {provider.metrics.bookingsCompleted} bookings</span>
              ) : null}
            </div>
          </div>
          <div className={styles.heroLogo}>
            {provider.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={provider.logoUrl} alt="" />
            ) : provider.name.charAt(0).toUpperCase()}
          </div>
        </section>

        {areas.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Service areas</h2>
                <p>Areas this professional serves</p>
              </div>
            </div>
            <div className={styles.areaList}>
              {areas.map((area, index) => <span className={styles.areaChip} key={`${area.name}-${index}`}>{area.name}</span>)}
            </div>
          </section>
        )}

        {(provider.reviews || []).length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Recent reviews</h2>
                <p>What customers said after completed work</p>
              </div>
            </div>
            <div className={styles.serviceGrid}>
              {(provider.reviews || []).map((review) => (
                <article className={styles.serviceCard} key={review.id}>
                  <h3>{review.rating ? `${review.rating}/5` : 'Review'}</h3>
                  <p>{review.comment || 'No written comment.'}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Services</h2>
              <p>Choose a service to start your booking</p>
            </div>
          </div>
          {services.length === 0 ? (
            <EmptyState title="No services listed" description="This provider has not published services yet." icon="fa-scissors" />
          ) : (
            <div className={styles.serviceGrid}>
              {services.map((service) => {
                const quoteOnly = service.requiresQuote || service.pricingType === 'QUOTE';
                return (
                  <article className={styles.serviceCard} key={service.id}>
                    <h3>{service.name}</h3>
                    <p>{service.description || `${service.durationMinutes || 'Flexible'} minute appointment.`}</p>
                    <div className={styles.serviceFoot}>
                      <span className={styles.price}>
                        {quoteOnly ? 'Quote required' : formatMoney(service.price ?? service.basePrice ?? 0, service.currency)}
                      </span>
                      {quoteOnly ? (
                        <Link
                          className="btn btn-primary btn-sm"
                          href={`/profile/requests/new?serviceId=${service.id}&providerSlug=${encodeURIComponent(provider.slug)}&title=${encodeURIComponent(service.name)}`}
                        >
                          Request quote
                        </Link>
                      ) : (
                        <Link
                          className="btn btn-primary btn-sm"
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
        </section>
      </main>
    </div>
  );
}
