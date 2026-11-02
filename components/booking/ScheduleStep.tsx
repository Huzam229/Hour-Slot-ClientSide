'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { parseSlots, type AvailableSlot } from '@/lib/slots';
import {
  buildWeekDays,
  dedicatedStaffId,
  formatFriendlyTime,
  isAnyStaff,
  startOfWeekMonday,
  toLocalDateStr,
} from '@/lib/booking-flow';
import { formatMoney } from '@/lib/money';
import Skeleton from '@/components/Skeleton';
import CustomDatePicker from '@/components/CustomDatePicker';
import styles from './booking.module.css';

interface ScheduleStepProps {
  branchId: string;
  serviceId: string;
  staffId: string;
  staffName?: string | null;
  selectedDate: string;
  selectedSlot: string;
  currency?: string;
  onDateChange: (date: string) => void;
  onSlotChange: (slot: string, quoted?: AvailableSlot) => void;
  compact?: boolean;
  /** Offered when every slot on the chosen day is taken; resolves to a message to show. */
  onJoinWaitlist?: () => Promise<string>;
}

export default function ScheduleStep({
  branchId,
  serviceId,
  staffId,
  staffName,
  selectedDate,
  selectedSlot,
  currency,
  onDateChange,
  onSlotChange,
  compact = false,
  onJoinWaitlist,
}: ScheduleStepProps) {
  const [waitlistNote, setWaitlistNote] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const autoPickedDate = useRef(false);

  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);

  useEffect(() => {
    autoPickedDate.current = false;
  }, [branchId, serviceId, staffId]);

  useEffect(() => {
    if (selectedDate) {
      autoPickedDate.current = true;
      const selected = new Date(`${selectedDate}T12:00:00`);
      if (!Number.isNaN(selected.getTime())) {
        const monday = startOfWeekMonday(selected);
        setWeekStart((prev) => (prev.getTime() === monday.getTime() ? prev : monday));
      }
      return;
    }
    if (autoPickedDate.current || weekDays.length === 0) return;
    const firstFuture = weekDays.find((d) => d.dateStr >= todayStr);
    if (!firstFuture) return;
    autoPickedDate.current = true;
    onDateChange(firstFuture.dateStr);
  }, [weekDays, selectedDate, todayStr, onDateChange]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!branchId || !serviceId || !selectedDate) {
        setAvailableSlots((prev) => (prev.length === 0 ? prev : []));
        return;
      }
      setSlotsLoading(true);
      setSlotError(null);
      try {
        let url = `/api/public/branches/${branchId}/slots?serviceId=${serviceId}&date=${selectedDate}`;
        const dedicated = dedicatedStaffId(staffId);
        if (dedicated) url += `&staffId=${dedicated}`;
        const slots = await apiFetch<unknown>(url, { skipAuth: true });
        setAvailableSlots(parseSlots(slots));
      } catch (err: unknown) {
        const e = err as { message?: string };
        setAvailableSlots([]);
        setSlotError(e?.message || 'Could not load available slots.');
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [branchId, serviceId, staffId, selectedDate]);

  useEffect(() => {
    if (!selectedSlot || slotsLoading) return;
    const match = availableSlots.find((s) => s.startTime === selectedSlot);
    if (match && match.available === false) {
      onSlotChange('');
    }
  }, [availableSlots, selectedSlot, slotsLoading, onSlotChange]);

  const money = (amount: number, code?: string) => formatMoney(amount, code || currency);
  const dedicated = dedicatedStaffId(staffId);
  const choseAny = isAnyStaff(staffId) || !dedicated;
  const selectedSlotStaff = availableSlots.find((s) => s.startTime === selectedSlot && s.available !== false);
  const selectedSlotNames = (selectedSlotStaff?.availableStaff || []).map((s) => s.name).filter(Boolean);
  const selectionLabel = choseAny
    ? selectedSlotNames.length > 0
      ? `Any available specialist (${selectedSlotNames.join(' · ')} free)`
      : 'Any available specialist'
    : staffName || 'Selected specialist';

  const monthLabel =
    weekDays.length > 0
      ? weekDays[0].dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : '';

  const selectDate = (dateStr: string) => {
    if (!dateStr || dateStr < todayStr) return;
    const picked = new Date(`${dateStr}T12:00:00`);
    if (!Number.isNaN(picked.getTime())) {
      setWeekStart(startOfWeekMonday(picked));
    }
    onDateChange(dateStr);
    onSlotChange('');
  };

  const handlePrevWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    const prevMonday = startOfWeekMonday(prev);
    setWeekStart(prevMonday < today ? today : prevMonday);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  return (
    <div className={compact ? styles.compactMode : undefined}>
      <div className={styles.staffChoiceBanner}>
        {choseAny ? (
          <p>
            You chose <strong>Any available specialist</strong>. Open times show who is free; we will assign one of
            them when you confirm.
          </p>
        ) : (
          <p>
            You chose <strong>{staffName || 'this specialist'}</strong>. Only their open times are listed.
          </p>
        )}
      </div>
      <div className={styles.calendarCard}>
        <div className={styles.calHead}>
          <div className={styles.calHeadLeft}>
            <h3>{monthLabel}</h3>
            <div className={styles.calPickerWrap}>
              <CustomDatePicker
                value={selectedDate}
                min={todayStr}
                placeholder="Pick a date"
                onChange={selectDate}
              />
            </div>
          </div>
          <div className={styles.calArrows}>
            <button type="button" onClick={handlePrevWeek} aria-label="Previous week">
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button type="button" onClick={handleNextWeek} aria-label="Next week">
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>

        <div className={styles.dateStrip}>
          {weekDays.map((d) => {
            const isPast = d.dateStr < todayStr;
            const on = selectedDate === d.dateStr;
            return (
              <button
                key={d.dateStr}
                type="button"
                disabled={isPast}
                className={`${styles.dateCell} ${on ? styles.dateCellOn : ''} ${isPast ? styles.dateCellPast : ''}`}
                onClick={() => {
                  if (isPast) return;
                  selectDate(d.dateStr);
                }}
              >
                <span>{d.label}</span>
                <strong>{d.dayNum}</strong>
              </button>
            );
          })}
        </div>

        <div className={styles.slotLegend}>
          <span>
            <i className={styles.legendDot} /> Open
          </span>
          <span>
            <i className={`${styles.legendDot} ${styles.legendBooked}`} /> Already booked
          </span>
          <span>
            <i className={`${styles.legendDot} ${styles.legendPeak}`} /> Peak
          </span>
          <span>
            <i className={`${styles.legendDot} ${styles.legendOffPeak}`} /> Off-peak
          </span>
        </div>

        {slotError && (
          <p className={styles.noSlots} style={{ color: 'var(--accent-red)', marginBottom: 12 }}>
            {slotError}
          </p>
        )}

        {!slotsLoading && onJoinWaitlist && availableSlots.length > 0 &&
          availableSlots.every((slot) => slot.available === false) && (
          <div className={styles.noSlots} style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 8px' }}>This day is fully booked.</p>
            {waitlistNote ? (
              <p style={{ margin: 0 }}>{waitlistNote}</p>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={joining}
                onClick={async () => {
                  setJoining(true);
                  try {
                    setWaitlistNote(await onJoinWaitlist());
                  } catch (e: unknown) {
                    setWaitlistNote((e as { message?: string })?.message || 'Sign in to join the waitlist.');
                  } finally {
                    setJoining(false);
                  }
                }}
              >
                <i className="fa-solid fa-bell" /> Notify me if a slot opens
              </button>
            )}
          </div>
        )}

        {slotsLoading ? (
          <Skeleton variant="row" count={3} />
        ) : availableSlots.length === 0 ? (
          <p className={styles.noSlots}>
            No open slots for this date. Try another day or a different specialist.
          </p>
        ) : (
          <div className={styles.slotGrid}>
            {availableSlots.map((slot) => {
              const kind = slot.pricingKind;
              const booked = slot.available === false;
              const on = !booked && selectedSlot === slot.startTime;
              const names = (slot.availableStaff || []).map((s) => s.name).filter(Boolean);
              const staffLabel = choseAny
                ? names.length === 0
                  ? 'Any available'
                  : names.length <= 3
                    ? names.join(' · ')
                    : `${names.length} specialists free`
                : staffName || names[0] || null;
              return (
                <button
                  key={slot.startTime}
                  type="button"
                  disabled={booked}
                  className={`${styles.slotBtn} ${on ? styles.slotBtnOn : ''} ${
                    booked ? styles.slotBtnBooked : ''
                  } ${kind === 'PEAK' ? styles.slotBtnPeak : kind === 'OFF_PEAK' ? styles.slotBtnOffPeak : ''}`}
                  onClick={() => {
                    if (booked) return;
                    onSlotChange(slot.startTime, slot);
                  }}
                >
                  <span>{formatFriendlyTime(slot.startTime)}</span>
                  {booked ? (
                    <em className={styles.slotBookedLabel}>Already booked</em>
                  ) : (
                    <>
                      {slot.price != null && <em className={styles.slotPrice}>{money(slot.price, slot.currency)}</em>}
                      {staffLabel && <strong className={styles.slotStaff}>{staffLabel}</strong>}
                      {slot.pricingLabel && kind !== 'STANDARD' && (
                        <strong className={styles.slotBadge}>{slot.pricingLabel}</strong>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selectedSlot && !slotsLoading && (
          <p className={styles.slotChoiceNote}>
            Selected {formatFriendlyTime(selectedSlot)} · {selectionLabel}
          </p>
        )}
      </div>
    </div>
  );
}
