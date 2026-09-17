'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormField from '@/components/FormField';
import styles from '../categories/categories.module.css';

type GeoArea = {
  id: number;
  countryCode?: string;
  region?: string;
  city?: string;
  name: string;
  slug?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
};

export default function AdminGeoAreasPage() {
  const [areas, setAreas] = useState<GeoArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GeoArea | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    countryCode: 'PK',
    region: '',
    city: '',
    slug: '',
    latitude: '',
    longitude: '',
    status: 'ACTIVE',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setAreas(await apiFetch<GeoArea[]>('/api/admin/geo-areas'));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load geo areas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      countryCode: 'PK',
      region: '',
      city: '',
      slug: '',
      latitude: '',
      longitude: '',
      status: 'ACTIVE',
    });
    setShowModal(true);
  };

  const openEdit = (area: GeoArea) => {
    setEditing(area);
    setForm({
      name: area.name,
      countryCode: area.countryCode || 'PK',
      region: area.region || '',
      city: area.city || '',
      slug: area.slug || '',
      latitude: area.latitude != null ? String(area.latitude) : '',
      longitude: area.longitude != null ? String(area.longitude) : '',
      status: area.status || 'ACTIVE',
    });
    setShowModal(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const body = {
      name: form.name.trim(),
      countryCode: form.countryCode.trim(),
      region: form.region.trim() || null,
      city: form.city.trim() || null,
      slug: form.slug.trim() || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      status: form.status,
    };
    try {
      if (editing) {
        await apiFetch(`/api/admin/geo-areas/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
        setMessage('Geo area updated.');
      } else {
        await apiFetch('/api/admin/geo-areas', { method: 'POST', body: JSON.stringify(body) });
        setMessage('Geo area created.');
      }
      setShowModal(false);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not save geo area.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (deleteId == null) return;
    try {
      await apiFetch(`/api/admin/geo-areas/${deleteId}`, { method: 'DELETE' });
      setMessage('Geo area removed.');
      setDeleteId(null);
      await load();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not delete geo area.');
    }
  };

  return (
    <div className={styles.categoriesContainer}>
      <PageHeader
        title="Geo areas"
        subtitle="Named coverage areas used for home-service matching."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add area
          </button>
        }
      />
      {message && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" /> {message}
        </div>
      )}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}
      {loading ? (
        <Skeleton variant="row" count={5} />
      ) : areas.length === 0 ? (
        <EmptyState icon="fa-map" title="No geo areas" description="Create named areas such as DHA or Gulberg." actionLabel="Add area" onAction={openCreate} />
      ) : (
        <div className={styles.treeWrapper}>
          {areas.map((area) => (
            <div className={`surface ${styles.nodeCard}`} key={area.id}>
              <div className={styles.nodeInfo}>
                <div>
                  <strong>{area.name}</strong>
                  <p>
                    {[area.city, area.region, area.countryCode].filter(Boolean).join(', ')} · {area.status}
                  </p>
                </div>
              </div>
              <div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(area)}>
                  Edit
                </button>{' '}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setDeleteId(area.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} title={editing ? 'Edit geo area' : 'Create geo area'} onClose={() => setShowModal(false)}>
        <form id="geo-form" onSubmit={(event) => void submit(event)}>
          <FormField label="Name" htmlFor="geoName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <FormField label="Country" htmlFor="geoCountry" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} />
          <FormField label="Region" htmlFor="geoRegion" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          <FormField label="City" htmlFor="geoCity" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <FormField label="Slug" htmlFor="geoSlug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <FormField label="Latitude" htmlFor="geoLat" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
          <FormField label="Longitude" htmlFor="geoLng" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
          <FormField label="Status" htmlFor="geoStatus" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Delete geo area?"
        message="This hides the area from matching. Existing coverage rows keep their IDs."
        confirmLabel="Delete"
        danger
        onConfirm={() => void remove()}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
