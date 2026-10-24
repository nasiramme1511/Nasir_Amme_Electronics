import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/services/authService';
import { ROLE_COOKIE_NAME } from '@/lib/authGuard';
import { getDashboardRouteForRole, isRouteAllowedForRole, RoleType } from '@/lib/permissions';

const PUBLIC_PREFIXES = [
  '/_next',
  '/favicon.ico',
  '/logo',
  '/public',
  '/hud-vortex.png',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/recovery',
  '/api/auth/reset',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and auth entrypoints
  if (
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.includes('.') // static image / icon / asset
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(sessionToken && sessionToken.trim().length > 0);

  const rawRole = request.cookies.get(ROLE_COOKIE_NAME)?.value;
  const normalizedRole = rawRole ? (rawRole.toLowerCase().trim() as RoleType) : undefined;
  const validRoles: RoleType[] = ['admin', 'manager', 'cashier', 'stock_keeper'];
  // Default to lowest-privilege role 'cashier' if unverified or missing (never default to admin)
  const userRole: RoleType = validRoles.includes(normalizedRole as RoleType)
    ? (normalizedRole as RoleType)
    : 'cashier';

  // 2. Handle /login page
  if (pathname === '/login') {
    const isExplicitLogout =
      request.nextUrl.searchParams.has('logged_out') ||
      request.nextUrl.searchParams.has('logout');

    if (isExplicitLogout) {
      const response = NextResponse.next();
      response.cookies.delete(COOKIE_NAME);
      response.cookies.delete(ROLE_COOKIE_NAME);
      return response;
    }

    return NextResponse.next();
  }

  // 3. Unauthenticated requests to protected paths
  if (!isAuthenticated) {
    // API routes return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid session cookie required.' },
        { status: 401 }
      );
    }

    // Page routes redirect to /login
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 4. Redirects from /admin, /dashboard, and legacy routes to canonical dashboards
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return NextResponse.redirect(new URL(getDashboardRouteForRole(userRole), request.url));
  }
  if (pathname === '/manager' || pathname === '/manager/') {
    return NextResponse.redirect(new URL('/manager/dashboard', request.url));
  }
  if (pathname === '/cashier' || pathname === '/cashier/') {
    return NextResponse.redirect(new URL('/cashier/dashboard', request.url));
  }
  if (pathname === '/stock-keeper' || pathname === '/stock-keeper/') {
    return NextResponse.redirect(new URL('/stock-keeper/dashboard', request.url));
  }
  if (pathname === '/dashboard/admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }
  if (pathname === '/dashboard/manager') {
    return NextResponse.redirect(new URL('/manager/dashboard', request.url));
  }
  if (pathname === '/dashboard/cashier') {
    return NextResponse.redirect(new URL('/cashier/dashboard', request.url));
  }
  if (pathname === '/dashboard/stock-keeper') {
    return NextResponse.redirect(new URL('/stock-keeper/dashboard', request.url));
  }

  // 5. Root path (/) redirects to user's authorized role dashboard
  if (pathname === '/') {
    const destination = getDashboardRouteForRole(userRole);
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 6. Enforce Role-Based Route Boundaries for UI Page navigation
  // (API route handlers enforce authoritative server-side RBAC using requirePermission against PostgreSQL)
  if (!pathname.startsWith('/api/')) {
    const isAllowed = isRouteAllowedForRole(pathname, [userRole]);
    if (!isAllowed) {
      const fallbackDashboard = getDashboardRouteForRole(userRole);
      return NextResponse.redirect(new URL(fallbackDashboard, request.url));
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, fonts
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
