'use client';

import { useState, useEffect, FormEvent, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import CustomSelect from '@/components/CustomSelect';
import { useOrgLocale } from '@/lib/org-locale-context';
import { fetchCurrencies, type CurrencyView } from '@/lib/geo';
import { formatMoney } from '@/lib/money';
import styles from './services.module.css';

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  durationMinutes: number;
  bufferMinutes: number;
  maxConcurrent: number;
  active: boolean;
  capacity: number;
  groupService: boolean;
  pricingType?: string;
  requiresQuote?: boolean;
}

export default function ServicesPage() {
  const { format, currency } = useOrgLocale();
  const [services, setServices] = useState<Service[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    currency: '',
    durationMinutes: 30,
    bufferMinutes: 0,
    maxConcurrent: 1,
    active: true,
    capacity: 1,
    groupService: false,
    pricingType: 'FIXED',
    requiresQuote: false,
  });

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Service[]>('/api/business/services');
      setServices(data);
    } catch (err: any) {
      setError(err?.message || 'Could not load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
    fetchCurrencies(false)
      .then(setCurrencies)
      .catch(() => setCurrencies([]));
  }, []);

  const currencyOptions = useMemo(() => {
    const options = currencies.map((c) => ({
      value: c.code,
      label: `${c.code}${c.symbol ? ` (${c.symbol})` : ''} — ${c.name || c.code}`,
    }));
    const selected = formData.currency || currency;
    if (selected && !options.some((o) => o.value === selected)) {
      options.unshift({ value: selected, label: selected });
    }
    return options;
  }, [currencies, formData.currency, currency]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      currency: service.currency || currency,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes || 0,
      maxConcurrent: service.maxConcurrent || 1,
      active: service.active !== undefined ? service.active : true,
      capacity: service.capacity || 1,
      groupService: service.groupService || false,
      pricingType: service.pricingType || (service.requiresQuote ? 'QUOTE' : 'FIXED'),
      requiresQuote: !!service.requiresQuote || service.pricingType === 'QUOTE',
    });
    setShowForm(true);
  };

  const handleAddClick = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      currency,
      durationMinutes: 30,
      bufferMinutes: 0,
      maxConcurrent: 1,
      active: true,
      capacity: 1,
      groupService: false,
      pricingType: 'FIXED',
      requiresQuote: false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Service name is required.');
      return;
    }
    if (formData.price < 0 || formData.durationMinutes < 1) {
      setError('Invalid price or duration values.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const payload = {
      ...formData,
      currency: (formData.currency || currency).toUpperCase(),
      capacity: formData.groupService ? formData.capacity : 1,
      maxConcurrent: formData.groupService ? formData.maxConcurrent : 1,
      requiresQuote: formData.requiresQuote || formData.pricingType === 'QUOTE',
    };

    try {
      if (editingService) {
        await apiFetch(`/api/business/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMessage('Service updated successfully!');
      } else {
        await apiFetch('/api/business/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage('Service added successfully!');
      }
      setShowForm(false);
      await loadServices();
    } catch (err: any) {
      setError(err?.message || 'Failed to save service.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/services/${deleteId}`, { method: 'DELETE' });
      setMessage('Service removed successfully.');
      setDeleteId(null);
      await loadServices();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove service.');
    } finally {
      setDeleting(false);
    }
  };

  // Calculate statistics
  const totalOfferings = services.length;
  const avgPrice =
    services.length > 0
      ? (services.reduce((acc, curr) => acc + curr.price, 0) / services.length).toFixed(2)
      : '0.00';
  const activeCount = services.filter((s) => s.active).length;
  const groupCount = services.filter((s) => s.groupService).length;

  // Filter list of services
  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Services"
        subtitle="Manage your catalog prices, durations, and bookable offerings."
        actions={
          <button type="button" className="btn btn-primary" onClick={handleAddClick}>
            <i className="fa-solid fa-plus" /> Add Service
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

      {services.length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-tags" />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{totalOfferings}</div>
              <div className={styles.statLabel}>Catalog Offerings</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-dollar-sign" />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{format(Number(avgPrice))}</div>
              <div className={styles.statLabel}>Average Price</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-circle-check" style={{ color: '#059669' }} />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{activeCount}</div>
              <div className={styles.statLabel}>Active Offerings</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fa-solid fa-users-rectangle" />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{groupCount}</div>
              <div className={styles.statLabel}>Group Services</div>
            </div>
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div className={styles.searchBarContainer}>
          <div className={styles.searchContainer}>
            <i className={`fa-solid fa-magnifying-glass ${styles.searchIcon}`} />
            <input
              type="text"
              className={`input-field ${styles.searchInput}`}
              placeholder="Search service name or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : services.length === 0 ? (
        <EmptyState
          icon="fa-tags"
          title="Empty service catalog"
          description="Add services to list them on booking marketplace screens."
          actionLabel="Add your first service"
          onAction={handleAddClick}
        />
      ) : (
        <div className={styles.serviceGrid}>
          {filteredServices.map((s) => (
            <div key={s.id} className={styles.serviceCard}>
              <div className={styles.cardHeader}>
                <h4 className={styles.serviceName}>{s.name}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                  <span className={s.active ? styles.badgeActive : styles.badgeSuspended}>
                    {s.active ? 'ACTIVE' : 'SUSPENDED'}
                  </span>
                  <span className={s.groupService ? styles.badgeGroup : styles.badgeIndividual}>
                    {s.groupService ? 'GROUP' : 'INDIVIDUAL'}
                  </span>
                  {(s.requiresQuote || s.pricingType === 'QUOTE') && (
                    <span className={styles.badgeSuspended}>QUOTE</span>
                  )}
                </div>
              </div>

              <p className={styles.descText}>{s.description || 'No description provided.'}</p>

              <div className={styles.cardDetails}>
                <div className={styles.detailItem}>
                  <i className="fa-regular fa-clock" />
                  <span>Duration: {s.durationMinutes} min</span>
                </div>
                {s.bufferMinutes > 0 && (
                  <div className={styles.detailItem}>
                    <i className="fa-solid fa-hourglass-half" />
                    <span>Buffer Time: {s.bufferMinutes} min</span>
                  </div>
                )}
                {s.groupService && (
                  <div className={styles.detailItem}>
                    <i className="fa-solid fa-users" />
                    <span>Max Capacity: {s.capacity} clients</span>
                  </div>
                )}
              </div>

              <div className={styles.cardBottom}>
                <span className={styles.priceBadge}>
                  {s.requiresQuote || s.pricingType === 'QUOTE'
                    ? 'Quote required'
                    : formatMoney(s.price, s.currency || currency)}
                </span>
                <div className={styles.actions}>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => handleEditClick(s)}>
                    <i className="fa-regular fa-pen-to-square" style={{ marginRight: 4 }} /> Edit
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(s.id)}>
                    <i className="fa-regular fa-trash-can" style={{ marginRight: 4 }} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredServices.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '2rem', marginBottom: 12 }} />
              <p>No catalog offerings match your search query.</p>
            </div>
          )}
        </div>
      )}

      <Modal
        open={showForm}
        title={editingService ? 'Edit service' : 'Create service'}
        onClose={() => setShowForm(false)}
        wide
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" form="service-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingService ? 'Update details' : 'Add service'}
            </button>
          </>
        }
      >
        <form id="service-form" onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="serviceName">
              Service name:
            </label>
            <input
              id="serviceName"
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g. Teeth Whitening"
            />
          </div>

          <div className={styles.twoCol}>
            <div className="form-group">
              <label className="form-label" htmlFor="servicePrice">
                Price:
              </label>
              <input
                id="servicePrice"
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                disabled={formData.pricingType === 'QUOTE'}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="serviceCurrency">
                Currency:
              </label>
              <CustomSelect
                id="serviceCurrency"
                options={currencyOptions}
                value={formData.currency || currency}
                onChange={(value) => handleInputChange('currency', value)}
                placeholder="Select currency"
              />
            </div>
          </div>

          <div className={styles.twoCol}>
            <div className="form-group">
              <label className="form-label" htmlFor="pricingType">
                Pricing type:
              </label>
              <CustomSelect
                id="pricingType"
                options={[
                  { value: 'FIXED', label: 'Fixed price (bookable)' },
                  { value: 'QUOTE', label: 'Quote required (not bookable yet)' },
                ]}
                value={formData.pricingType}
                onChange={(value) => {
                  handleInputChange('pricingType', value);
                  handleInputChange('requiresQuote', value === 'QUOTE');
                }}
                placeholder="Select pricing"
              />
            </div>
            <div className="form-group">
              <label className={styles.checkboxRow} style={{ marginTop: 28 }}>
                <input
                  type="checkbox"
                  checked={formData.requiresQuote || formData.pricingType === 'QUOTE'}
                  onChange={(e) => {
                    handleInputChange('requiresQuote', e.target.checked);
                    if (e.target.checked) handleInputChange('pricingType', 'QUOTE');
                    else if (formData.pricingType === 'QUOTE') handleInputChange('pricingType', 'FIXED');
                  }}
                />
                <span className={styles.checkboxLabel}>Requires quote before booking</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="serviceDesc">
              Description:
            </label>
            <textarea
              id="serviceDesc"
              className={`input-field ${styles.textarea}`}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what the service includes..."
            />
          </div>

          <div className={styles.formSection}>
            <h5 className={styles.sectionTitle}>Advanced Scheduling settings</h5>
            <div className={styles.twoCol}>
              <div className="form-group">
                <label className="form-label" htmlFor="serviceDuration">
              Duration (min):
            </label>
                <input
                  id="serviceDuration"
                  type="number"
                  min="1"
                  className="input-field"
                  value={formData.durationMinutes}
                  onChange={(e) => handleInputChange('durationMinutes', parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="serviceBuffer">
              Buffer time after service (min):
            </label>
                <input
                  id="serviceBuffer"
                  type="number"
                  min="0"
                  className="input-field"
                  value={formData.bufferMinutes}
                  onChange={(e) => handleInputChange('bufferMinutes', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className={styles.twoCol} style={{ marginTop: 6 }}>
              <div className="form-group">
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={formData.groupService}
                    onChange={(e) => handleInputChange('groupService', e.target.checked)}
                  />
                  <span className={styles.checkboxLabel}>Group service</span>
                </label>
              </div>

              <div className="form-group">
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => handleInputChange('active', e.target.checked)}
                  />
                  <span className={styles.checkboxLabel}>Active catalog offering</span>
                </label>
              </div>
            </div>

            {formData.groupService && (
              <div className={styles.twoCol}>
                <div className="form-group">
                  <label className="form-label" htmlFor="serviceCapacity">
              Maximum capacity (clients per slot):
            </label>
                  <input
                    id="serviceCapacity"
                    type="number"
                    min="1"
                    className="input-field"
                    value={formData.capacity}
                    onChange={(e) => handleInputChange('capacity', parseInt(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="serviceMaxConcurrent">
              Maximum concurrent slots:
            </label>
                  <input
                    id="serviceMaxConcurrent"
                    type="number"
                    min="1"
                    className="input-field"
                    value={formData.maxConcurrent}
                    onChange={(e) => handleInputChange('maxConcurrent', parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Delete service"
        message="Are you sure you want to delete this service from your catalog?"
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

