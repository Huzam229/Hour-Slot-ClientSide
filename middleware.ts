import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];
const STORAGE_KEY = 'duemet_user_session';

function isPublicBrowse(pathname: string): boolean {
  return (
    pathname === '/profile/explore' ||
    pathname.startsWith('/profile/explore/') ||
    pathname.startsWith('/profile/business/') ||
    pathname.startsWith('/profile/book/') ||
    pathname.startsWith('/b/')
  );
}

function isProtectedApp(pathname: string): boolean {
  if (isPublicBrowse(pathname)) return false;
  return (
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/business' ||
    pathname.startsWith('/business/') ||
    pathname === '/provider' ||
    pathname.startsWith('/provider/') ||
    pathname === '/onboarding' ||
    pathname.startsWith('/onboarding/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  );
}

function providerAllowed(session: {
  role?: string | null;
  listingMode?: string | null;
  providerIntent?: string | null;
}): boolean {
  if (session.role === 'BUSINESS_OWNER' && session.listingMode === 'INDIVIDUAL') return true;
  if (session.providerIntent === 'INDIVIDUAL') return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const sessionCookie = request.cookies.get(STORAGE_KEY)?.value;
  let isAuthenticated = false;
  let userRole: string | null = null;
  let listingMode: string | null = null;
  let providerIntent: string | null = null;

  if (sessionCookie) {
    try {
      const session = JSON.parse(decodeURIComponent(sessionCookie));
      isAuthenticated = !!session?.id;
      userRole = session?.role ?? null;
      listingMode = session?.listingMode ?? null;
      providerIntent = session?.providerIntent ?? null;
    } catch {
      // ignore bad cookies
    }
  }

  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (isAuthenticated) {
      if (userRole === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      if (listingMode === 'INDIVIDUAL' || providerIntent === 'INDIVIDUAL') {
        return NextResponse.redirect(new URL(
          listingMode === 'INDIVIDUAL' ? '/provider/dashboard' : '/provider/onboarding',
          request.url
        ));
      }
      if (userRole === 'BUSINESS_OWNER' || userRole === 'BUSINESS_STAFF') {
        return NextResponse.redirect(new URL('/business/dashboard', request.url));
      }
      const returnUrl = request.nextUrl.searchParams.get('returnUrl');
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        return NextResponse.redirect(new URL(returnUrl, request.url));
      }
      return NextResponse.redirect(new URL('/profile/explore', request.url));
    }
    return NextResponse.next();
  }

  if (isAuthenticated && userRole === 'SUPER_ADMIN' && pathname.startsWith('/profile')) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  if (isProtectedApp(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('returnUrl', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith('/business')) {
      if (listingMode === 'INDIVIDUAL' || (providerIntent === 'INDIVIDUAL' && userRole === 'CUSTOMER')) {
        const mapped = pathname.replace(/^\/business/, '/provider').replace('/onboarding/individual', '/onboarding');
        return NextResponse.redirect(new URL(mapped === '/provider' ? '/provider/dashboard' : mapped, request.url));
      }
      if (userRole !== 'BUSINESS_OWNER' && userRole !== 'BUSINESS_STAFF') {
        return NextResponse.redirect(new URL('/profile/explore', request.url));
      }
    }

    if (pathname.startsWith('/provider')) {
      if (!providerAllowed({ role: userRole, listingMode, providerIntent })) {
        if (userRole === 'BUSINESS_OWNER' || userRole === 'BUSINESS_STAFF') {
          return NextResponse.redirect(new URL('/business/dashboard', request.url));
        }
        return NextResponse.redirect(new URL('/profile/explore', request.url));
      }
    }

    if (pathname.startsWith('/admin') && userRole !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/profile/explore', request.url));
    }

    if (pathname.startsWith('/profile') && userRole === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon-.*\\.png|duemet.*\\.png|icons/|brand/|uploads).*)',
  ],
};
