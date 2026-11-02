import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export type BookingStep = 'service' | 'details' | 'schedule' | 'confirm';

export const ANY_STAFF_ID = 'none';

export const BOOKING_STEPS: { id: BookingStep; label: string }[] = [
  { id: 'service', label: 'Service' },
  { id: 'details', label: 'Specialist' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'confirm', label: 'Confirm' },
];

export interface BookingFlowState {
  step: BookingStep;
  serviceId: string;
  branchId: string;
  staffId: string;
  date: string;
  slot: string;
  customerPackageId?: string;
}

export function defaultBookingState(): BookingFlowState {
  return {
    step: 'service',
    serviceId: '',
    branchId: '',
    staffId: '',
    date: '',
    slot: '',
    customerPackageId: '',
  };
}

export function bookingFlowEqual(a: BookingFlowState, b: BookingFlowState): boolean {
  return (
    a.step === b.step &&
    a.serviceId === b.serviceId &&
    a.branchId === b.branchId &&
    a.staffId === b.staffId &&
    a.date === b.date &&
    a.slot === b.slot &&
    (a.customerPackageId || '') === (b.customerPackageId || '')
  );
}

export function isAnyStaff(staffId: string): boolean {
  return staffId === ANY_STAFF_ID;
}

export function dedicatedStaffId(staffId: string): string | null {
  return /^\d+$/.test(staffId) ? staffId : null;
}

export function isStaffChosen(staffId: string): boolean {
  return isAnyStaff(staffId) || dedicatedStaffId(staffId) != null;
}

export function parseBookingSearchParams(params: URLSearchParams): BookingFlowState {
  const stepRaw = params.get('step');
  const step: BookingStep =
    stepRaw === 'details' || stepRaw === 'schedule' || stepRaw === 'confirm' ? stepRaw : 'service';

  const staffRaw = params.get('staffId');
  return {
    step,
    serviceId: params.get('serviceId') || '',
    branchId: params.get('branchId') || '',
    staffId: staffRaw === ANY_STAFF_ID ? ANY_STAFF_ID : staffRaw || '',
    date: params.get('date') || '',
    slot: params.get('slot') || '',
    customerPackageId: params.get('customerPackageId') || '',
  };
}

export function buildBookingHref(businessId: string | number, state: Partial<BookingFlowState>): string {
  const params = new URLSearchParams();
  const step = state.step || 'service';
  params.set('step', step);
  if (state.serviceId) params.set('serviceId', state.serviceId);
  if (state.branchId) params.set('branchId', state.branchId);
  if (state.staffId) params.set('staffId', state.staffId);
  if (state.date) params.set('date', state.date);
  if (state.slot) params.set('slot', state.slot);
  if (state.customerPackageId) params.set('customerPackageId', state.customerPackageId);
  return `/profile/book/${businessId}?${params.toString()}`;
}

export function buildBookingConfirmationHref(
  businessId: string | number,
  bookingId: number,
  paymentMethod?: string
): string {
  const params = new URLSearchParams({ bookingId: String(bookingId) });
  if (paymentMethod) params.set('payment', paymentMethod);
  return `/profile/book/${businessId}/confirmation?${params.toString()}`;
}

export function stepIndex(step: BookingStep): number {
  return BOOKING_STEPS.findIndex((s) => s.id === step);
}

export function previousStep(step: BookingStep): BookingStep | null {
  const idx = stepIndex(step);
  return idx > 0 ? BOOKING_STEPS[idx - 1].id : null;
}

export function nextStep(step: BookingStep): BookingStep | null {
  const idx = stepIndex(step);
  return idx < BOOKING_STEPS.length - 1 ? BOOKING_STEPS[idx + 1].id : null;
}

export interface StepValidation {
  valid: boolean;
  message?: string;
}

export function validateStep(step: BookingStep, state: BookingFlowState): StepValidation {
  switch (step) {
    case 'service':
      if (!state.serviceId) return { valid: false, message: 'Please select a service.' };
      return { valid: true };
    case 'details':
      if (!state.serviceId) return { valid: false, message: 'Please select a service first.' };
      if (!state.branchId) return { valid: false, message: 'Please select a location.' };
      if (!isStaffChosen(state.staffId)) {
        return { valid: false, message: 'Choose Any available, or pick a specialist.' };
      }
      return { valid: true };
    case 'schedule':
      if (!state.serviceId || !state.branchId) {
        return { valid: false, message: 'Complete service and location first.' };
      }
      if (!isStaffChosen(state.staffId)) {
        return { valid: false, message: 'Choose Any available, or pick a specialist first.' };
      }
      if (!state.date) return { valid: false, message: 'Please select a date.' };
      if (!state.slot) return { valid: false, message: 'Please select a time slot.' };
      return { valid: true };
    case 'confirm':
      if (!validateStep('schedule', state).valid) {
        return { valid: false, message: 'Please complete scheduling first.' };
      }
      return { valid: true };
    default:
      return { valid: false };
  }
}

/** Earliest step the user must complete given current selections. */
export function earliestIncompleteStep(state: BookingFlowState): BookingStep {
  if (!state.serviceId) return 'service';
  if (!state.branchId || !isStaffChosen(state.staffId)) return 'details';
  if (!state.date || !state.slot) return 'schedule';
  return 'confirm';
}

export function resolveAllowedStep(requested: BookingStep, state: BookingFlowState): BookingStep {
  const earliest = earliestIncompleteStep(state);
  const requestedIdx = stepIndex(requested);
  const earliestIdx = stepIndex(earliest);
  if (requestedIdx > earliestIdx) return earliest;
  return requested;
}

export function syncBookingUrl(
  router: AppRouterInstance,
  businessId: string | number,
  state: BookingFlowState,
  options?: { replace?: boolean }
): void {
  const href = buildBookingHref(businessId, state);
  if (typeof window !== 'undefined') {
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === href) return;
  }
  if (options?.replace !== false) {
    router.replace(href, { scroll: false });
  } else {
    router.push(href, { scroll: false });
  }
}

export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatFriendlyTime(timeStr: string): string {
  if (!timeStr) return '';
  const h = Number.parseInt(timeStr.split(':')[0], 10);
  const m = timeStr.split(':')[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
}

export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function buildWeekDays(weekStart: Date): { dayNum: number; dateStr: string; label: string; dateObj: Date }[] {
  const days = [];
  const start = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    days.push({
      dayNum: current.getDate(),
      dateStr: toLocalDateStr(current),
      label: current.toLocaleDateString(undefined, { weekday: 'short' }),
      dateObj: current,
    });
  }
  return days;
}

const CONFIRMATION_STORAGE_KEY = 'duemet_booking_confirmation';

export interface BookingConfirmationSnapshot {
  bookingId: number;
  businessId: number;
  businessName: string;
  serviceName: string;
  branchName: string;
  branchAddress?: string;
  staffName?: string;
  bookingTime: string;
  price: number;
  currency?: string;
  paymentMethod: 'ONLINE' | 'VENUE' | 'PACKAGE';
  durationMinutes?: number;
}

export function saveConfirmationSnapshot(snapshot: BookingConfirmationSnapshot): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`${CONFIRMATION_STORAGE_KEY}_${snapshot.bookingId}`, JSON.stringify(snapshot));
}

export function loadConfirmationSnapshot(bookingId: number): BookingConfirmationSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${CONFIRMATION_STORAGE_KEY}_${bookingId}`);
    if (!raw) return null;
    return JSON.parse(raw) as BookingConfirmationSnapshot;
  } catch {
    return null;
  }
}

const DRAFT_STORAGE_PREFIX = 'duemet_booking_draft_';

export interface BookingDraft {
  paymentMethod?: 'ONLINE' | 'VENUE' | 'PACKAGE';
  clientNotes?: string;
  termsAccepted?: boolean;
  selectedPackageId?: number | null;
}

export function saveBookingDraft(businessId: string | number, draft: BookingDraft): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`${DRAFT_STORAGE_PREFIX}${businessId}`, JSON.stringify(draft));
}

export function loadBookingDraft(businessId: string | number): BookingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${DRAFT_STORAGE_PREFIX}${businessId}`);
    if (!raw) return null;
    return JSON.parse(raw) as BookingDraft;
  } catch {
    return null;
  }
}

export function clearBookingDraft(businessId: string | number): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${businessId}`);
}
