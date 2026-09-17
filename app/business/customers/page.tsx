'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import styles from '@/app/phase1.module.css';

type CustomerRow = {
  customer_id?: number;
  customerId?: number;
  email?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  phone_number?: string;
  phoneNumber?: string;
  last_booking_at?: string;
  lastBookingAt?: string;
  booking_count?: number;
  bookingCount?: number;
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function displayName(row: CustomerRow) {
  const first = row.first_name || row.firstName || '';
  const last = row.last_name || row.lastName || '';
  const full = `${first} ${last}`.trim();
  return full || row.email || `Customer #${row.customer_id ?? row.customerId ?? ''}`;
}

export default function BusinessCustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await apiFetch<CustomerRow[]>('/api/provider/ops/customers'));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Could not load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Customers"
        subtitle="People who have booked with your business."
      />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {loading ? (
        <Skeleton variant="row" count={5} />
      ) : rows.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            icon="fa-users"
            title="No customers yet"
            description="Customers appear here after their first booking with your business."
          />
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {rows.map((row) => {
            const id = row.customer_id ?? row.customerId ?? row.email;
            const bookings = row.booking_count ?? row.bookingCount ?? 0;
            const phone = row.phone_number || row.phoneNumber;
            const lastBooking = row.last_booking_at || row.lastBookingAt;
            return (
              <article className={styles.card} key={String(id)}>
                <div className={styles.cardHead}>
                  <div>
                    <h3>{displayName(row)}</h3>
                    <p className={styles.muted}>{row.email || 'No email'}</p>
                  </div>
                </div>
                <div className={styles.requestMeta}>
                  {phone && (
                    <span>
                      <i className="fa-solid fa-phone" /> {phone}
                    </span>
                  )}
                  <span>
                    <i className="fa-solid fa-calendar-check" /> {bookings} booking{bookings === 1 ? '' : 's'}
                  </span>
                  <span>
                    <i className="fa-regular fa-clock" /> Last {formatDate(lastBooking)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
