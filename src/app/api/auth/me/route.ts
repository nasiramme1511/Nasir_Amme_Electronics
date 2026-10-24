import { NextRequest } from 'next/server';
import { requireAuth, ROLE_COOKIE_NAME } from '@/lib/authGuard';
import { COOKIE_NAME } from '@/services/authService';
import { jsonSuccess, jsonError } from '@/lib/apiHelper';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    return jsonSuccess({
      user: auth.user,
      session: auth.session,
      roles: auth.roles,
      permissions: auth.permissions,
    });
  } catch (error) {
    const res = jsonError(error);
    res.cookies.delete(COOKIE_NAME);
    res.cookies.delete(ROLE_COOKIE_NAME);
    return res;
  }
}
