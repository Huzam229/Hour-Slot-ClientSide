'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import LandingNav from './LandingNav';
import LandingHero from './LandingHero';
import LandingCategories from './LandingCategories';
import LandingHowItWorks from './LandingHowItWorks';
import LandingMarketplace from './LandingMarketplace';
import LandingTrust from './LandingTrust';
import LandingProviders from './LandingProviders';
import LandingVoices from './LandingVoices';
import LandingFaq from './LandingFaq';
import LandingFinalCta from './LandingFinalCta';
import LandingFooter from './LandingFooter';
import { useMarketplace } from './useMarketplace';
import styles from './landing.module.css';

export default function LandingPage() {
  const router = useRouter();
  const { liveListings, featuredListings, categories, loading } = useMarketplace();
  const [service, setService] = useState('');
  const [location, setLocation] = useState('');
  const [locating, setLocating] = useState(false);

  const persistSearch = (query: string, geo?: { lat: number; lon: number }) => {
    try {
      sessionStorage.setItem(
        'duemet_explore_q',
        JSON.stringify({ q: query.trim(), location: location.trim() })
      );
      if (geo) {
        sessionStorage.setItem('duemet_explore_coords', JSON.stringify(geo));
      }
    } catch {
      /* ignore */
    }
  };

  const goSearch = (query = service, geo?: { lat: number; lon: number }) => {
    persistSearch(query, geo);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (geo) {
      params.set('lat', String(geo.lat));
      params.set('lon', String(geo.lon));
    }
    const qs = params.toString();
    router.push(qs ? `/profile/explore?${qs}` : '/profile/explore');
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    goSearch(service);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocation('Near you');
      goSearch(service);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const geo = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLocation('Near you');
        setLocating(false);
        goSearch(service, geo);
      },
      () => {
        setLocation('Near you');
        setLocating(false);
        goSearch(service);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className={styles.page}>
      <LandingNav />
      <LandingHero
        service={service}
        location={location}
        locating={locating}
        onServiceChange={setService}
        onLocationChange={setLocation}
        onSearch={handleSearch}
        onLocate={locateMe}
        onQuickSearch={(term) => {
          setService(term);
          goSearch(term);
        }}
      />
      <LandingCategories
        categories={categories}
        loading={loading}
        onSelect={(name) => {
          setService(name);
          goSearch(name);
        }}
      />
      <LandingHowItWorks />
      <LandingMarketplace listings={featuredListings} total={liveListings.length} loading={loading} />
      <LandingProviders />
      <LandingTrust />
      <LandingVoices />
      <LandingFaq />
      <LandingFinalCta />
      <LandingFooter />
    </div>
  );
}
