'use client';

import { type FormEvent } from 'react';
import styles from './landing.module.css';

const POPULAR = ['Haircut', 'Massage', 'Dentist', 'Nails', 'Home cleaning'];

type Props = {
  service: string;
  location: string;
  locating: boolean;
  onServiceChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSearch: (e: FormEvent) => void;
  onLocate: () => void;
  onQuickSearch: (value: string) => void;
};

export default function LandingHero({
  service,
  location,
  locating,
  onServiceChange,
  onLocationChange,
  onSearch,
  onLocate,
  onQuickSearch,
}: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <span className={styles.heroPill}>
          <b>New</b> Live availability from local pros
        </span>

        <h1 className={styles.heroTitle}>
          Book the right person, <span className={styles.heroAccent}>at the right hour.</span>
        </h1>
        <p className={styles.heroSub}>
          Search nearby salons, clinics, and independents. Pick an open slot in seconds, or ask for a quote.
        </p>

        <form className={styles.search} onSubmit={onSearch}>
          <label className={styles.searchField}>
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            <input
              type="text"
              placeholder="Service or business"
              value={service}
              onChange={(e) => onServiceChange(e.target.value)}
              aria-label="Service or business"
            />
          </label>
          <span className={styles.searchDivider} aria-hidden />
          <label className={styles.searchField}>
            <i className="fa-solid fa-location-dot" aria-hidden />
            <input
              type="text"
              placeholder="Where"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              aria-label="Location"
            />
            <button
              type="button"
              className={styles.gpsBtn}
              onClick={onLocate}
              aria-label="Use my location"
              title="Use my location"
            >
              <i className={`fa-solid ${locating ? 'fa-circle-notch fa-spin' : 'fa-location-crosshairs'}`} />
            </button>
          </label>
          <button type="submit" className={styles.searchBtn}>
            Search
          </button>
        </form>

        <div className={styles.heroChips}>
          <span>Popular:</span>
          {POPULAR.map((term) => (
            <button key={term} type="button" onClick={() => onQuickSearch(term)}>
              {term}
            </button>
          ))}
        </div>

        <ul className={styles.heroTrust}>
          <li><i className="fa-solid fa-bolt" aria-hidden /> Instant confirmation</li>
          <li><i className="fa-solid fa-shield-halved" aria-hidden /> Verified providers</li>
          <li><i className="fa-solid fa-calendar-xmark" aria-hidden /> Free to reschedule</li>
        </ul>
      </div>
    </section>
  );
}
