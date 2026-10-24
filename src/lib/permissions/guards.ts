import { NextRequest } from 'next/server';
import { requireAuth as baseRequireAuth, AuthContext } from '@/lib/authGuard';
import { ForbiddenError } from '@/lib/errors';
import { RoleType, PermissionCode, ROLE_PERMISSIONS } from '@/lib/permissions';

export type { AuthContext };

/**
 * Ensures user is authenticated. Throws UnauthorizedError (401) if not.
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  return baseRequireAuth(request);
}

/**
 * Ensures user has at least one of the specified roles (or is 'admin').
 * Throws ForbiddenError (403) if denied.
 */
export async function requireRole(
  request: NextRequest,
  ...allowedRoles: RoleType[]
): Promise<AuthContext> {
  const auth = await requireAuth(request);

  if (auth.roles.includes('admin')) {
    return auth;
  }

  const hasRole = auth.roles.some((r) => allowedRoles.includes(r as RoleType));
  if (!hasRole) {
    throw new ForbiddenError(
      `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: [${auth.roles.join(', ')}].`
    );
  }

  return auth;
}

/**
 * Ensures user has a specific granular permission code (or is 'admin').
 * Throws ForbiddenError (403) if denied.
 */
export async function requirePermission(
  request: NextRequest,
  permission: PermissionCode | string
): Promise<AuthContext> {
  const auth = await requireAuth(request);

  if (auth.roles.includes('admin')) {
    return auth;
  }

  // Check explicit permissions attached to user or inherited through roles
  const hasDirectPermission = auth.permissions.includes(permission);
  const hasRolePermission = auth.roles.some((role) => {
    const rolePerms = ROLE_PERMISSIONS[role as RoleType] || [];
    return rolePerms.includes(permission as PermissionCode);
  });

  if (!hasDirectPermission && !hasRolePermission) {
    throw new ForbiddenError(
      `Access denied. Lacks required permission: "${permission}".`
    );
  }

  return auth;
}

/**
 * Prevents non-admins from managing users or modifying privileges.
 */
export async function requireAdmin(request: NextRequest): Promise<AuthContext> {
  const auth = await requireAuth(request);
  if (!auth.roles.includes('admin')) {
    throw new ForbiddenError('Administrative privilege required for this action.');
  }
  return auth;
}
