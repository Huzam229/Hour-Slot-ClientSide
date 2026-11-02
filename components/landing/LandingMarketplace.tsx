'use client';

import Link from 'next/link';
import Reveal from '@/components/Reveal';
import type { LiveListing } from './types';
import { listingHref } from './utils';
import styles from './landing.module.css';

type Props = {
  listings: LiveListing[];
  total: number;
  loading: boolean;
};

export default function LandingMarketplace({ listings, total, loading }: Props) {
  return (
    <Reveal as="section" className={styles.bandAlt} id="marketplace">
      <div className={styles.wrap}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Marketplace</p>
            <h2 className={styles.displayTitle}>Live on Duemet</h2>
            <p className={styles.sectionSub}>
              {!loading && total > 0
                ? `${listings.length} of ${total} approved listings`
                : 'Approved listings from Explore'}
            </p>
          </div>
          <Link href="/profile/explore" className={styles.textLink}>
            See all <i className="fa-solid fa-arrow-right" />
          </Link>
        </div>

        {loading ? (
          <div className={styles.marketGrid}>
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className={`${styles.marketItem} ${styles.skeleton}`} aria-hidden />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className={styles.emptyMarket}>
            <p>No approved listings yet — be the first to fill the week.</p>
            <div className={styles.inlineActions}>
              <Link href="/auth/register?role=business" className={styles.btnPrimary}>
                List your business
              </Link>
              <Link href="/auth/register?role=individual" className={styles.btnGhost}>
                Join as individual
              </Link>
            </div>
          </div>
        ) : (
          <div className={`${styles.marketGrid} hs-list-cascade`}>
            {listings.map((item) => (
              <Link key={item.businessId} href={listingHref(item)} className={styles.marketItem}>
                <span className={styles.marketThumb}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" />
                  ) : (
                    <em>{item.name.charAt(0)}</em>
                  )}
                </span>
                <span className={styles.marketCopy}>
                  <strong>
                    {item.name}
                    {item.verified ? (
                      <>
                        {' '}
                        <i className="fa-solid fa-circle-check" title="Verified" aria-label="Verified" />
                      </>
                    ) : null}
                  </strong>
                  <span>
                    {item.category}
                    {item.location ? ` · ${item.location}` : ''}
                  </span>
                </span>
                {item.rating > 0 ? (
                  <span className={styles.marketRating}>
                    <i className="fa-solid fa-star" /> {item.rating.toFixed(1)}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}
