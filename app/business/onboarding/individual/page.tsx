'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import FormField from '@/components/FormField';
import GeoFields, { type GeoSelection } from '@/components/GeoFields';
import CustomSelect from '@/components/CustomSelect';
import styles from '@/app/phase1.module.css';

type Category = { id: number; name: string; subcategories?: Category[] };

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function IndividualOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [provisioned, setProvisioned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [primaryCategoryId, setPrimaryCategoryId] = useState('');
  const [serviceMode, setServiceMode] = useState('AT_PROVIDER');
  const [geo, setGeo] = useState<GeoSelection>({
    countryCode: 'PK',
    region: 'Punjab',
    city: 'Lahore',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
  });
  const [areaName, setAreaName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusKm, setRadiusKm] = useState('10');

  useEffect(() => {
    apiFetch<Category[]>('/api/public/categories', { skipAuth: true })
      .then((tree) => {
        const flat: Category[] = [];
        const visit = (category: Category) => {
          flat.push(category);
          category.subcategories?.forEach(visit);
        };
        tree.forEach(visit);
        setCategories(flat);
      })
      .catch(() => setCategories([]));
  }, []);

  const nextFromIdentity = () => {
    if (!displayName.trim() || !geo.countryCode || !geo.region || !geo.city || !geo.currency || !geo.timezone) {
      setError('Display name and complete location details are required.');
      return;
    }
    if (!slug) setSlug(slugify(displayName));
    setError(null);
    setStep(2);
  };

  const createProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!primaryCategoryId || !serviceMode || !slugify(slug)) {
      setError('Choose a category, service mode, and valid public slug.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (!provisioned) {
        await apiFetch('/api/provider/individual', {
          method: 'POST',
          body: JSON.stringify({
            displayName: displayName.trim(),
            countryCode: geo.countryCode,
            region: geo.region,
            city: geo.city,
            timezone: geo.timezone,
            currency: geo.currency,
          }),
        });
        setProvisioned(true);
      }
      await apiFetch('/api/provider/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: displayName.trim(),
          slug: slugify(slug),
          bio: bio.trim(),
          serviceMode,
          yearsExperience: yearsExperience ? Number(yearsExperience) : null,
          phone: phone.trim() || null,
          primaryCategoryId: Number(primaryCategoryId),
        }),
      });
      setMessage('Your individual provider profile is ready.');
      setStep(3);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not create your provider profile.');
    } finally {
      setSaving(false);
    }
  };

  const saveOptionalArea = async () => {
    if (!areaName.trim() && !latitude && !longitude) {
      setStep(4);
      return;
    }
    if (!areaName.trim() || !latitude || !longitude || !radiusKm) {
      setError('Complete all radius fields, or leave all of them empty to skip.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/provider/service-areas', {
        method: 'POST',
        body: JSON.stringify({
          coverageType: 'RADIUS',
          areaName: areaName.trim(),
          latitude: Number(latitude),
          longitude: Number(longitude),
          radiusKm: Number(radiusKm),
          status: 'ACTIVE',
        }),
      });
      setMessage('Service area saved.');
      setStep(4);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not save the service area.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/provider/publish', { method: 'POST' });
      setMessage('Your public listing is live.');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Publishing is available after your verification is approved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow} style={{ color: 'var(--accent-primary)' }}>Individual professional</span>
          <h1>Build your provider profile</h1>
          <p>Step {step} of 4 — you can refine everything later.</p>
        </div>
      </div>
      <div className={styles.steps}>
        {[1, 2, 3, 4].map((number) => <span key={number} className={number <= step ? styles.stepOn : styles.step} />)}
      </div>
      {message && <div className="success-alert"><i className="fa-solid fa-circle-check" /> {message}</div>}
      {error && <div className="error-alert"><i className="fa-solid fa-triangle-exclamation" /> {error}</div>}

      {step === 1 && (
        <div className={styles.formCard}>
          <h2>Your professional identity</h2>
          <div className={styles.formGrid} style={{ marginTop: 18 }}>
            <div className={styles.full}>
              <FormField label="Display name" htmlFor="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ayesha Khan" />
            </div>
            <div className={styles.full}>
              <GeoFields value={geo} onChange={setGeo} />
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className="btn btn-primary" onClick={nextFromIdentity}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form className={styles.formCard} onSubmit={createProfile}>
          <h2>Services and public profile</h2>
          <div className={styles.formGrid} style={{ marginTop: 18 }}>
            <div className="form-group">
              <label className="form-label">Primary category</label>
              <CustomSelect
                value={primaryCategoryId}
                onChange={setPrimaryCategoryId}
                options={categories.map((category) => ({ value: String(category.id), label: category.name }))}
                placeholder="Select category"
              />
            </div>
            <div className="form-group">
              <label className="form-label">How you work</label>
              <CustomSelect
                value={serviceMode}
                onChange={setServiceMode}
                options={[
                  { value: 'AT_PROVIDER', label: 'Clients visit me' },
                  { value: 'CUSTOMER_LOCATION', label: 'I visit clients' },
                  { value: 'HYBRID', label: 'Both options' },
                ]}
              />
            </div>
            <FormField label="Public profile slug" htmlFor="slug" value={slug} onChange={(e) => setSlug(e.target.value)} hint={`Your link: /b/${slugify(slug || displayName)}`} />
            <FormField label="Phone (optional)" htmlFor="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <FormField label="Years of experience" htmlFor="yearsExperience" type="number" min="0" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
            <div className={styles.full}>
              <FormField as="textarea" label="Bio" htmlFor="bio" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell customers about your experience and approach." />
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create profile'}</button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className={styles.formCard}>
          <h2>Add a service area <span className={styles.muted}>(optional)</span></h2>
          <p className={styles.muted}>Add a radius now if you travel to clients. Named areas can be managed later.</p>
          <div className={styles.formGrid} style={{ marginTop: 18 }}>
            <FormField label="Area label" htmlFor="onboardingArea" value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="Central Lahore" />
            <FormField label="Radius (km)" htmlFor="onboardingRadius" type="number" min="0.1" step="0.1" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} />
            <FormField label="Latitude" htmlFor="onboardingLat" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
            <FormField label="Longitude" htmlFor="onboardingLng" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </div>
          <div className={styles.actions}>
            <button type="button" className="btn btn-outline" onClick={() => setStep(4)}>Skip</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveOptionalArea()}>{saving ? 'Saving…' : 'Save and continue'}</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className={styles.formCard}>
          <h2>Verification and publishing</h2>
          <p className={styles.muted}>Upload your verification documents, then publish after an administrator approves your profile.</p>
          <div className={styles.actions} style={{ justifyContent: 'flex-start' }}>
            <Link href="/business/verification" className="btn btn-outline"><i className="fa-solid fa-file-shield" /> Go to verification</Link>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void publish()}>{saving ? 'Publishing…' : 'Publish profile'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push('/business/dashboard')}>Finish later</button>
          </div>
        </div>
      )}
    </div>
  );
}
