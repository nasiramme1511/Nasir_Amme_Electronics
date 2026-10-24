import { NextRequest } from 'next/server';
import { RecoveryService } from '@/services/recoveryService';
import { jsonSuccess, jsonError } from '@/lib/apiHelper';
import { ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, resetToken, otpCode, newPassword, posPin } = body;

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    if (!email || !newPassword) {
      throw new ValidationError('Email and new password are required.');
    }

    if (!resetToken && !otpCode) {
      throw new ValidationError('A verified reset authorization token or 6-digit OTP code is required.');
    }

    let tokenToUse = resetToken;

    // If caller provided OTP code directly, verify it against PostgreSQL first
    if (!tokenToUse && otpCode) {
      const verifyResult = await RecoveryService.verifyChallenge(email, otpCode, { ipAddress, userAgent });
      tokenToUse = verifyResult.resetToken;
    }

    // Execute cryptographic password reset using Argon2id and single-use token
    const result = await RecoveryService.executePasswordReset(
      email,
      tokenToUse,
      newPassword,
      posPin,
      { ipAddress, userAgent }
    );

    return jsonSuccess({
      message: 'Password successfully reset with Argon2id and active sessions revoked.',
      email: result.email,
      quickPinConfigured: Boolean(posPin),
    });
  } catch (error) {
    return jsonError(error);
  }
}
