import { prisma } from '@/lib/prisma';
import {
  generateOtpCode,
  hashOtp,
  generateResetToken,
  hashResetToken,
  timingSafeMatch,
  hashPassword,
  verifyPassword,
  maskPhoneNumber,
} from '@/lib/authCrypto';
import { SmsService } from '@/services/smsService';
import { ValidationError, NotFoundError, UnauthorizedError } from '@/lib/errors';

export const OTP_TTL_MINUTES = 15;
export const RESET_TOKEN_TTL_MINUTES = 5;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_ATTEMPTS = 3;

export interface ChallengeInitiationResult {
  success?: boolean;
  ticketId: string;
  challengeId?: string;
  recipientMasked: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
  status: 'PENDING' | 'REVOKED' | 'EXPIRED';
  channel: string;
  // In development only, return correlation ID (never the raw OTP)
  correlationId?: string;
}

export interface ChallengeVerificationResult {
  success: boolean;
  resetToken: string;
  expiresInSeconds: number;
}

export class RecoveryService {
  /**
   * Initiates an OTP recovery challenge.
   * Generates a 6-digit cryptographic code, stores its HMAC digest, and dispatches via SMS.
   */
  static async initiateChallenge(
    email: string,
    metadata?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<ChallengeInitiationResult> {
    if (!email || !email.trim()) {
      throw new ValidationError('Email address is required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        shop: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      // Return a generic response with a fake ticket ID to prevent account enumeration
      const fakeId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        success: true,
        ticketId: fakeId,
        challengeId: fakeId,
        recipientMasked: '+251 9*** ***000',
        expiresInSeconds: OTP_TTL_MINUTES * 60,
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
        status: 'PENDING',
        channel: 'SMS_GATEWAY',
      };
    }

    if (user.status !== 'active') {
      throw new ValidationError('Account is not in active status. Contact administrator.');
    }

    // 1. Resend Cooldown Check (60 seconds)
    const recentChallenge = await prisma.passwordResetChallenge.findFirst({
      where: {
        userId: user.id,
        status: 'PENDING',
        dispatchedAt: {
          gt: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
        },
      },
      orderBy: { dispatchedAt: 'desc' },
    });

    if (recentChallenge) {
      const elapsed = Math.floor((Date.now() - recentChallenge.dispatchedAt.getTime()) / 1000);
      const remaining = Math.max(1, RESEND_COOLDOWN_SECONDS - elapsed);
      throw new ValidationError(
        `Verification code already dispatched. Please wait ${remaining} seconds before requesting a new code.`
      );
    }

    // 2. Invalidate superseded challenges for this user
    await prisma.passwordResetChallenge.updateMany({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'VERIFIED'] },
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    // 3. Generate Cryptographic 6-digit OTP and keyed HMAC digest
    const otpCode = generateOtpCode();
    const otpHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const recipientMasked = maskPhoneNumber(user.phone);
    const correlationId = `CORR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 4. Dispatch via SMS Adapter
    const smsResult = await SmsService.dispatchSms({
      recipientPhone: user.phone || '+251915001122',
      maskedRecipient: recipientMasked,
      messageBody: `Your Nasir Amme Electronics verification code is: ${otpCode}. Valid for ${OTP_TTL_MINUTES} minutes. Do not share this code.`,
      correlationId,
    });

    // 5. Store challenge in PostgreSQL
    const challenge = await prisma.$transaction(async (tx) => {
      const created = await tx.passwordResetChallenge.create({
        data: {
          userId: user.id,
          shopId: user.shopId,
          otpHash,
          status: 'PENDING',
          attempts: 0,
          maxAttempts: MAX_ATTEMPTS,
          expiresAt,
          dispatchChannel: smsResult.channel,
          recipientMasked,
          ipAddress: metadata?.ipAddress ?? null,
          userAgent: metadata?.userAgent ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          shopId: user.shopId,
          actorUserId: user.id,
          entityType: 'PasswordResetChallenge',
          entityId: created.id,
          action: 'OTP_CHALLENGE_ISSUED',
          ipAddress: metadata?.ipAddress ?? null,
          userAgent: metadata?.userAgent ?? null,
          newValues: {
            ticketId: created.id,
            recipientMasked,
            dispatchStatus: smsResult.status,
            channel: smsResult.channel,
            correlationId,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return created;
    });

    return {
      success: true,
      ticketId: challenge.id,
      challengeId: challenge.id,
      recipientMasked,
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      status: 'PENDING',
      channel: smsResult.channel,
      correlationId,
    };
  }

  /**
   * Verifies an OTP code and issues a single-use reset authorization token.
   */
  static async verifyChallenge(
    email: string,
    otpCode: string,
    metadata?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<ChallengeVerificationResult> {
    if (!email || !otpCode) {
      throw new ValidationError('Email and 6-digit verification code are required.');
    }

    const cleanOtp = String(otpCode).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new ValidationError('Verification code must be exactly 6 numeric digits.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new ValidationError('Invalid verification code or expired challenge.');
    }

    // 1. Find latest pending challenge
    const challenge = await prisma.passwordResetChallenge.findFirst({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
      orderBy: { dispatchedAt: 'desc' },
    });

    if (!challenge) {
      throw new ValidationError('No active recovery challenge found. Please request a new code.');
    }

    // 2. Check Expiration
    if (new Date() > challenge.expiresAt) {
      await prisma.passwordResetChallenge.update({
        where: { id: challenge.id },
        data: { status: 'EXPIRED' },
      });
      throw new ValidationError('Verification code has expired. Please request a new code.');
    }

    // 3. Check Attempt Limit
    if (challenge.attempts >= challenge.maxAttempts) {
      await prisma.passwordResetChallenge.update({
        where: { id: challenge.id },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      throw new ValidationError('Security lockout: Max attempts exceeded. Challenge revoked.');
    }

    // 4. Constant-Time HMAC Digest Match
    const candidateHash = hashOtp(cleanOtp);
    const isMatch = timingSafeMatch(challenge.otpHash, candidateHash);

    if (!isMatch) {
      // Atomic conditional update: increment attempt ONLY IF current attempts < maxAttempts and still PENDING
      const updateResult = await prisma.passwordResetChallenge.updateMany({
        where: {
          id: challenge.id,
          status: 'PENDING',
          attempts: { lt: challenge.maxAttempts },
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      // Fetch the latest state
      const freshChallenge = await prisma.passwordResetChallenge.findUnique({
        where: { id: challenge.id },
      });

      const currentAttempts = freshChallenge?.attempts ?? (challenge.attempts + 1);
      const isLockedOut = currentAttempts >= challenge.maxAttempts || updateResult.count === 0;

      if (isLockedOut) {
        await prisma.passwordResetChallenge.updateMany({
          where: { id: challenge.id, status: 'PENDING' },
          data: { status: 'REVOKED', revokedAt: new Date() },
        });
      }

      await prisma.auditLog.create({
        data: {
          shopId: challenge.shopId,
          actorUserId: user.id,
          entityType: 'PasswordResetChallenge',
          entityId: challenge.id,
          action: isLockedOut ? 'OTP_ATTEMPT_LOCKOUT' : 'OTP_VERIFICATION_FAILED',
          ipAddress: metadata?.ipAddress ?? null,
          userAgent: metadata?.userAgent ?? null,
          newValues: {
            ticketId: challenge.id,
            attempts: currentAttempts,
            maxAttempts: challenge.maxAttempts,
            lockedOut: isLockedOut,
          },
        },
      });

      if (isLockedOut) {
        throw new ValidationError(
          'Security Lockout: 3 consecutive failed verification attempts. Challenge has been revoked. Contact administrator.'
        );
      }

      const remaining = Math.max(0, challenge.maxAttempts - currentAttempts);
      throw new ValidationError(`Invalid verification code. ${remaining} attempt(s) remaining.`);
    }

    // 5. Verification Succeeded: Issue single-use reset authorization token (5-min TTL) in transaction
    return prisma.$transaction(async (tx) => {
      const freshChallenge = await tx.passwordResetChallenge.findUnique({
        where: { id: challenge.id },
      });

      if (!freshChallenge || freshChallenge.status !== 'PENDING' || freshChallenge.attempts >= freshChallenge.maxAttempts) {
        throw new ValidationError('Challenge has already been consumed or revoked.');
      }

      const { rawToken, tokenHash } = generateResetToken();
      const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

      await tx.passwordResetChallenge.update({
        where: { id: challenge.id },
        data: {
          status: 'VERIFIED',
          resetTokenHash: tokenHash,
          resetTokenExpiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          shopId: challenge.shopId,
          actorUserId: user.id,
          entityType: 'PasswordResetChallenge',
          entityId: challenge.id,
          action: 'OTP_VERIFIED_SUCCESS',
          ipAddress: metadata?.ipAddress ?? null,
          userAgent: metadata?.userAgent ?? null,
          newValues: {
            ticketId: challenge.id,
            resetTokenExpiresAt: resetTokenExpiresAt.toISOString(),
          },
        },
      });

      return {
        success: true,
        resetToken: rawToken,
        expiresInSeconds: RESET_TOKEN_TTL_MINUTES * 60,
      };
    });
  }

  /**
   * Executes password reset using the single-use reset authorization token.
   * Updates password hash to Argon2id and revokes all active sessions.
   */
  static async executePasswordReset(
    email: string,
    resetToken: string,
    newPasswordPlain: string,
    posPin?: string,
    metadata?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<{ success: boolean; email: string }> {
    if (!email || !resetToken || !newPasswordPlain) {
      throw new ValidationError('Email, reset authorization token, and new password are required.');
    }

    if (newPasswordPlain.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long.');
    }

    // Entropy & Character Class Checks
    const hasUpper = /[A-Z]/.test(newPasswordPlain);
    const hasLower = /[a-z]/.test(newPasswordPlain);
    const hasDigitOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPasswordPlain);
    if (!hasUpper || !hasLower || !hasDigitOrSpecial) {
      throw new ValidationError(
        'Password hygiene policy violation: Password must contain uppercase, lowercase, and at least one number or special character.'
      );
    }

    let hashedPin: string | null = null;
    if (posPin) {
      const cleanPin = String(posPin).trim();
      if (!/^\d{4}$/.test(cleanPin)) {
        throw new ValidationError('POS station PIN must be exactly 4 numeric digits (0000 - 9999).');
      }
      hashedPin = await hashPassword(cleanPin);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new NotFoundError('User', email);
    }

    // Password History: Check against existing password
    if (user.passwordHash) {
      const isReused = await verifyPassword(newPasswordPlain, user.passwordHash);
      if (isReused) {
        throw new ValidationError('Password history violation: You cannot reuse your existing password.');
      }
    }

    const tokenHash = hashResetToken(resetToken);

    return prisma.$transaction(async (tx) => {
      // Find and validate the challenge bound to this token
      const challenge = await tx.passwordResetChallenge.findFirst({
        where: {
          userId: user.id,
          resetTokenHash: tokenHash,
          status: 'VERIFIED',
        },
      });

      if (!challenge) {
        throw new ValidationError('Invalid or already consumed reset authorization token.');
      }

      if (!challenge.resetTokenExpiresAt || new Date() > challenge.resetTokenExpiresAt) {
        await tx.passwordResetChallenge.update({
          where: { id: challenge.id },
          data: { status: 'EXPIRED' },
        });
        throw new ValidationError('Reset authorization has expired. Please restart recovery.');
      }

      // Hash with Argon2id
      const newHash = await hashPassword(newPasswordPlain);

      // Invalidate all active sessions for this user
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      // Update password hash and status
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          ...(hashedPin ? { quickPinHash: hashedPin } : {}),
          status: 'active',
          updatedAt: new Date(),
        },
      });

      // Mark challenge as CONSUMED (Zero-replay policy)
      await tx.passwordResetChallenge.update({
        where: { id: challenge.id },
        data: {
          status: 'CONSUMED',
          consumedAt: new Date(),
        },
      });

      // Audit Log with Redacted Values
      await tx.auditLog.create({
        data: {
          shopId: user.shopId,
          actorUserId: user.id,
          entityType: 'User',
          entityId: user.id,
          action: 'PASSWORD_RESET_COMPLETED',
          ipAddress: metadata?.ipAddress ?? null,
          userAgent: metadata?.userAgent ?? null,
          newValues: {
            ticketId: challenge.id,
            email: user.email,
            method: 'ARGON2ID_OTP_RECOVERY',
            posPinConfigured: Boolean(hashedPin),
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        email: user.email,
      };
    });
  }

  /**
   * Lists administrative recovery tickets for the Admin Recovery Console.
   * Redacts all sensitive hashes and raw codes.
   */
  static async listRecoveryTickets(shopId: string) {
    const challenges = await prisma.passwordResetChallenge.findMany({
      where: { shopId },
      include: {
        user: {
          include: {
            userRoles: { include: { role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const now = new Date();
    return challenges.map((c) => {
      const isLapsed = now > c.expiresAt && c.status === 'PENDING';
      const effectiveStatus = isLapsed ? 'EXPIRED' : c.status;
      const ttlSeconds = Math.max(0, Math.floor((c.expiresAt.getTime() - now.getTime()) / 1000));

      return {
        id: c.id,
        userEmail: c.user.email,
        userName: c.user.fullName,
        role: c.user.userRoles[0]?.role.code || 'cashier',
        recipientMasked: c.recipientMasked || maskPhoneNumber(c.user.phone),
        status: effectiveStatus,
        attempts: c.attempts,
        maxAttempts: c.maxAttempts,
        ttlSeconds,
        channel: c.dispatchChannel,
        createdAt: c.createdAt.toISOString(),
      };
    });
  }

  /**
   * Revokes an outstanding recovery ticket from the Admin Console.
   */
  static async revokeTicket(ticketId: string, adminUserId: string) {
    const challenge = await prisma.passwordResetChallenge.findUnique({
      where: { id: ticketId },
    });

    if (!challenge) {
      throw new NotFoundError('PasswordResetChallenge', ticketId);
    }

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetChallenge.update({
        where: { id: ticketId },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          shopId: challenge.shopId,
          actorUserId: adminUserId,
          entityType: 'PasswordResetChallenge',
          entityId: ticketId,
          action: 'ADMIN_REVOKED_RECOVERY_TICKET',
          newValues: {
            ticketId,
            revokedAt: new Date().toISOString(),
          },
        },
      });
    });

    return { success: true };
  }
}
