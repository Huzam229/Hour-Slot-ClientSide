'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import FormField from '@/components/FormField';
import CustomSelect from '@/components/CustomSelect';
import SoloServicesEditor from '@/components/provider/SoloServicesEditor';
import Skeleton from '@/components/Skeleton';
import styles from '@/app/phase1.module.css';

const LocationPicker = dynamic(
  () => import('@/components/LocationMap').then((m) => m.LocationPicker),
  { ssr: false, loading: () => <Skeleton variant="card" /> }
);

type GeoArea = { id: number; name: string };
type SavedArea = { id: number; coverageType: string; areaName?: string; geoArea?: { name: string }; radiusKm?: number };
type ProfilePayload = {
  business?: {
    name?: string;
    listingMode?: string;
    onboardingState?: string;
    primaryCategory?: { id?: number };
    countryCode?: string;
    city?: string;
  };
};

export default function ProviderOnboardingPage() {
  const router = useRouter();
  const { updateSession, user } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [geoAreas, setGeoAreas] = useState<GeoArea[]>([]);
  const [savedAreas, setSavedAreas] = useState<SavedArea[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [city, setCity] = useState('Lahore');
  const [countryCode, setCountryCode] = useState('PK');
  const [coverageType, setCoverageType] = useState<'NAMED' | 'RADIUS'>('NAMED');
  const [geoAreaId, setGeoAreaId] = useState('');
  const [areaName, setAreaName] = useState('');
  const [latitude, setLatitude] = useState(31.5204);
  const [longitude, setLongitude] = useState(74.3587);
  const [radiusKm, setRadiusKm] = useState('10');
  const [step, setStep] = useState<'areas' | 'services' | 'finish'>('areas');
  const [serviceCount, setServiceCount] = useState(0);

  const refreshAreas = async () => {
    try {
      setSavedAreas(await apiFetch<SavedArea[]>('/api/provider/service-areas'));
    } catch {
      setSavedAreas([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await apiFetch<ProfilePayload>('/api/provider/profile');
        if (cancelled) return;
        const state = (profile.business?.onboardingState || '').toUpperCase();
        const hasCategory = Boolean(profile.business?.primaryCategory?.id);
        const incomplete = !hasCategory || !state || state === 'STARTED';
        setNeedsProfile(incomplete);
        if (profile.business?.city) setCity(profile.business.city);
        if (profile.business?.countryCode) setCountryCode(profile.business.countryCode);
        updateSession({
          listingMode: profile.business?.listingMode || 'INDIVIDUAL',
          onboardingState: profile.business?.onboardingState,
          providerWorkspace: true,
          role: user?.role === 'CUSTOMER' ? 'BUSINESS_OWNER' : user?.role,
        });
        await refreshAreas();
      } catch {
        if (!cancelled) setNeedsProfile(true);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [updateSession, user?.role]);

  useEffect(() => {
    if (!countryCode || !city) return;
    const params = new URLSearchParams({ country: countryCode, city });
    apiFetch<GeoArea[]>(`/api/public/geo/areas?${params}`, { skipAuth: true })
      .then(setGeoAreas)
      .catch(() => setGeoAreas([]));
  }, [countryCode, city]);

  const addArea = async (event?: FormEvent) => {
    event?.preventDefault();
    if (coverageType === 'NAMED' && !geoAreaId) {
      setError('Select a named area.');
      return;
    }
    if (coverageType === 'RADIUS' && (!areaName.trim() || !radiusKm)) {
      setError('Area label and radius are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/provider/service-areas', {
        method: 'POST',
        body: JSON.stringify(
          coverageType === 'NAMED'
            ? { coverageType, geoAreaId: Number(geoAreaId), status: 'ACTIVE' }
            : {
                coverageType,
                areaName: areaName.trim(),
                latitude,
                longitude,
                radiusKm: Number(radiusKm),
                status: 'ACTIVE',
              }
        ),
      });
      setGeoAreaId('');
      setAreaName('');
      setMessage('Service area added.');
      await refreshAreas();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not save the service area.');
    } finally {
      setSaving(false);
    }
  };

  const markServicesComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/provider/profile', {
        method: 'PUT',
        body: JSON.stringify({ onboardingState: 'SERVICES_COMPLETE' }),
      });
      updateSession({ onboardingState: 'SERVICES_COMPLETE' });
      setStep('finish');
      setMessage('Great — finish hours and verification when you are ready.');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not update onboarding progress.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/provider/publish', { method: 'POST' });
      updateSession({ onboardingState: 'PUBLISHED' });
      setMessage('Your public listing is live.');
      router.push('/provider/dashboard');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Publishing is available after your verification is approved.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className={styles.page}>
        <Skeleton variant="card" height={280} />
      </div>
    );
  }

  if (needsProfile) {
    return (
      <div className={styles.page}>
        <div className={styles.formCard}>
          <h2>Complete your professional profile</h2>
          <p className={styles.muted}>
            Your account was created without full listing details. Use the profile page to finish category and service mode,
            or register again with the expanded signup flow.
          </p>
          <div className={styles.actions} style={{ justifyContent: 'flex-start' }}>
            <Link href="/provider/verification" className="btn btn-outline">Verification</Link>
            <Link href="/provider/services" className="btn btn-primary">Add services</Link>
            <button type="button" className="btn btn-secondary" onClick={() => router.push('/provider/dashboard')}>
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow} style={{ color: 'var(--accent-primary)' }}>Finish setup</span>
          <h1>Almost ready to take jobs</h1>
          <p>Your profile was created at registration. Add coverage, then services and hours.</p>
        </div>
      </div>
      {message && <div className="success-alert"><i className="fa-solid fa-circle-check" /> {message}</div>}
      {error && <div className="error-alert"><i className="fa-solid fa-triangle-exclamation" /> {error}</div>}

      {step === 'areas' && (
        <form className={styles.formCard} onSubmit={(e) => void addArea(e)}>
          <h2>Service areas</h2>
          <p className={styles.muted}>Add where you operate — named neighborhoods or a radius on the map.</p>
          <div className={styles.typeTabs} style={{ marginTop: 16 }}>
            <button type="button" className={`btn ${coverageType === 'NAMED' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCoverageType('NAMED')}>Named area</button>
            <button type="button" className={`btn ${coverageType === 'RADIUS' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCoverageType('RADIUS')}>Radius</button>
          </div>
          {coverageType === 'NAMED' ? (
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Area in {city}</label>
              <CustomSelect
                value={geoAreaId}
                onChange={setGeoAreaId}
                options={geoAreas.map((area) => ({ value: String(area.id), label: area.name }))}
                placeholder={geoAreas.length ? 'Select area' : 'No named areas — use radius'}
                disabled={!geoAreas.length}
              />
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <FormField label="Area label" htmlFor="area" value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="Central Lahore" />
              <FormField label="Radius (km)" htmlFor="radius" type="number" min="0.1" step="0.1" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} />
              <LocationPicker
                address={areaName || city}
                latitude={latitude}
                longitude={longitude}
                onAddressChange={setAreaName}
                onCoordinatesChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                skipInitialGeocode
              />
            </div>
          )}
          {savedAreas.length > 0 && (
            <ul style={{ marginTop: 16, paddingLeft: 18 }}>
              {savedAreas.map((area) => (
                <li key={area.id}>{area.areaName || area.geoArea?.name || 'Area'} ({area.coverageType}{area.radiusKm ? ` · ${area.radiusKm} km` : ''})</li>
              ))}
            </ul>
          )}
          <div className={styles.actions}>
            <button type="submit" className="btn btn-outline" disabled={saving}>{saving ? 'Saving…' : 'Add area'}</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => {
                setMessage(null);
                setStep('services');
              }}
            >
              Continue
            </button>
          </div>
        </form>
      )}

      {step === 'services' && (
        <div className={styles.formCard}>
          <h2>What do you offer?</h2>
          <p className={styles.muted}>
            Add at least one service with a price, e.g. &ldquo;Fan installation — 1,500&rdquo;. You can add more later.
          </p>
          <div style={{ marginTop: 16 }}>
            <SoloServicesEditor onCountChange={setServiceCount} />
          </div>
          <div className={styles.actions}>
            <button type="button" className="btn btn-outline" onClick={() => setStep('areas')}>
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || serviceCount === 0}
              onClick={() => void markServicesComplete()}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'finish' && (
        <div className={styles.formCard}>
          <h2>Hours and publish</h2>
          <p className={styles.muted}>
            Set your working hours and upload verification documents. Publish after an administrator approves your Tier‑1 documents.
          </p>
          <div className={styles.actions} style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            <Link href="/provider/services" className="btn btn-outline"><i className="fa-solid fa-tags" /> Services</Link>
            <Link href="/provider/availability" className="btn btn-outline"><i className="fa-solid fa-clock" /> Availability</Link>
            <Link href="/provider/verification" className="btn btn-outline"><i className="fa-solid fa-file-shield" /> Verification</Link>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void publish()}>
              {saving ? 'Publishing…' : 'Publish profile'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push('/provider/dashboard')}>
              Go to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
