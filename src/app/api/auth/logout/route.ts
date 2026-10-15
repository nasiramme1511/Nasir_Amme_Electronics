import { NextRequest } from 'next/server';
import { AuthService } from '@/services/authService';
import { jsonSuccess, jsonError } from '@/lib/apiHelper';
import { extractToken, clearSessionCookie } from '@/lib/authGuard';

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request);
    if (token) {
      await AuthService.logout(token);
    }

    const response = jsonSuccess({ message: 'Successfully logged out.' });
    return clearSessionCookie(response);
  } catch (error) {
    return jsonError(error);
  }
}
