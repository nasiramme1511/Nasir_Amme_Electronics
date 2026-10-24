import { NextRequest } from 'next/server';
import { AuthService } from '@/services/authService';
import { jsonSuccess } from '@/lib/apiHelper';
import { extractToken, clearSessionCookie } from '@/lib/authGuard';

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);
    if (token) {
      await AuthService.logout(token).catch((err) => {
        console.warn('Non-fatal error in AuthService.logout:', err);
      });
    }
  } catch (error) {
    console.warn('Non-fatal error during logout endpoint:', error);
  }

  // Always return 200 success and always strip both session and role cookies
  const response = jsonSuccess({ message: 'Successfully logged out.' });
  return clearSessionCookie(response);
}
