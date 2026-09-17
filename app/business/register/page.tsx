'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/api';
import FormField from '@/components/FormField';
import Skeleton from '@/components/Skeleton';
import GeoFields, { type GeoSelection } from '@/components/GeoFields';
import CustomSelect from '@/components/CustomSelect';
import styles from './register-business.module.css';
import phaseStyles from '@/app/phase1.module.css';

const LocationPicker = dynamic(
  () => import('@/components/LocationMap').then((m) => m.LocationPicker),
  { ssr: false, loading: () => <Skeleton variant="card" /> }
);

type Category = { id: number; name: string };

export default function RegisterBusinessPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: '',
    primaryCategoryId: '',
    registrationNumber: '',
    phoneNumber: '',
    branchName: 'Main location',
    address: '',
    latitude: 31.5204,
    longitude: 74.3587,
    countryCode: 'PK',
    region: 'Punjab',
    city: 'Lahore',
    defaultCurrency: 'PKR',
    timezone: 'Asia/Karachi',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<Category[]>('/api/public/categories')
      .then((data) => {
        const flat: Category[] = [];
        const walk = (node: Category & { subcategories?: Category[] }) => {
          flat.push({ id: node.id, name: node.name });
          (node.subcategories || []).forEach(walk);
        };
        data.forEach(walk);
        setCategories(flat);
      })
      .catch(() => setCategories([]));
  }, []);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goNext = () => {
    setErrorMessage(null);
    if (step === 1) {
      if (!formData.name.trim() || !formData.description.trim()) {
        setErrorMessage('Business name and description are required.');
        return;
      }
    }
    if (step === 2) {
      if (!formData.primaryCategoryId) {
        setErrorMessage('Select a primary category.');
        return;
      }
    }
    if (step === 3) {
      if (!formData.address.trim()) {
        setErrorMessage('Add your main location address.');
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await apiFetch<{ message?: string }>('/api/business/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          logoUrl: formData.logoUrl.trim() || null,
          primaryCategoryId: formData.primaryCategoryId ? Number(formData.primaryCategoryId) : null,
          registrationNumber: formData.registrationNumber.trim() || null,
          phoneNumber: formData.phoneNumber.trim() || null,
          branchName: formData.branchName.trim() || 'Main location',
          address: formData.address.trim(),
          latitude: formData.latitude,
          longitude: formData.longitude,
          countryCode: formData.countryCode,
          region: formData.region,
          city: formData.city,
          postalCode: null,
          defaultCurrency: formData.defaultCurrency,
          timezone: formData.timezone,
        }),
      });
      setSuccessMessage(res.message || 'Business application submitted.');
      setTimeout(() => router.push('/business/verification'), 1200);
    } catch (err: unknown) {
      setErrorMessage((err as { message?: string })?.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.businessRegContainer}>
      <div className={`surface ${styles.registrationCard}`}>
        <div className={phaseStyles.choiceGrid} style={{ marginBottom: 28 }}>
          <div className={phaseStyles.choiceActive}>
            <strong><i className="fa-solid fa-store" /> Business / salon</strong>
            <span>Register a venue with branches, staff, and shared operations.</span>
          </div>
          <Link href="/business/onboarding/individual" className={phaseStyles.choice}>
            <strong><i className="fa-solid fa-user" /> I&apos;m an individual professional</strong>
            <span>Create a personal provider listing for your own services.</span>
          </Link>
        </div>
        <div className={styles.registrationHeader}>
          <div className={styles.regIcon}>
            <i className="fa-solid fa-briefcase" />
          </div>
          <h2>Register your business</h2>
          <p className={styles.regSubtitle}>
            Step {step} of 4 — profile, category, location, then submit for review.
          </p>
          <div className={styles.steps}>
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={n <= step ? styles.stepActive : styles.step} />
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="error-alert">
            <i className="fa-solid fa-triangle-exclamation" /> {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="success-alert">
            <i className="fa-solid fa-circle-check" /> {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.registrationForm} noValidate>
          {step === 1 && (
            <>
              <FormField
                label="Business name"
                htmlFor="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
              <FormField
                as="textarea"
                label="Business description"
                htmlFor="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={5}
              />
              <FormField
                label="Logo image URL (optional)"
                htmlFor="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => handleInputChange('logoUrl', e.target.value)}
              />
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="category">
              Primary category
            </label>
                <CustomSelect
                  id="category"
                  options={[
                    { value: '', label: 'Select category' },
                    ...categories.map((c) => ({
                      value: String(c.id),
                      label: c.name,
                    })),
                  ]}
                  value={String(formData.primaryCategoryId || '')}
                  onChange={(value) => handleInputChange('primaryCategoryId', value)}
                  placeholder="Select category"
                />
              </div>
              <FormField
                label="Registration / license number (optional)"
                htmlFor="registrationNumber"
                value={formData.registrationNumber}
                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
              />
              <FormField
                label="Business phone"
                htmlFor="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              />
            </>
          )}

          {step === 3 && (
            <>
              <FormField
                label="Main branch name"
                htmlFor="branchName"
                value={formData.branchName}
                onChange={(e) => handleInputChange('branchName', e.target.value)}
              />
              <GeoFields
                value={{
                  countryCode: formData.countryCode,
                  region: formData.region,
                  city: formData.city,
                  currency: formData.defaultCurrency,
                  timezone: formData.timezone,
                }}
                onChange={(geo: GeoSelection) =>
                  setFormData((prev) => ({
                    ...prev,
                    countryCode: geo.countryCode,
                    region: geo.region,
                    city: geo.city,
                    defaultCurrency: geo.currency || prev.defaultCurrency,
                    timezone: geo.timezone || prev.timezone,
                  }))
                }
                geocodeOnCity
                onGeocoded={({ lat, lon, displayName }) =>
                  setFormData((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lon,
                    address: prev.address || displayName,
                  }))
                }
              />
              <LocationPicker
                address={formData.address}
                latitude={formData.latitude}
                longitude={formData.longitude}
                onAddressChange={(address) => handleInputChange('address', address)}
                onCoordinatesChange={(latitude, longitude) => {
                  handleInputChange('latitude', latitude);
                  handleInputChange('longitude', longitude);
                }}
              />
            </>
          )}

          {step === 4 && (
            <div className={styles.review}>
              <h3>Review and submit</h3>
              <p>
                <strong>{formData.name}</strong>
              </p>
              <p>{formData.description}</p>
              <p>Category ID: {formData.primaryCategoryId || '—'}</p>
              <p>Location: {formData.address}</p>
              <p>
                {formData.city ? `${formData.city}, ` : ''}
                {formData.region ? `${formData.region}, ` : ''}
                {formData.countryCode} · {formData.defaultCurrency}
              </p>
              <p className={styles.hint}>
                After submit, upload Tier 1 documents (Owner ID, trade license, address proof) so Super Admin can approve
                your listing. Tax ID and bank statement unlock a Verified badge later.
              </p>
            </div>
          )}

          <div className={styles.actions}>
            {step > 1 && (
              <button type="button" className="btn btn-outline" onClick={() => setStep((s) => s - 1)} disabled={loading}>
                Back
              </button>
            )}
            {step < 4 ? (
              <button type="button" className="btn btn-primary" onClick={goNext}>
                Continue
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
