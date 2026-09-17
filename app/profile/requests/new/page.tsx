'use client';

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { Category } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import FormField from '@/components/FormField';
import CustomSelect from '@/components/CustomSelect';
import GeoFields, { type GeoSelection } from '@/components/GeoFields';
import Skeleton from '@/components/Skeleton';
import styles from '@/app/phase1.module.css';

type Address = {
  id: number;
  label?: string;
  addressLine: string;
  countryCode?: string;
  region?: string;
  city?: string;
  areaName?: string;
};

type RequestDetailResponse = {
  request: { id: number };
};

const URGENCY_OPTIONS = [
  { value: 'NORMAL', label: 'Normal', sublabel: 'Flexible timing' },
  { value: 'SOON', label: 'Soon', sublabel: 'Within a few days' },
  { value: 'URGENT', label: 'Urgent', sublabel: 'As soon as possible' },
];

const emptyGeo: GeoSelection = {
  countryCode: '',
  region: '',
  city: '',
  currency: '',
  timezone: '',
};

function flattenCategories(categories: Category[]): Category[] {
  const rows: Category[] = [];
  for (const category of categories) {
    rows.push(category);
    if (category.subcategories?.length) {
      rows.push(...flattenCategories(category.subcategories));
    }
  }
  return rows;
}

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const presetTitle = searchParams.get('title') || '';
  const presetServiceId = searchParams.get('serviceId') || '';
  const presetCategoryId = searchParams.get('categoryId') || '';
  const presetProviderSlug = searchParams.get('providerSlug') || '';

  const [categories, setCategories] = useState<Category[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(presetTitle);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(presetCategoryId);
  const [addressId, setAddressId] = useState('');
  const [geo, setGeo] = useState<GeoSelection>(emptyGeo);
  const [areaName, setAreaName] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeFrom, setPreferredTimeFrom] = useState('');
  const [preferredTimeTo, setPreferredTimeTo] = useState('');
  const [urgency, setUrgency] = useState('NORMAL');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [mediaUrlsText, setMediaUrlsText] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const categoryOptions = useMemo(
    () =>
      flattenCategories(categories).map((category) => ({
        value: String(category.id),
        label: category.name,
        sublabel: category.slug,
      })),
    [categories]
  );

  const addressOptions = useMemo(
    () =>
      addresses.map((address) => ({
        value: String(address.id),
        label: address.label || 'Saved address',
        sublabel: [address.addressLine, address.city].filter(Boolean).join(', '),
      })),
    [addresses]
  );

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [categoryRows, addressRows] = await Promise.all([
        apiFetch<Category[]>('/api/public/categories', { skipAuth: true }),
        apiFetch<Address[]>('/api/profile/addresses').catch(() => [] as Address[]),
      ]);
      setCategories(categoryRows);
      setAddresses(addressRows);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load form options.');
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!addressId) return;
    const address = addresses.find((row) => String(row.id) === addressId);
    if (!address) return;
    setGeo({
      countryCode: address.countryCode || '',
      region: address.region || '',
      city: address.city || '',
      currency: '',
      timezone: '',
    });
    setAreaName(address.areaName || '');
  }, [addressId, addresses]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!categoryId) {
      setError('Please choose a category.');
      return;
    }
    if (!addressId && (!geo.countryCode || !geo.city)) {
      setError('Choose a saved address or enter country and city.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const extraUrls = mediaUrlsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const allMedia = [...mediaUrls, ...extraUrls];

      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        categoryId: Number(categoryId),
        serviceId: presetServiceId ? Number(presetServiceId) : null,
        customerAddressId: addressId ? Number(addressId) : null,
        countryCode: geo.countryCode || null,
        region: geo.region || null,
        city: geo.city || null,
        areaName: areaName.trim() || null,
        preferredDate: preferredDate || null,
        preferredTimeFrom: preferredTimeFrom || null,
        preferredTimeTo: preferredTimeTo || null,
        urgency,
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        currency: currency.trim() || 'PKR',
        mediaUrls: allMedia.length ? allMedia : null,
      };

      const created = await apiFetch<RequestDetailResponse>('/api/requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push(`/profile/requests/${created.request.id}`);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not submit your request.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className={styles.page}>
        <Skeleton variant="card" height={420} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="New service request"
        subtitle="Describe what you need and providers in your area can send quotes."
        actions={
          <Link href="/profile/requests" className="btn btn-outline">
            Back to requests
          </Link>
        }
      />

      {presetProviderSlug && (
        <div className="success-alert">
          <i className="fa-solid fa-store" /> Requesting a quote from provider <strong>{presetProviderSlug}</strong>
        </div>
      )}

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      <form className={styles.formCard} onSubmit={submit}>
        <div className={styles.formGrid}>
          <div className={styles.full}>
            <FormField
              label="Title"
              htmlFor="requestTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deep clean for 3-bedroom apartment"
            />
          </div>
          <div className={`form-group ${styles.full}`}>
            <label className="form-label" htmlFor="requestCategory">
              Category
            </label>
            <CustomSelect
              id="requestCategory"
              options={categoryOptions}
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Select a category"
              searchable
            />
          </div>
          <div className={styles.full}>
            <FormField
              as="textarea"
              label="Description"
              htmlFor="requestDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share details providers should know before quoting."
              rows={5}
            />
          </div>

          <div className={`form-group ${styles.full}`}>
            <label className="form-label" htmlFor="savedAddress">
              Saved address (optional)
            </label>
            <CustomSelect
              id="savedAddress"
              options={[{ value: '', label: 'Enter location manually' }, ...addressOptions]}
              value={addressId}
              onChange={setAddressId}
              placeholder="Choose a saved address"
              searchable={addressOptions.length > 0}
            />
          </div>

          {!addressId && (
            <div className={styles.full}>
              <GeoFields value={geo} onChange={setGeo} showCurrency={false} showTimezone={false} />
            </div>
          )}

          <FormField
            label="Area / neighborhood"
            htmlFor="requestArea"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            disabled={Boolean(addressId)}
          />
          <FormField
            label="Preferred date"
            htmlFor="preferredDate"
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
          />
          <FormField
            label="Preferred time from"
            htmlFor="preferredTimeFrom"
            type="time"
            value={preferredTimeFrom}
            onChange={(e) => setPreferredTimeFrom(e.target.value)}
          />
          <FormField
            label="Preferred time to"
            htmlFor="preferredTimeTo"
            type="time"
            value={preferredTimeTo}
            onChange={(e) => setPreferredTimeTo(e.target.value)}
          />

          <div className={`form-group ${styles.full}`}>
            <label className="form-label" htmlFor="requestUrgency">
              Urgency
            </label>
            <CustomSelect
              id="requestUrgency"
              options={URGENCY_OPTIONS}
              value={urgency}
              onChange={setUrgency}
              searchable={false}
            />
          </div>

          <FormField
            label="Budget min"
            htmlFor="budgetMin"
            type="number"
            min="0"
            step="0.01"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
          />
          <FormField
            label="Budget max"
            htmlFor="budgetMax"
            type="number"
            min="0"
            step="0.01"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
          />
          <FormField
            label="Currency"
            htmlFor="requestCurrency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            placeholder="PKR"
          />
          <div className={styles.full}>
            <label className="form-label" htmlFor="requestPhotos">
              Photos (optional)
            </label>
            <input
              id="requestPhotos"
              type="file"
              accept="image/*"
              multiple
              className="form-input"
              disabled={uploading}
              onChange={async (event) => {
                const files = Array.from(event.target.files || []);
                if (!files.length) return;
                setUploading(true);
                setError(null);
                try {
                  const uploaded: string[] = [];
                  for (const file of files) {
                    const body = new FormData();
                    body.append('file', file);
                    const result = await apiFetch<{ url: string }>('/api/profile/media/upload', {
                      method: 'POST',
                      body,
                    });
                    if (result.url) uploaded.push(result.url);
                  }
                  setMediaUrls((current) => [...current, ...uploaded]);
                } catch (err: unknown) {
                  setError((err as { message?: string })?.message || 'Could not upload photos.');
                } finally {
                  setUploading(false);
                  event.target.value = '';
                }
              }}
            />
            {uploading && <p className={styles.muted}>Uploading…</p>}
            {mediaUrls.length > 0 && (
              <p className={styles.muted}>{mediaUrls.length} photo{mediaUrls.length === 1 ? '' : 's'} attached.</p>
            )}
            <FormField
              as="textarea"
              label="Or paste image URLs"
              htmlFor="mediaUrls"
              value={mediaUrlsText}
              onChange={(e) => setMediaUrlsText(e.target.value)}
              placeholder="One URL per line"
              rows={3}
              hint="Upload photos or paste public image links."
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Link href="/profile/requests" className="btn btn-outline">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <Skeleton variant="card" height={420} />
        </div>
      }
    >
      <NewRequestForm />
    </Suspense>
  );
}
