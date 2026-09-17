'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useOwnerPlan } from '@/lib/owner-plan-context';
import { useOrgLocale } from '@/lib/org-locale-context';
import { hasFeature } from '@/lib/plan';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import CustomSelect from '@/components/CustomSelect';
import FormField from '@/components/FormField';
import styles from '@/app/phase1.module.css';

type ServiceArea = {
  id: number;
  coverageType: 'NAMED' | 'RADIUS';
  areaName?: string;
  geoArea?: { id: number; name: string };
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  status?: string;
};

type GeoArea = { id: number; name: string };

export default function ServiceAreasPage() {
  const { plan, loaded: planLoaded } = useOwnerPlan();
  const { locale } = useOrgLocale();
  const unavailable = planLoaded && plan != null && !hasFeature(plan, 'home_service');
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [geoAreas, setGeoAreas] = useState<GeoArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [coverageType, setCoverageType] = useState<'NAMED' | 'RADIUS'>('NAMED');
  const [geoAreaId, setGeoAreaId] = useState('');
  const [areaName, setAreaName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusKm, setRadiusKm] = useState('10');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAreas(await apiFetch<ServiceArea[]>('/api/provider/service-areas'));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load service areas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading is intentionally tied to the page lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!locale.countryCode || !locale.city) {
      return;
    }
    const params = new URLSearchParams({ country: locale.countryCode, city: locale.city });
    apiFetch<GeoArea[]>(`/api/public/geo/areas?${params}`, { skipAuth: true })
      .then(setGeoAreas)
      .catch(() => setGeoAreas([]));
  }, [locale.countryCode, locale.city]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (coverageType === 'NAMED' && !geoAreaId) {
      setError('Select a named area.');
      return;
    }
    if (coverageType === 'RADIUS' && (!areaName.trim() || !latitude || !longitude || !radiusKm)) {
      setError('Name, coordinates, and radius are required.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/provider/service-areas', {
        method: 'POST',
        body: JSON.stringify(
          coverageType === 'NAMED'
            ? { coverageType, geoAreaId: Number(geoAreaId), status: 'ACTIVE' }
            : {
                coverageType,
                areaName: areaName.trim(),
                latitude: Number(latitude),
                longitude: Number(longitude),
                radiusKm: Number(radiusKm),
                status: 'ACTIVE',
              }
        ),
      });
      setGeoAreaId('');
      setAreaName('');
      setLatitude('');
      setLongitude('');
      setRadiusKm('10');
      setMessage('Service area added.');
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not add service area.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this service area?')) return;
    setError(null);
    try {
      await apiFetch(`/api/provider/service-areas/${id}`, { method: 'DELETE' });
      setAreas((current) => current.filter((area) => area.id !== id));
      setMessage('Service area removed.');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not delete service area.');
    }
  };

  if (unavailable) {
    return (
      <div className={styles.page}>
        <div className={styles.locked}>
          <i className="fa-solid fa-lock" />
          <h2>Home service is not included</h2>
          <p className={styles.muted}>Upgrade your plan to publish service coverage areas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Service areas"
        subtitle="Tell customers where you provide mobile or at-home services."
      />
      {message && <div className="success-alert"><i className="fa-solid fa-circle-check" /> {message}</div>}
      {error && <div className="error-alert"><i className="fa-solid fa-triangle-exclamation" /> {error}</div>}

      <form className={styles.formCard} onSubmit={submit}>
        <div className={styles.typeTabs}>
          <button type="button" className={`btn ${coverageType === 'NAMED' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCoverageType('NAMED')}>
            Named area
          </button>
          <button type="button" className={`btn ${coverageType === 'RADIUS' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCoverageType('RADIUS')}>
            Radius
          </button>
        </div>
        {coverageType === 'NAMED' ? (
          <div className="form-group">
            <label className="form-label">Area in {locale.city || 'your city'}</label>
            <CustomSelect
              value={geoAreaId}
              onChange={setGeoAreaId}
              options={geoAreas.map((area) => ({ value: String(area.id), label: area.name }))}
              placeholder={geoAreas.length ? 'Select area' : 'No named areas available'}
              disabled={!geoAreas.length}
            />
            {!geoAreas.length && <p className={styles.muted}>Use radius coverage when the area catalog has no entries.</p>}
          </div>
        ) : (
          <div className={styles.formGrid}>
            <FormField label="Area label" htmlFor="areaName" value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="Central Lahore" />
            <FormField label="Radius (km)" htmlFor="radiusKm" type="number" min="0.1" step="0.1" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} />
            <FormField label="Latitude" htmlFor="latitude" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
            <FormField label="Longitude" htmlFor="longitude" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </div>
        )}
        <div className={styles.actions}>
          <button className="btn btn-primary" type="submit" disabled={saving || (coverageType === 'NAMED' && !geoAreas.length)}>
            {saving ? 'Adding…' : 'Add service area'}
          </button>
        </div>
      </form>

      {loading ? (
        <Skeleton variant="row" count={3} />
      ) : areas.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState title="No service areas yet" description="Add a named neighborhood or a radius around a location." icon="fa-map-location-dot" />
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {areas.map((area) => (
            <article className={styles.card} key={area.id}>
              <div className={styles.cardHead}>
                <div>
                  <h3>{area.areaName || area.geoArea?.name || 'Service area'}</h3>
                  <p>
                    {area.coverageType === 'RADIUS'
                      ? `${area.radiusKm} km radius · ${area.latitude}, ${area.longitude}`
                      : 'Named coverage area'}
                  </p>
                </div>
                <button type="button" className={styles.dangerBtn} onClick={() => void remove(area.id)} aria-label="Delete service area">
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
