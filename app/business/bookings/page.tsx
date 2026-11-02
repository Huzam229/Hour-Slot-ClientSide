'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { parseSlots, slotTimes } from '@/lib/slots';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import FilterBar from '@/components/FilterBar';
import Tabs from '@/components/Tabs';
import Modal from '@/components/Modal';
import CalendarView, { CalendarEvent } from '@/components/CalendarView';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';
import { useOrgLocale } from '@/lib/org-locale-context';
import styles from './bookings.module.css';

interface Branch {
  id: number;
  name: string;
}

interface Customer {
  id: number;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Service {
  id: number;
  name: string;
  durationMinutes: number;
}

interface Staff {
  id: number;
  name: string;
}

interface Booking {
  id: number;
  customer: Customer;
  branch: Branch;
  service: Service;
  staff?: Staff;
  bookingTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'IN_PROGRESS' | 'RESCHEDULED';
  price: number;
}

function bookingDateKey(iso: string) {
  return iso.split('T')[0];
}

function bookingTimeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function BookingsPage() {
  const { format } = useOrgLocale();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [listTab, setListTab] = useState<'today' | 'upcoming' | 'past'>('today');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Walk-in booking states
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [walkinDate, setWalkinDate] = useState('');
  const [walkinSlots, setWalkinSlots] = useState<string[]>([]);
  const [walkinSlotsLoading, setWalkinSlotsLoading] = useState(false);
  const [selectedWalkinSlot, setSelectedWalkinSlot] = useState('');
  const [walkinNotes, setWalkinNotes] = useState('');

  // Fetch slot times for rescheduling
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedBooking || !rescheduleDate) {
        setRescheduleSlots([]);
        return;
      }
      setRescheduleSlotsLoading(true);
      setSelectedRescheduleSlot('');
      try {
        let url = `/api/public/branches/${selectedBooking.branch.id}/slots?serviceId=${selectedBooking.service.id}&date=${rescheduleDate}`;
        if (selectedBooking.staff?.id) {
          url += `&staffId=${selectedBooking.staff.id}`;
        }
        const slots = await apiFetch<unknown>(url, { skipAuth: true });
        setRescheduleSlots(slotTimes(parseSlots(slots)));
      } catch {
        setRescheduleSlots([]);
      } finally {
        setRescheduleSlotsLoading(false);
      }
    };
    if (isRescheduling) {
      fetchSlots();
    }
  }, [selectedBooking, rescheduleDate, isRescheduling]);

  // Fetch slot times for walk-in booking creation
  useEffect(() => {
    const fetchWalkinSlots = async () => {
      if (!selectedBranchId || !selectedServiceId || !walkinDate) {
        setWalkinSlots([]);
        return;
      }
      setWalkinSlotsLoading(true);
      setSelectedWalkinSlot('');
      try {
        let url = `/api/public/branches/${selectedBranchId}/slots?serviceId=${selectedServiceId}&date=${walkinDate}`;
        if (selectedStaffId && selectedStaffId !== 'any') {
          url += `&staffId=${selectedStaffId}`;
        }
        const slots = await apiFetch<unknown>(url, { skipAuth: true });
        setWalkinSlots(slotTimes(parseSlots(slots)));
      } catch {
        setWalkinSlots([]);
      } finally {
        setWalkinSlotsLoading(false);
      }
    };
    if (showWalkinModal) {
      fetchWalkinSlots();
    }
  }, [selectedBranchId, selectedServiceId, selectedStaffId, walkinDate, showWalkinModal]);

  const loadWalkinData = async () => {
    try {
      const [servicesData, staffData, customersData] = await Promise.all([
        apiFetch<Service[]>('/api/business/services'),
        apiFetch<Staff[]>('/api/business/staff'),
        apiFetch<any[]>('/api/business/customers').catch(() => []),
      ]);
      setServices(servicesData);
      setStaffList(staffData);
      setCustomers(customersData);
    } catch (err: any) {
      console.error('Failed to load walk-in data', err);
    }
  };

  const openWalkinModal = () => {
    loadWalkinData();
    setSelectedCustomerId('');
    setCustomerSearch('');
    setShowNewCustomerForm(false);
    setNewCustomer({ firstName: '', lastName: '', email: '', phoneNumber: '' });
    setSelectedServiceId('');
    setSelectedStaffId('');
    setWalkinDate(new Date().toISOString().split('T')[0]);
    setSelectedWalkinSlot('');
    setWalkinNotes('');
    setShowWalkinModal(true);
  };

  const openBooking = (id: number) => {
    const booking = bookings.find((b) => b.id === id);
    if (booking) {
      setSelectedBooking(booking);
      setIsRescheduling(false);
      setShowDetailsModal(true);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedBooking || !rescheduleDate || !selectedRescheduleSlot) return;
    setRescheduleSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const bookingTimeStr = `${rescheduleDate}T${selectedRescheduleSlot}`;
      await apiFetch(`/api/bookings/${selectedBooking.id}/reschedule?bookingTime=${encodeURIComponent(bookingTimeStr)}`, {
        method: 'PUT',
      });
      setSuccess('Appointment rescheduled successfully.');
      setShowDetailsModal(false);
      if (selectedBranchId) {
        await loadBookings(selectedBranchId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to reschedule appointment.');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const handleWalkinSubmit = async () => {
    if (!selectedServiceId || !walkinDate || !selectedWalkinSlot) {
      setError('Please fill out all required fields.');
      return;
    }
    
    if (!selectedCustomerId && !showNewCustomerForm) {
      setError('Please select or register a customer.');
      return;
    }

    setWalkinSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let customerId = selectedCustomerId;
      if (showNewCustomerForm) {
        if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.email) {
          throw new Error('Please fill out all required customer fields.');
        }
        const createdUser = await apiFetch<any>('/api/business/customers', {
          method: 'POST',
          body: JSON.stringify(newCustomer),
        });
        customerId = createdUser.id.toString();
      }

      const bookingTimeStr = `${walkinDate}T${selectedWalkinSlot}`;
      await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          branchId: Number(selectedBranchId),
          serviceId: Number(selectedServiceId),
          staffId: selectedStaffId && selectedStaffId !== 'any' ? Number(selectedStaffId) : null,
          bookingTime: bookingTimeStr,
          customerId: Number(customerId),
          clientNotes: walkinNotes,
        }),
      });

      setSuccess('Walk-in booking created successfully.');
      setShowWalkinModal(false);
      if (selectedBranchId) {
        await loadBookings(selectedBranchId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create offline booking.');
    } finally {
      setWalkinSubmitting(false);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const branchData = await apiFetch<Branch[]>('/api/business/branches');
      setBranches(branchData);
      if (branchData.length > 0) {
        setSelectedBranchId(branchData[0].id.toString());
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async (branchId: string) => {
    if (!branchId) return;
    setBookingsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Booking[]>(`/api/bookings/branch/${branchId}`);
      setBookings(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load bookings.');
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadBookings(selectedBranchId);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    let result = bookings;

    if (selectedDateFilter) {
      result = result.filter((booking) => bookingDateKey(booking.bookingTime) === selectedDateFilter);
    } else {
      result = result.filter((booking) => {
        const bookingDateStr = bookingDateKey(booking.bookingTime);
        const isToday = bookingDateStr === todayStr;
        const isFuture = bookingDateStr > todayStr;
        const isPast = bookingDateStr < todayStr;

        if (listTab === 'today') {
          return isToday && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';
        }
        if (listTab === 'upcoming') {
          return isFuture && booking.status !== 'CANCELLED';
        }
        if (listTab === 'past') {
          return isPast || booking.status === 'CANCELLED' || booking.status === 'COMPLETED' || booking.status === 'NO_SHOW';
        }
        return true;
      });
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((b) => b.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((b) => {
        const custName = `${b.customer.user.firstName} ${b.customer.user.lastName}`.toLowerCase();
        const serviceName = b.service.name.toLowerCase();
        const staffName = b.staff?.name.toLowerCase() || '';
        return custName.includes(query) || serviceName.includes(query) || staffName.includes(query);
      });
    }

    setFilteredBookings(result);
  }, [bookings, listTab, searchQuery, statusFilter, selectedDateFilter]);

  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      bookings.map((b) => ({
        id: b.id,
        date: bookingDateKey(b.bookingTime),
        title: `${b.service.name} · ${b.customer.user.firstName} ${b.customer.user.lastName}`,
        time: bookingTimeLabel(b.bookingTime),
      })),
    [bookings]
  );

  // Dynamic statistics summary metrics based on date selection
  const stats = useMemo(() => {
    const targetDate = selectedDateFilter || new Date().toISOString().split('T')[0];
    const targetBookings = bookings.filter((b) => bookingDateKey(b.bookingTime) === targetDate);
    const activeToday = targetBookings.filter((b) => b.status !== 'CANCELLED');

    return {
      count: activeToday.length,
      confirmedCount: activeToday.filter((b) => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS' || b.status === 'COMPLETED').length,
      revenue: activeToday.reduce((acc, curr) => acc + curr.price, 0),
      pendingCount: activeToday.filter((b) => b.status === 'PENDING').length
    };
  }, [bookings, selectedDateFilter]);

  // Autocomplete customer filters
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const query = customerSearch.toLowerCase();
    return customers.filter((c: any) => {
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const email = (c.email || '').toLowerCase();
      return fullName.includes(query) || email.includes(query);
    });
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id.toString() === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const branchStaff = useMemo(() => {
    return staffList.filter((s: any) => s.branch?.id === Number(selectedBranchId));
  }, [staffList, selectedBranchId]);

  const selectCustomer = (c: any) => {
    setSelectedCustomerId(c.id.toString());
    setCustomerSearch('');
  };

  const nextStatuses = (status: string): string[] => {
    switch (status) {
      case 'PENDING':
        return ['CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED':
        return ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
      case 'IN_PROGRESS':
        return ['COMPLETED', 'CANCELLED', 'NO_SHOW'];
      case 'RESCHEDULED':
        return ['CONFIRMED', 'CANCELLED'];
      default:
        return [];
    }
  };

  const handleUpdateStatus = async (bookingId: number, status: string) => {
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setSuccess(`Booking status updated to ${status}!`);
      if (selectedBranchId) {
        await loadBookings(selectedBranchId);
      }
      if (selectedBooking?.id === bookingId) {
        setShowDetailsModal(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update booking status.');
    }
  };

  const formatBookingDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className={styles.bookingsContainer}>
        <Skeleton variant="title" />
        <Skeleton variant="row" count={4} />
      </div>
    );
  }

  return (
    <div className={styles.bookingsContainer}>
      <PageHeader
        title="Bookings"
        subtitle="Manage appointments by list or calendar, update status, and reschedule when needed."
        actions={
          <div className={styles.headerActions}>
            {branches.length > 0 && (
              <button type="button" className="btn btn-primary" onClick={openWalkinModal}>
                <i className="fa-solid fa-plus" /> Book Walk-in
              </button>
            )}
            {branches.length > 0 && (
              <div style={{ minWidth: '180px' }}>
                <CustomSelect
                  options={branches.map((b) => ({ value: b.id.toString(), label: b.name }))}
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  searchable={false}
                  placeholder="Select branch"
                />
              </div>
            )}
          </div>
        }
      />

      {success && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" /> {success}
        </div>
      )}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {branches.length === 0 ? (
        <EmptyState
          icon="fa-calendar-days"
          title="No branches found"
          description="Configure a branch before you can manage bookings."
          actionLabel="Add branch"
          onAction={() => {
            window.location.href = '/business/branches';
          }}
        />
      ) : (
        <>
          {/* Statistics summary metric grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <i className="fa-solid fa-calendar-check" />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>
                  {selectedDateFilter ? 'Selected Day Bookings' : "Today's Bookings"}
                </span>
                <span className={styles.statValue}>{stats.count}</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)' }}>
                <i className="fa-solid fa-circle-check" />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Confirmed / Active</span>
                <span className={styles.statValue}>{stats.confirmedCount}</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)' }}>
                <i className="fa-solid fa-dollar-sign" />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Expected Revenue</span>
                <span className={styles.statValue}>{format(stats.revenue)}</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}>
                <i className="fa-solid fa-clock" />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Pending Approvals</span>
                <span className={styles.statValue}>{stats.pendingCount}</span>
              </div>
            </div>
          </div>

          <Tabs
            tabs={[
              { id: 'list', label: 'List' },
              { id: 'calendar', label: 'Calendar' },
            ]}
            active={viewMode}
            onChange={(id) => setViewMode(id as 'list' | 'calendar')}
          />

          {viewMode === 'list' ? (
            <>
              {!selectedDateFilter && (
                <Tabs
                  tabs={[
                    { id: 'today', label: 'Today' },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'past', label: 'History' },
                  ]}
                  active={listTab}
                  onChange={(id) => setListTab(id as typeof listTab)}
                />
              )}
              <FilterBar>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search name or service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className={styles.dateFilterGroup} style={{ minWidth: '160px' }}>
                  <CustomDatePicker
                    value={selectedDateFilter}
                    onChange={setSelectedDateFilter}
                    placeholder="Filter by date"
                  />
                  {selectedDateFilter && (
                    <button
                      type="button"
                      className={styles.resetDateBtn}
                      onClick={() => setSelectedDateFilter('')}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div style={{ minWidth: '160px' }}>
                  <CustomSelect
                    options={[
                      { value: 'ALL', label: 'All statuses' },
                      { value: 'PENDING', label: 'Pending' },
                      { value: 'CONFIRMED', label: 'Confirmed' },
                      { value: 'IN_PROGRESS', label: 'In progress' },
                      { value: 'COMPLETED', label: 'Completed' },
                      { value: 'CANCELLED', label: 'Cancelled' },
                      { value: 'NO_SHOW', label: 'No show' },
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    searchable={false}
                    placeholder="Filter by status"
                  />
                </div>
              </FilterBar>

              {bookingsLoading ? (
                <Skeleton variant="row" count={5} />
              ) : filteredBookings.length === 0 ? (
                <EmptyState
                  icon="fa-inbox"
                  title="No bookings found"
                  description="No scheduled appointments matched your current filters."
                />
              ) : (
                <div className={styles.bookingsList}>
                  {filteredBookings.map((b) => (
                    <div
                      key={b.id}
                      className={`surface ${styles.bookingCard}`}
                      onClick={() => openBooking(b.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openBooking(b.id);
                      }}
                    >
                      <div className={styles.mainInfo}>
                        <div className={styles.timeBlock}>
                          <span className={styles.timeHour}>{bookingTimeLabel(b.bookingTime)}</span>
                          <span className={styles.timeDate}>{formatBookingDate(b.bookingTime)}</span>
                        </div>
                        <div className={styles.detailsBlock}>
                          <div className={styles.serviceName}>
                            {b.service.name}
                            <StatusBadge status={b.status} />
                          </div>
                          <div className={styles.metaLine}>
                            <i className="fa-solid fa-user" /> {b.customer.user.firstName} {b.customer.user.lastName}
                            <span className={styles.sep}>·</span>
                            <i className="fa-solid fa-envelope" /> {b.customer.user.email}
                          </div>
                          <div className={styles.metaLine}>
                            <i className="fa-solid fa-user-doctor" /> {b.staff?.name || 'Any available'}
                          </div>
                        </div>
                      </div>

                      <div className={styles.metaInfo} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.priceText}>{format(b.price)}</div>
                        <div className={styles.actionArea}>
                          {nextStatuses(b.status).includes('CONFIRMED') && (
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}>
                              Confirm
                            </button>
                          )}
                          {nextStatuses(b.status).includes('IN_PROGRESS') && (
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => handleUpdateStatus(b.id, 'IN_PROGRESS')}>
                              Start
                            </button>
                          )}
                          {nextStatuses(b.status).includes('COMPLETED') && (
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}>
                              Complete
                            </button>
                          )}
                          {nextStatuses(b.status).includes('NO_SHOW') && (
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => handleUpdateStatus(b.id, 'NO_SHOW')}>
                              No show
                            </button>
                          )}
                          {nextStatuses(b.status).includes('CANCELLED') && (
                            <button type="button" className="btn btn-sm btn-danger" onClick={() => handleUpdateStatus(b.id, 'CANCELLED')}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : bookingsLoading ? (
            <Skeleton variant="card" height={420} />
          ) : (
            <CalendarView
              month={calendarMonth}
              events={calendarEvents}
              onMonthChange={setCalendarMonth}
              onEventClick={(ev) => openBooking(Number(ev.id))}
            />
          )}
        </>
      )}

      {/* Details/Reschedule Modal */}
      <Modal
        open={showDetailsModal && !!selectedBooking}
        title="Booking details"
        onClose={() => setShowDetailsModal(false)}
        footer={
          selectedBooking ? (
            <>
              {!isRescheduling &&
                selectedBooking.status !== 'CANCELLED' &&
                selectedBooking.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setIsRescheduling(true);
                      setRescheduleDate(new Date().toISOString().split('T')[0]);
                    }}
                  >
                    Reschedule
                  </button>
                )}
              <button type="button" className="btn btn-outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
              {isRescheduling && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRescheduleSubmit}
                  disabled={rescheduleSubmitting || !selectedRescheduleSlot}
                >
                  {rescheduleSubmitting ? 'Saving...' : 'Confirm reschedule'}
                </button>
              )}
            </>
          ) : null
        }
      >
        {selectedBooking &&
          (isRescheduling ? (
            <div className={styles.modalStack}>
              <div className="form-group">
                <label className="form-label" htmlFor="business-reschedule-date">
              Select new date
            </label>
                <CustomDatePicker
                  id="business-reschedule-date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={setRescheduleDate}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
              Available slots
            </label>
                {rescheduleSlotsLoading ? (
                  <Skeleton variant="row" count={2} />
                ) : rescheduleSlots.length === 0 ? (
                  <p className={styles.muted}>No available slots for this date.</p>
                ) : (
                  <div className={styles.slotGrid}>
                    {rescheduleSlots.map((slot) => {
                      const isSelected = selectedRescheduleSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`${styles.slotBtn} ${isSelected ? styles.slotSelected : ''}`}
                          onClick={() => setSelectedRescheduleSlot(slot)}
                        >
                          {slot.substring(0, 5)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.modalStack}>
              <div className={styles.detailTop}>
                <StatusBadge status={selectedBooking.status} />
                <span className={styles.priceText}>{format(selectedBooking.price)}</span>
              </div>
              <div>
                <h3 className={styles.detailTitle}>{selectedBooking.service.name}</h3>
                <p className={styles.muted}>
                  <i className="fa-regular fa-clock" /> {selectedBooking.service.durationMinutes} minutes
                </p>
              </div>
              <div className={styles.detailSection}>
                <h5>Customer</h5>
                <p className={styles.strong}>
                  {selectedBooking.customer.user.firstName} {selectedBooking.customer.user.lastName}
                </p>
                <p className={styles.muted}>{selectedBooking.customer.user.email}</p>
              </div>
              <div className={styles.detailSection}>
                <h5>Schedule</h5>
                <p>
                  {formatBookingDate(selectedBooking.bookingTime)} at {bookingTimeLabel(selectedBooking.bookingTime)}
                </p>
                <p className={styles.muted}>Specialist: {selectedBooking.staff?.name || 'Any available'}</p>
              </div>
              <div className={styles.actionArea}>
                {nextStatuses(selectedBooking.status).includes('CONFIRMED') && (
                  <button type="button" className="btn btn-primary" onClick={() => handleUpdateStatus(selectedBooking.id, 'CONFIRMED')}>
                    Confirm
                  </button>
                )}
                {nextStatuses(selectedBooking.status).includes('IN_PROGRESS') && (
                  <button type="button" className="btn btn-primary" onClick={() => handleUpdateStatus(selectedBooking.id, 'IN_PROGRESS')}>
                    Start
                  </button>
                )}
                {nextStatuses(selectedBooking.status).includes('COMPLETED') && (
                  <button type="button" className="btn btn-primary" onClick={() => handleUpdateStatus(selectedBooking.id, 'COMPLETED')}>
                    Complete
                  </button>
                )}
                {nextStatuses(selectedBooking.status).includes('NO_SHOW') && (
                  <button type="button" className="btn btn-outline" onClick={() => handleUpdateStatus(selectedBooking.id, 'NO_SHOW')}>
                    No show
                  </button>
                )}
                {nextStatuses(selectedBooking.status).includes('CANCELLED') && (
                  <button type="button" className="btn btn-danger" onClick={() => handleUpdateStatus(selectedBooking.id, 'CANCELLED')}>
                    Cancel booking
                  </button>
                )}
              </div>
            </div>
          ))}
      </Modal>

      {/* Walk-in/Offline Booking Creator Modal */}
      <Modal
        open={showWalkinModal}
        title="Book Walk-in / Offline Appointment"
        onClose={() => setShowWalkinModal(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowWalkinModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleWalkinSubmit}
              disabled={
                walkinSubmitting ||
                !selectedServiceId ||
                !walkinDate ||
                !selectedWalkinSlot ||
                (!selectedCustomerId && !showNewCustomerForm)
              }
            >
              {walkinSubmitting ? 'Creating...' : 'Create Appointment'}
            </button>
          </>
        }
      >
        <div className={styles.modalStack}>
          {/* Customer Selection */}
          <div className="form-group">
            <label className="form-label">
              Client Details
            </label>
            {!showNewCustomerForm ? (
              <>
                {selectedCustomerId ? (
                  <div className={styles.selectedClientBadge}>
                    <span>
                      <i className="fa-solid fa-user-check" />{' '}
                      {selectedCustomer
                        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} (${selectedCustomer.email})`
                        : 'Customer Selected'}
                    </span>
                    <button
                      type="button"
                      className={styles.removeClientBtn}
                      onClick={() => setSelectedCustomerId('')}
                      aria-label="Remove selection"
                    >
                      <i className="fa-solid fa-circle-xmark" />
                    </button>
                  </div>
                ) : (
                  <div className={styles.autocompleteContainer}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Search existing customer by name or email..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                    {filteredCustomers.length > 0 && (
                      <div className={styles.autocompleteDropdown}>
                        {filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            className={styles.autocompleteItem}
                            onClick={() => selectCustomer(c)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') selectCustomer(c);
                            }}
                          >
                            <strong>{c.firstName} {c.lastName}</strong> · <small>{c.email}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.clientToggle}>
                  <span className={styles.clientToggleText}>Client not registered yet?</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      setShowNewCustomerForm(true);
                      setSelectedCustomerId('');
                    }}
                  >
                    <i className="fa-solid fa-user-plus" /> Add New Client
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div className={styles.inlineForm}>
                  <div className={styles.inlineFormTitle}>Register Walk-in Client</div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-first-name">
              First name *
            </label>
                    <input
                      id="client-first-name"
                      type="text"
                      className="input-field"
                      required
                      value={newCustomer.firstName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-last-name">
              Last name *
            </label>
                    <input
                      id="client-last-name"
                      type="text"
                      className="input-field"
                      required
                      value={newCustomer.lastName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" htmlFor="client-email">
              Email address *
            </label>
                    <input
                      id="client-email"
                      type="email"
                      className="input-field"
                      required
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" htmlFor="client-phone">
              Phone number
            </label>
                    <input
                      id="client-phone"
                      type="tel"
                      className="input-field"
                      value={newCustomer.phoneNumber}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className={styles.clientToggle}>
                  <span className={styles.clientToggleText}>Or search existing client:</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setShowNewCustomerForm(false)}
                  >
                    <i className="fa-solid fa-magnifying-glass" /> Search Clients
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Service Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="walkin-service">
              Service *
            </label>
            <CustomSelect
              id="walkin-service"
              options={services.map((s) => ({
                value: s.id.toString(),
                label: s.name,
                sublabel: `${s.durationMinutes} min`,
              }))}
              value={selectedServiceId}
              onChange={setSelectedServiceId}
              placeholder="Select service..."
              searchable={true}
            />
          </div>

          {/* Specialist / Staff Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="walkin-staff">
              Specialist (Optional)
            </label>
            <CustomSelect
              id="walkin-staff"
              options={[
                { value: 'any', label: 'Any Available Specialist' },
                ...branchStaff.map((st: any) => ({
                  value: st.id.toString(),
                  label: st.displayName || st.name,
                  sublabel: st.designation || '',
                })),
              ]}
              value={selectedStaffId || 'any'}
              onChange={setSelectedStaffId}
              placeholder="Select specialist..."
              searchable={true}
            />
          </div>

          {/* Date Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="walkin-date">
              Appointment Date *
            </label>
            <CustomDatePicker
              id="walkin-date"
              value={walkinDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={setWalkinDate}
            />
          </div>

          {/* Slots Grid */}
          <div className="form-group">
            <label className="form-label">
              Available Slots *
            </label>
            {walkinSlotsLoading ? (
              <Skeleton variant="row" count={2} />
            ) : !selectedServiceId ? (
              <p className={styles.muted}>Please select a service first to check slots.</p>
            ) : walkinSlots.length === 0 ? (
              <p className={styles.muted}>No slots available for this service on the selected date.</p>
            ) : (
              <div className={styles.slotGrid}>
                {walkinSlots.map((slot) => {
                  const isSelected = selectedWalkinSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`${styles.slotBtn} ${isSelected ? styles.slotSelected : ''}`}
                      onClick={() => setSelectedWalkinSlot(slot)}
                    >
                      {slot.substring(0, 5)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="walkin-notes">
              Client / Internal Notes
            </label>
            <textarea
              id="walkin-notes"
              className="input-field"
              rows={3}
              placeholder="Add client preferences or notes about this appointment..."
              value={walkinNotes}
              onChange={(e) => setWalkinNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
