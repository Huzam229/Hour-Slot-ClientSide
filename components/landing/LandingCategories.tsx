'use client';

import Link from 'next/link';
import Reveal from '@/components/Reveal';
import type { LandingCategory } from './types';
import styles from './landing.module.css';

type Props = {
  categories: LandingCategory[];
  loading: boolean;
  onSelect: (name: string) => void;
};

export default function LandingCategories({ categories, loading, onSelect }: Props) {
  if (!loading && categories.length === 0) return null;

  return (
    <Reveal as="section" className={styles.bandTight} id="categories">
      <div className={styles.wrap}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Explore</p>
            <h2 className={styles.displayTitle}>Start with a craft</h2>
          </div>
          <Link href="/profile/explore" className={styles.textLink}>
            View all <i className="fa-solid fa-arrow-right" />
          </Link>
        </div>

        {loading ? (
          <div className={styles.catRail}>
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className={`${styles.catTile} ${styles.skeleton}`} aria-hidden />
            ))}
          </div>
        ) : (
          <div className={`${styles.catRail} hs-stagger`}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={styles.catTile}
                onClick={() => onSelect(cat.name)}
              >
                {cat.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cat.imageUrl} alt="" className={styles.catImg} />
                ) : (
                  <span className={styles.catFallback} aria-hidden />
                )}
                <span className={styles.catShade} aria-hidden />
                <span className={styles.catMeta}>
                  {cat.icon ? (
                    <i className={`${cat.icon} ${styles.catIcon}`} aria-hidden />
                  ) : null}
                  <strong>{cat.name}</strong>
                  <em>
                    {cat.listingCount} listing{cat.listingCount === 1 ? '' : 's'}
                  </em>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}
