/** Build a login URL that returns the user to the page they were on. */
export function loginHref(returnUrl: string): string {
  return `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}

/** Build a register URL that returns the user after account creation. */
export function registerHref(
  returnUrl: string,
  role: 'customer' | 'business' | 'individual' = 'customer'
): string {
  const params = new URLSearchParams({ role });
  params.set('returnUrl', returnUrl);
  return `/auth/register?${params.toString()}`;
}

/** Current in-app path including query string (browser only). */
export function currentReturnUrl(): string {
  if (typeof window === 'undefined') return '/profile/explore';
  return `${window.location.pathname}${window.location.search}`;
}

/** Safe in-app path only (blocks protocol-relative / external URLs). */
export function safeReturnUrl(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}

export type ProviderSessionHints = {
  listingMode?: string | null;
  providerIntent?: string | null;
  onboardingState?: string | null;
  providerWorkspace?: boolean | null;
};

export function isIndividualProvider(hints: ProviderSessionHints): boolean {
  if (hints.listingMode === 'INDIVIDUAL') return true;
  return hints.providerIntent === 'INDIVIDUAL' && !hints.listingMode;
}

export function providerHomePath(hints: ProviderSessionHints): string {
  if (hints.listingMode === 'INDIVIDUAL') {
    const state = (hints.onboardingState || '').toUpperCase();
    // Profile captured at registration — finish areas/services/hours, then dashboard
    if (!state || state === 'STARTED' || state === 'PROFILE_COMPLETE') {
      return '/provider/onboarding';
    }
    return '/provider/dashboard';
  }
  if (hints.providerIntent === 'INDIVIDUAL' && !hints.providerWorkspace) {
    return '/provider/onboarding';
  }
  return '/business/dashboard';
}

export function dashboardRouteForRole(role: string, hints: ProviderSessionHints = {}): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin/dashboard';
    case 'BUSINESS_OWNER':
    case 'BUSINESS_STAFF':
      return providerHomePath(hints);
    default:
      if (hints.providerIntent === 'INDIVIDUAL') {
        return providerHomePath(hints);
      }
      return '/profile/explore';
  }
}

function isBookingReturnUrl(path: string): boolean {
  return path.startsWith('/profile/book/');
}

/**
 * Where to send a user after login/register.
 */
export function destinationAfterAuth(
  role: string,
  rawReturn: string | null,
  hints: ProviderSessionHints = {}
): string {
  const dashboard = dashboardRouteForRole(role, hints);
  const returnUrl = safeReturnUrl(rawReturn, dashboard);
  if (role === 'SUPER_ADMIN') {
    return dashboard;
  }
  if (isIndividualProvider(hints)) {
    return isBookingReturnUrl(returnUrl) ? returnUrl : dashboard;
  }
  if (role === 'BUSINESS_OWNER' || role === 'BUSINESS_STAFF') {
    return isBookingReturnUrl(returnUrl) ? returnUrl : dashboard;
  }
  if (isBookingReturnUrl(returnUrl)) {
    return returnUrl;
  }
  if (!rawReturn || returnUrl === '/profile/explore') {
    return '/onboarding';
  }
  return returnUrl;
}

/** Map /business/* paths to /provider/* for individuals. */
export function businessPathToProvider(pathname: string): string {
  if (pathname.startsWith('/business/onboarding/individual')) return '/provider/onboarding';
  if (pathname === '/business' || pathname === '/business/') return '/provider/dashboard';
  if (pathname.startsWith('/business/')) {
    return `/provider/${pathname.slice('/business/'.length)}`;
  }
  return '/provider/dashboard';
}
