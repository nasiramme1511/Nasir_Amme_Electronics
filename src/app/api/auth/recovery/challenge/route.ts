import { NextRequest } from 'next/server';
import { RecoveryService } from '@/services/recoveryService';
import { jsonSuccess, jsonError } from '@/lib/apiHelper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    const result = await RecoveryService.initiateChallenge(email, { ipAddress, userAgent });

    return jsonSuccess({
      message: 'If the account exists, a 6-digit recovery code has been dispatched.',
      ticketId: result.ticketId,
      recipientMasked: result.recipientMasked,
      expiresInSeconds: result.expiresInSeconds,
      cooldownSeconds: result.cooldownSeconds,
      status: result.status,
      channel: result.channel,
      // Correlation ID provided in development for tracking
      ...(process.env.NODE_ENV !== 'production' && result.correlationId
        ? { correlationId: result.correlationId }
        : {}),
    });
  } catch (error) {
    return jsonError(error);
  }
}
