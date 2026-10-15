import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authGuard';
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
    return jsonError(error);
  }
}
