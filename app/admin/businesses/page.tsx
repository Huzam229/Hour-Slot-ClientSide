'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import FilterBar from '@/components/FilterBar';
import Tabs from '@/components/Tabs';
import StatusBadge from '@/components/StatusBadge';
import styles from './businesses.module.css';

interface Business {
  id: number;
  name: string;
  description?: string;
  category?: string;
  status: string;
  verified: boolean;
  publishStatus?: string;
  listingMode?: string;
  commissionRate: number;
  rating: number;
  logoUrl?: string;
  rejectionReason?: string;
  createdAt: string;
  owner: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBusinesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/businesses?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery)}`;
      const data = await apiFetch<Business[]>(url);
      setBusinesses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve business listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBusinesses();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.businessesWrapper}>
      <PageHeader
        title="Businesses"
        subtitle="Review applications, approve listings, and grant Verified badges from each listing’s detail page."
      />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      )}

      <Tabs
        tabs={[
          { id: '', label: 'All' },
          { id: 'PENDING', label: 'Pending' },
          { id: 'APPROVED', label: 'Approved' },
          { id: 'REJECTED', label: 'Rejected' },
          { id: 'SUSPENDED', label: 'Suspended' },
        ]}
        active={statusFilter}
        onChange={setStatusFilter}
      />

      <form onSubmit={handleSearchSubmit}>
        <FilterBar>
          <input
            type="text"
            className="input-field"
            placeholder="Search business, category, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </FilterBar>
      </form>

      {loading && businesses.length === 0 ? (
        <Skeleton variant="card" count={3} />
      ) : businesses.length === 0 ? (
        <EmptyState icon="fa-store" title="No businesses found" description="No business applications match this filter." />
      ) : (
        <div className={styles.businessGrid}>
          {businesses.map((b) => (
            <div key={b.id} className={`surface ${styles.businessCard}`}>
              <div className={styles.cardTop}>
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt={b.name} className={styles.bizLogo} />
                ) : (
                  <div className={styles.bizInitials}>{b.name.charAt(0)}</div>
                )}
                <div className={styles.bizMeta}>
                  <h3 className={styles.bizName}>{b.name}</h3>
                  <span className={styles.bizCategory}>
                    {b.listingMode === 'INDIVIDUAL' ? 'Individual' : b.category || 'Service provider'}
                    {b.verified ? ' · Verified' : ''}
                  </span>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <p className={styles.bizDesc}>{b.description || 'No description provided.'}</p>
              <div className={styles.detailRow}>
                <span>
                  Owner: {b.owner?.firstName} {b.owner?.lastName}
                </span>
                <span>{b.owner?.email}</span>
                <span>Registered: {formatDate(b.createdAt)}</span>
                <span>Publish: {b.publishStatus || 'DRAFT'}</span>
              </div>

              <div className={styles.cardFooter}>
                <Link href={`/admin/businesses/${b.id}`} className="btn btn-primary btn-sm">
                  {b.status === 'PENDING' ? 'Review' : 'Details'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
