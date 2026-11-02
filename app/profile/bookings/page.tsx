'use client';

import { Suspense, useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { buildBookingHref } from '@/lib/booking-flow';
import ScheduleStep from '@/components/booking/ScheduleStep';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import Tabs from '@/components/Tabs';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormField from '@/components/FormField';
import { formatMoney } from '@/lib/money';
import styles from './my-bookings.module.css';

interface Branch {
  id: number;
  name: string;
  address: string;
  business?: { id: number; name?: string };
}

interface Service {
  id: number;
  name: string;
  price: number;
  durationMinutes: number;
  currency?: string;
}

interface Staff {
  id: number;
  name: string;
}

interface Booking {
  id: number;
  branch: Branch;
  service: Service;
  staff?: Staff;
  bookingTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'IN_PROGRESS' | 'RESCHEDULED';
  price: number;
  paymentStatus?: string;
  currency?: string;
}

type WaitlistEntry = {
  id: number;
  businessId: number;
  branchId: number;
  serviceId: number;
  desiredDate: string;
  status: string;
  businessName: string;
  serviceName: string;
};

function MyBookingsContent() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    bookingId: 0,
    rating: 5,
    comment: '',
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('Are you sure you want to cancel this appointment? This cannot be undone.');
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  const loadWaitlist = async () => {
    try {
      setWaitlist(await apiFetch<WaitlistEntry[]>('/api/customer/waitlist'));
    } catch {
      setWaitlist([]);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWaitlist();
  }, []);

  /** Show what the provider's cancellation policy means for this booking before confirming. */
  const openCancel = async (bookingId: number) => {
    setCancelMessage('Are you sure you want to cancel this appointment? This cannot be undone.');
    setCancelId(bookingId);
    try {
      const preview = await apiFetch<{ late: boolean; fee: number; currency?: string; freeCancelHours: number }>(
        `/api/customer/bookings/${bookingId}/cancel-preview`
      );
      if (preview.late) {
        setCancelMessage(
          Number(preview.fee) > 0
            ? `This is within ${preview.freeCancelHours} hours of your appointment, so the provider's late-cancellation fee of ${preview.currency || ''} ${preview.fee} applies. Cancel anyway?`
            : `This is within the provider's ${preview.freeCancelHours}-hour cancellation window and will count as a late cancellation. Cancel anyway?`
        );
      } else if (preview.freeCancelHours > 0) {
        setCancelMessage(`Cancelling now is free (more than ${preview.freeCancelHours} hours before). Cancel this appointment?`);
      }
    } catch {
      // keep the default message
    }
  };
  const [payingId, setPayingId] = useState<number | null>(null);

  const paymentStatus = searchParams.get('payment');
  const seriesBooked = searchParams.get('series');
  const seriesSkipped = searchParams.get('skipped');
  useEffect(() => {
    if (seriesBooked) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuccess(
        `Booked ${seriesBooked} repeat appointments.` +
          (seriesSkipped ? ` ${seriesSkipped} date(s) were already taken and were skipped.` : '')
      );
    }
  }, [seriesBooked, seriesSkipped]);
  useEffect(() => {
    if (paymentStatus === 'success') setSuccess('Payment completed successfully.');
    if (paymentStatus === 'cancelled') setError('Online payment was cancelled.');
  }, [paymentStatus]);

  const handleOpenRescheduleModal = (booking: Booking) => {
    setReschedulingBooking(booking);
    const todayStr = new Date().toISOString().split('T')[0];
    setRescheduleDate(todayStr);
    setSelectedRescheduleSlot('');
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!reschedulingBooking || !rescheduleDate || !selectedRescheduleSlot) return;
    setRescheduleSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const bookingTimeStr = `${rescheduleDate}T${selectedRescheduleSlot}`;
      await apiFetch(
        `/api/bookings/${reschedulingBooking.id}/reschedule?bookingTime=${encodeURIComponent(bookingTimeStr)}`,
        { method: 'PUT' }
      );
      setSuccess('Appointment rescheduled successfully.');
      setShowRescheduleModal(false);
      await loadBookings();
    } catch (err: any) {
      setError(err?.message || 'Failed to reschedule appointment.');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Booking[]>('/api/customer/bookings');
      setBookings(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    const result = bookings.filter((b) => {
      const isUpcoming =
        b.status === 'PENDING' ||
        b.status === 'CONFIRMED' ||
        b.status === 'IN_PROGRESS' ||
        b.status === 'RESCHEDULED';
      if (activeTab === 'upcoming') return isUpcoming;
      return !isUpcoming;
    });
    setFilteredBookings(result);
  }, [bookings, activeTab]);

  const handleCancelConfirm = async () => {
    if (cancelId == null) return;
    setCancelLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch<{ message?: string }>(`/api/customer/bookings/${cancelId}/cancel`, { method: 'PUT' });
      setSuccess(res?.message || 'Appointment cancelled successfully.');
      setCancelId(null);
      await loadBookings();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel appointment.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePayOnline = async (bookingId: number) => {
    setPayingId(bookingId);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<{ url: string }>(`/api/payments/checkout?bookingId=${bookingId}`, {
        method: 'POST',
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Could not start checkout.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start online payment.');
      setPayingId(null);
    }
  };

  const handleOpenReviewModal = (bookingId: number) => {
    setReviewForm({ bookingId, rating: 5, comment: '' });
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setReviewSubmitting(true);
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(reviewForm),
      });
      setSuccess('Review submitted. Thank you for your feedback!');
      setReviewedBookingIds((prev) => [...prev, reviewForm.bookingId]);
      setShowReviewModal(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };


  const formatDateParts = (isoStr: string) => {
    const d = new Date(isoStr);
    return {
      weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
      day: d.getDate(),
      month: d.toLocaleDateString(undefined, { month: 'short' }),
      time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
  };

  const needsPayment = (b: Booking) => {
    const unpaid =
      !b.paymentStatus ||
      b.paymentStatus.toUpperCase() === 'UNPAID' ||
      b.paymentStatus.toUpperCase() === 'PENDING';
    const active = b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'RESCHEDULED';
    return unpaid && active;
  };

  return (
    <div className={styles.bookingsContainer}>
      <PageHeader
        title="My bookings"
        subtitle="Upcoming appointments, history, reschedule, and pay online."
        actions={
          <Link href="/profile/explore" className="btn btn-primary btn-sm">
            Book new
          </Link>
        }
      />

      {success && (
        <div className={styles.toastSuccess}>
          <i className="fa-solid fa-circle-check" /> {success}
        </div>
      )}
      {error && (
        <div className={styles.toastError}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {waitlist.length > 0 && (
        <div className={styles.toastSuccess} style={{ display: 'grid', gap: 6 }}>
          <strong><i className="fa-solid fa-hourglass-half" /> Waitlist</strong>
          {waitlist.map((w) => (
            <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span>
                {w.serviceName} at {w.businessName} · {w.desiredDate}
                {w.status === 'NOTIFIED' ? ' — a slot opened, book it now!' : ' — waiting for a free slot'}
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                {w.status === 'NOTIFIED' && (
                  <a className="btn btn-primary btn-sm"
                    href={`/profile/book/${w.businessId}?serviceId=${w.serviceId}&branchId=${w.branchId}&date=${w.desiredDate}&step=schedule`}>
                    Book
                  </a>
                )}
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={async () => {
                    await apiFetch(`/api/customer/waitlist/${w.id}`, { method: 'DELETE' }).catch(() => undefined);
                    await loadWaitlist();
                  }}>
                  Leave
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'past', label: 'Past & cancelled' },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as 'upcoming' | 'past')}
      />

      {loading ? (
        <div className={styles.skeletonList}>
          <Skeleton variant="row" count={4} />
        </div>
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon="fa-calendar"
          title="No appointments found"
          description="You don’t have any appointments in this category."
          actionLabel="Explore services"
          onAction={() => {
            window.location.href = '/profile/explore';
          }}
        />
      ) : (
        <div className={styles.bookingsList}>
          {filteredBookings.map((b) => {
            const hasReviewed = reviewedBookingIds.includes(b.id);
            const parts = formatDateParts(b.bookingTime);
            return (
              <article key={b.id} className={styles.bookingCard}>
                <div className={styles.dateHero}>
                  <div className={styles.dateBlock}>
                    <span>{parts.weekday}</span>
                    <strong>{parts.day}</strong>
                    <em>{parts.month}</em>
                  </div>
                  <div className={styles.dateHeroMeta}>
                    <div className={styles.badgeRow}>
                      <StatusBadge status={b.status} />
                      {b.paymentStatus && <StatusBadge status={b.paymentStatus} />}
                    </div>
                    <h4>{b.service.name}</h4>
                    <p className={styles.timeLine}>
                      <i className="fa-regular fa-clock" /> {parts.time}
                      <span>·</span>
                      {b.service.durationMinutes} min
                    </p>
                  </div>
                  <span className={styles.price}>{formatMoney(b.price, b.currency || b.service?.currency)}</span>
                </div>

                <div className={styles.cardMeta}>
                  <p>
                    <i className="fa-solid fa-shop" /> {b.branch.name}
                  </p>
                  <p>
                    <i className="fa-solid fa-user" /> {b.staff?.name || 'Any available specialist'}
                  </p>
                </div>

                <div className={styles.cardFooter}>
                  {b.branch.business?.id && (
                    <Link
                      href={buildBookingHref(b.branch.business.id, {
                        step: 'service',
                        serviceId: String(b.service.id),
                        branchId: String(b.branch.id),
                      })}
                      className="btn btn-outline btn-sm"
                    >
                      Book again
                    </Link>
                  )}
                  {activeTab === 'upcoming' && b.status !== 'IN_PROGRESS' && (
                    <>
                      {needsPayment(b) && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handlePayOnline(b.id)}
                          disabled={payingId === b.id}
                        >
                          {payingId === b.id ? 'Redirecting…' : 'Pay online'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenRescheduleModal(b)}
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        className={`btn btn-outline btn-sm ${styles.cancelBtn}`}
                        onClick={() => void openCancel(b.id)}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {b.status === 'COMPLETED' &&
                    (hasReviewed ? (
                      <span className={styles.reviewedBadge}>
                        <i className="fa-solid fa-check-double" /> Reviewed
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleOpenReviewModal(b.id)}
                      >
                        Rate & review
                      </button>
                    ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={showReviewModal}
        title="Submit review"
        onClose={() => setShowReviewModal(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowReviewModal(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="review-form"
              className="btn btn-primary"
              disabled={reviewSubmitting}
            >
              {reviewSubmitting ? 'Submitting…' : 'Submit review'}
            </button>
          </>
        }
      >
        <form id="review-form" onSubmit={handleReviewSubmit} className={styles.modalForm}>
          <div className="form-group">
            <label className="form-label">
              Overall rating
            </label>
            <div className={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} stars`}
                  onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                >
                  <i className={`fa-${reviewForm.rating >= star ? 'solid' : 'regular'} fa-star`} />
                </button>
              ))}
            </div>
          </div>
          <FormField
            as="textarea"
            label="Comment (optional)"
            htmlFor="reviewComment"
            value={reviewForm.comment}
            onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
            placeholder="Share your experience…"
            rows={4}
          />
        </form>
      </Modal>

      <Modal
        open={showRescheduleModal}
        title="Reschedule appointment"
        onClose={() => setShowRescheduleModal(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowRescheduleModal(false)}
              disabled={rescheduleSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRescheduleSubmit}
              disabled={rescheduleSubmitting || !selectedRescheduleSlot}
            >
              {rescheduleSubmitting ? 'Rescheduling…' : 'Confirm reschedule'}
            </button>
          </>
        }
      >
        <div className={styles.modalForm}>
          {reschedulingBooking && (
            <>
              <p className={styles.rescheduleHint}>
                {reschedulingBooking.service.name} at {reschedulingBooking.branch.name}
              </p>
              <ScheduleStep
                compact
                branchId={String(reschedulingBooking.branch.id)}
                serviceId={String(reschedulingBooking.service.id)}
                staffId={reschedulingBooking.staff?.id ? String(reschedulingBooking.staff.id) : ''}
                staffName={reschedulingBooking.staff?.name}
                selectedDate={rescheduleDate}
                selectedSlot={selectedRescheduleSlot}
                currency={reschedulingBooking.currency || reschedulingBooking.service.currency}
                onDateChange={(date) => {
                  setRescheduleDate(date);
                  setSelectedRescheduleSlot('');
                }}
                onSlotChange={setSelectedRescheduleSlot}
              />
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelId != null}
        title="Cancel appointment?"
        message={cancelMessage}
        confirmLabel="Cancel booking"
        danger
        loading={cancelLoading}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.bookingsContainer}>
          <Skeleton variant="title" />
          <Skeleton variant="row" count={3} />
        </div>
      }
    >
      <MyBookingsContent />
    </Suspense>
  );
}
