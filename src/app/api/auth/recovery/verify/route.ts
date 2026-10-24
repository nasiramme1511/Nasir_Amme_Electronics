import { NextRequest } from 'next/server';
import { RecoveryService } from '@/services/recoveryService';
import { jsonSuccess, jsonError } from '@/lib/apiHelper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otpCode } = body;

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    const result = await RecoveryService.verifyChallenge(email, otpCode, { ipAddress, userAgent });

    return jsonSuccess({
      message: 'Verification code confirmed. Single-use reset authorization token issued.',
      resetToken: result.resetToken,
      expiresInSeconds: result.expiresInSeconds,
    });
  } catch (error) {
    return jsonError(error);
  }
}
