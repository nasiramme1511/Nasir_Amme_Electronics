import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, generateSessionToken, hashToken } from '@/lib/authCrypto';
import { UnauthorizedError, NotFoundError, ValidationError } from '@/lib/errors';

export const SESSION_DURATION_HOURS = 8;
export const COOKIE_NAME = 'nae_session';

export interface AuthenticatedUser {
  id: string;
  shopId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  roles: string[];
  permissions: string[];
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: AuthenticatedUser;
}

export class AuthService {
  /**
   * Authenticates staff using email and password.
   * On success, creates an 8-hour session record and logs an audit record.
   */
  static async login(
    email: string,
    passwordPlain: string,
    metadata?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<LoginResult> {
    if (!email || !passwordPlain) {
      throw new ValidationError('Email and password are required.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError(`Account is ${user.status}. Please contact the store administrator.`);
    }

    // Verify bcrypt password hash
    const isPasswordValid = await verifyPassword(passwordPlain, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Generate secure session token and hash
    const { rawToken, tokenHash } = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code)
        )
      )
    );

    // Save session & update lastLoginAt atomically
    await prisma.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          userId: user.id,
          tokenHash,
          ipAddress: metadata?.ipAddress ?? null,
          userAgent: metadata?.userAgent ?? null,
          expiresAt,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          shopId: user.shopId,
          actorUserId: user.id,
          entityType: 'User',
          entityId: user.id,
          action: 'LOGIN',
          ipAddress: metadata?.ipAddress ?? null,
          userAgent: metadata?.userAgent ?? null,
          newValues: {
            roles,
            loginTime: new Date().toISOString(),
          },
        },
      });
    });

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      shopId: user.shopId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles,
      permissions,
    };

    return {
      token: rawToken,
      expiresAt,
      user: authenticatedUser,
    };
  }

  /**
   * Validates a raw session token and returns the authenticated user with roles and permissions.
   */
  static async validateSession(rawToken: string): Promise<{
    session: { id: string; expiresAt: Date; userId: string };
    user: AuthenticatedUser;
  }> {
    if (!rawToken || rawToken.trim() === '') {
      throw new UnauthorizedError('Session token is missing.');
    }

    const tokenHash = hashToken(rawToken.trim());

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedError('Session does not exist or has expired.');
    }

    if (session.revokedAt) {
      throw new UnauthorizedError('Session has been revoked.');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedError('Session has expired.');
    }

    if (session.user.status !== 'active') {
      throw new UnauthorizedError('Account is not active.');
    }

    // Update lastSeenAt asynchronously (non-blocking)
    prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    }).catch(() => {});

    const roles = session.user.userRoles.map((ur) => ur.role.code);
    const permissions = Array.from(
      new Set(
        session.user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code)
        )
      )
    );

    const authenticatedUser: AuthenticatedUser = {
      id: session.user.id,
      shopId: session.user.shopId,
      fullName: session.user.fullName,
      email: session.user.email,
      phone: session.user.phone,
      status: session.user.status,
      roles,
      permissions,
    };

    return {
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        userId: session.userId,
      },
      user: authenticatedUser,
    };
  }

  /**
   * Revokes a single session by raw token (Logout).
   */
  static async logout(rawToken: string): Promise<void> {
    if (!rawToken) return;
    const tokenHash = hashToken(rawToken.trim());

    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes all active sessions for a given user.
   */
  static async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  /**
   * Secure account-provisioning helper: sets and hashes a temporary or new password.
   */
  static async provisionPassword(identifier: string, plainPassword: string): Promise<void> {
    if (!plainPassword || plainPassword.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long.');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: identifier }, { email: identifier.toLowerCase().trim() }],
      },
    });

    if (!user) {
      throw new NotFoundError('User', identifier);
    }

    const hashedPassword = await hashPassword(plainPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      });

      // Invalidate existing sessions for security
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          shopId: user.shopId,
          actorUserId: user.id,
          entityType: 'User',
          entityId: user.id,
          action: 'PASSWORD_RESET',
          newValues: {
            updatedAt: new Date().toISOString(),
          },
        },
      });
    });
  }
}
