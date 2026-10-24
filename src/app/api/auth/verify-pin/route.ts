import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authGuard';
import { AuthService } from '@/services/authService';
import { DEFAULT_SHOP_ID, jsonSuccess, jsonError } from '@/lib/apiHelper';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { success: false, error: { message: 'PIN is required.' } },
        { status: 400 }
      );
    }

    const shopId = auth.user.shopId || DEFAULT_SHOP_ID;
    const result = await AuthService.verifyManagerPin(shopId, pin.trim());

    if (!result.authorized) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid Manager or Admin PIN.' } },
        { status: 403 }
      );
    }

    return jsonSuccess({
      authorized: true,
      managerName: result.managerName,
      managerId: result.managerId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
