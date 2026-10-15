import { NextRequest, NextResponse } from 'next/server';
import { AuthService, COOKIE_NAME, AuthenticatedUser } from '@/services/authService';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

export interface AuthContext {
  user: AuthenticatedUser;
  session: { id: string; expiresAt: Date; userId: string };
  roles: string[];
  permissions: string[];
}

/**
 * Extracts raw session token from Cookie or Authorization header.
 */
export function extractToken(request: NextRequest): string | null {
  // 1. Check HttpOnly cookie
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  // 2. Check Authorization: Bearer <token>
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Validates request authentication and returns the AuthContext.
 * Throws UnauthorizedError (401) if not authenticated.
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const token = extractToken(request);
  if (!token) {
    throw new UnauthorizedError('Authentication required. No session token provided.');
  }

  const { session, user } = await AuthService.validateSession(token);
  return {
    user,
    session,
    roles: user.roles,
    permissions: user.permissions,
  };
}

/**
 * Requires authentication AND a specific granular permission code.
 * Throws UnauthorizedError (401) or ForbiddenError (403).
 */
export async function requirePermission(
  request: NextRequest,
  permissionCode: string
): Promise<AuthContext> {
  const auth = await requireAuth(request);

  // Administrators bypass individual permission checks
  if (auth.roles.includes('admin')) {
    return auth;
  }

  if (!auth.permissions.includes(permissionCode)) {
    throw new ForbiddenError(
      `Access denied. Role "${auth.roles.join(', ')}" lacks permission "${permissionCode}".`
    );
  }

  return auth;
}

/**
 * Requires authentication AND at least one of the specified roles.
 * Throws UnauthorizedError (401) or ForbiddenError (403).
 */
export async function requireRole(
  request: NextRequest,
  ...allowedRoles: string[]
): Promise<AuthContext> {
  const auth = await requireAuth(request);

  // Administrators always pass
  if (auth.roles.includes('admin')) {
    return auth;
  }

  const hasRole = auth.roles.some((r) => allowedRoles.includes(r));
  if (!hasRole) {
    throw new ForbiddenError(
      `Access denied. Requires one of [${allowedRoles.join(', ')}], but current role is "${auth.roles.join(', ')}".`
    );
  }

  return auth;
}

/**
 * Attaches the HttpOnly session cookie to an outgoing response.
 */
export function attachSessionCookie(response: NextResponse, token: string, expiresAt: Date): NextResponse {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
  return response;
}

/**
 * Clears the session cookie on an outgoing response.
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });
  return response;
}
