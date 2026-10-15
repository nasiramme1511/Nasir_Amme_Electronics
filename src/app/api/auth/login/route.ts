import { NextRequest } from 'next/server';
import { AuthService } from '@/services/authService';
import { jsonSuccess, jsonError } from '@/lib/apiHelper';
import { attachSessionCookie } from '@/lib/authGuard';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    const result = await AuthService.login(email, password, { ipAddress, userAgent });

    const response = jsonSuccess({
      user: result.user,
      expiresAt: result.expiresAt,
    });

    return attachSessionCookie(response, result.token, result.expiresAt);
  } catch (error) {
    return jsonError(error);
  }
}
