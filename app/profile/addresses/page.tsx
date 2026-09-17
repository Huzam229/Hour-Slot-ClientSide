'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import FormField from '@/components/FormField';
import GeoFields, { type GeoSelection } from '@/components/GeoFields';
import styles from '@/app/phase1.module.css';

type Address = {
  id: number;
  label?: string;
  addressLine: string;
  countryCode?: string;
  region?: string;
  city?: string;
  areaName?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  default?: boolean;
  isDefault?: boolean;
};

const emptyGeo: GeoSelection = {
  countryCode: '',
  region: '',
  city: '',
  currency: '',
  timezone: '',
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [areaName, setAreaName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [geo, setGeo] = useState<GeoSelection>(emptyGeo);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAddresses(await apiFetch<Address[]>('/api/profile/addresses'));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load your addresses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading is intentionally tied to the page lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const reset = () => {
    setEditing(null);
    setLabel('');
    setAddressLine('');
    setAreaName('');
    setPostalCode('');
    setLatitude('');
    setLongitude('');
    setIsDefault(false);
    setGeo(emptyGeo);
  };

  const startAdd = () => {
    reset();
    setShowForm(true);
  };

  const startEdit = (address: Address) => {
    setEditing(address);
    setLabel(address.label || '');
    setAddressLine(address.addressLine || '');
    setAreaName(address.areaName || '');
    setPostalCode(address.postalCode || '');
    setLatitude(address.latitude == null ? '' : String(address.latitude));
    setLongitude(address.longitude == null ? '' : String(address.longitude));
    setIsDefault(Boolean(address.default ?? address.isDefault));
    setGeo({
      countryCode: address.countryCode || '',
      region: address.region || '',
      city: address.city || '',
      currency: '',
      timezone: '',
    });
    setShowForm(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!label.trim() || !addressLine.trim() || !geo.countryCode || !geo.city) {
      setError('Label, street address, country, and city are required.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(editing ? `/api/profile/addresses/${editing.id}` : '/api/profile/addresses', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({
          label: label.trim(),
          addressLine: addressLine.trim(),
          countryCode: geo.countryCode,
          region: geo.region,
          city: geo.city,
          areaName: areaName.trim() || null,
          postalCode: postalCode.trim() || null,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          default: isDefault,
        }),
      });
      setMessage(editing ? 'Address updated.' : 'Address saved.');
      setShowForm(false);
      reset();
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not save address.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this saved address?')) return;
    setError(null);
    try {
      await apiFetch(`/api/profile/addresses/${id}`, { method: 'DELETE' });
      setAddresses((current) => current.filter((address) => address.id !== id));
      setMessage('Address deleted.');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not delete address.');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Saved addresses"
        subtitle="Keep your home and work addresses ready for mobile-service bookings."
        actions={!showForm ? <button type="button" className="btn btn-primary" onClick={startAdd}><i className="fa-solid fa-plus" /> Add address</button> : undefined}
      />
      {message && <div className="success-alert"><i className="fa-solid fa-circle-check" /> {message}</div>}
      {error && <div className="error-alert"><i className="fa-solid fa-triangle-exclamation" /> {error}</div>}

      {showForm && (
        <form className={styles.formCard} onSubmit={submit}>
          <div className={styles.sectionHead}>
            <div>
              <h2>{editing ? 'Edit address' : 'Add an address'}</h2>
              <p>Use a clear label so you can recognize it during checkout.</p>
            </div>
          </div>
          <div className={styles.formGrid}>
            <FormField label="Label" htmlFor="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home" />
            <FormField label="Street address" htmlFor="addressLine" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="House, street, building" />
            <div className={styles.full}>
              <GeoFields value={geo} onChange={setGeo} showCurrency={false} showTimezone={false} />
            </div>
            <FormField label="Area / neighborhood" htmlFor="areaName" value={areaName} onChange={(e) => setAreaName(e.target.value)} />
            <FormField label="Postal code" htmlFor="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            <FormField label="Latitude (optional)" htmlFor="addressLatitude" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
            <FormField label="Longitude (optional)" htmlFor="addressLongitude" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </div>
          <label className="form-label" style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 16 }}>
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Use as my default address
          </label>
          <div className={styles.actions}>
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); reset(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save address'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <Skeleton variant="row" count={3} />
      ) : addresses.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState title="No saved addresses" description="Add an address for faster home-service booking." icon="fa-house" actionLabel="Add address" onAction={startAdd} />
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {addresses.map((address) => (
            <article className={styles.card} key={address.id}>
              <div className={styles.cardHead}>
                <div>
                  <h3>{address.label || 'Address'}</h3>
                  {(address.default ?? address.isDefault) && <span className={styles.defaultBadge}>Default</span>}
                </div>
                <div className={styles.rowActions}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(address)}>Edit</button>
                  <button type="button" className={styles.dangerBtn} onClick={() => void remove(address.id)} aria-label="Delete address"><i className="fa-solid fa-trash" /></button>
                </div>
              </div>
              <p>{address.addressLine}</p>
              <p>{[address.areaName, address.city, address.region, address.countryCode].filter(Boolean).join(', ')}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
