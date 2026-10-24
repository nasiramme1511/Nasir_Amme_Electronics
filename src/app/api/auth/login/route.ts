import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import { jsonError } from '@/lib/apiHelper';
import { attachSessionCookie } from '@/lib/authGuard';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = body.identifier || body.email;
    const password = body.password || body.pin;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Identifier and security PIN or password are required.' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    const result = await AuthService.login(identifier, password, { ipAddress, userAgent });

    const primaryRole = (body.role || result.user.roles[0] || 'cashier').toLowerCase();
    const normalizedUser = {
      ...result.user,
      role: primaryRole.toUpperCase(),
    };

    const response = NextResponse.json({
      success: true,
      data: {
        user: normalizedUser,
        expiresAt: result.expiresAt,
      },
      user: normalizedUser,
      expiresAt: result.expiresAt,
    });

    return attachSessionCookie(response, result.token, result.expiresAt, primaryRole);
  } catch (error) {
    return jsonError(error);
  }
}
