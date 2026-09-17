export type UserRole =
  | 'CUSTOMER'
  | 'BUSINESS_OWNER'
  | 'BUSINESS_STAFF'
  | 'SUPER_ADMIN'
  | 'ADMIN';

export type BusinessStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'IN_PROGRESS'
  | 'RESCHEDULED';

export interface Category {
  id: number;
  name: string;
  slug: string;
  iconClass?: string;
  subcategories?: Category[];
}

export interface UserSummary {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: UserRole;
}

export interface Business {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string;
  status: BusinessStatus;
  verified: boolean;
  commissionRate?: number;
  rating?: number;
  rejectionReason?: string;
  slug?: string;
  registrationNumber?: string;
  galleryUrls?: string;
  currency?: string;
  countryCode?: string;
  primaryCategory?: Category | null;
  secondaryCategories?: Category[];
  listingMode?: string;
  serviceMode?: string;
  opsStatus?: string;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  phoneNumber?: string;
  business: Business;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  countryCode?: string;
  region?: string;
  city?: string;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  bufferMinutes?: number;
  currency?: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime?: string;
  basePrice?: number;
  price?: number;
  priceMultiplier?: number;
  pricingKind?: 'STANDARD' | 'PEAK' | 'OFF_PEAK';
  pricingLabel?: string | null;
  currency?: string;
  available?: boolean;
  availability?: 'AVAILABLE' | 'BOOKED';
  availableStaff?: { id: number; name: string }[];
}

export interface Staff {
  id: number;
  name: string;
  designation?: string;
  specialty?: string;
  branch: { id: number; name: string };
  rating?: number;
  services?: { id: number; name: string }[];
}

export interface Booking {
  id: number;
  customer: {
    id: number;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string;
    };
  };
  branch: Branch;
  service: Service;
  staff?: Staff;
  bookingTime: string;
  endTime: string;
  status: BookingStatus;
  price: number;
  paymentStatus?: string;
  clientNotes?: string;
  currency?: string;
}

export interface WorkingHour {
  id: number;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  closed: boolean;
  slotStepMinutes?: number;
  intervals?: { id?: number; startTime: string; endTime: string; sortOrder?: number }[];
  breaks?: { id: number; startTime: string; endTime: string }[];
}

export interface Review {
  id: number;
  customer: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ServicePackage {
  id: number;
  name: string;
  description?: string;
  price: number;
  sessionsCount: number;
  expiryDays: number;
  currency?: string;
  services?: Service[];
  business?: { id: number; name: string };
}

export interface CustomerPackage {
  id: number;
  servicePackage: ServicePackage;
  sessionsRemaining: number;
  expiresAt: string | null;
  status: string;
  createdAt: string;
}

export interface PublicBusinessProfile {
  business: Business;
  branches: Branch[];
  services: Service[];
  staff: Staff[];
  reviews: Review[];
  packages?: ServicePackage[];
  averageRating: number;
}

/** Payload for POST /api/bookings */
export interface BookingRequest {
  branchId: number;
  serviceId: number;
  staffId?: number | null;
  bookingTime: string;
  customerId?: number;
  clientNotes?: string | null;
  customerPackageId?: number | null;
  /** Frontend confirm-step choice; online pay uses checkout after create */
  paymentMethod?: 'VENUE' | 'ONLINE';
}

export interface ApiError {
  code?: string;
  message?: string;
}
