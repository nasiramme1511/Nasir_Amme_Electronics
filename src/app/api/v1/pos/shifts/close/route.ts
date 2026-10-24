import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { CashSessionService } from '@/services/cashSessionService';
import { requireAuth } from '@/lib/authGuard';
import { CloseShiftSchema } from '@/lib/validations/shift';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const body = await request.json();
    const validated = CloseShiftSchema.parse(body);

    const targetSession = await prisma.cashSession.findUnique({
      where: { id: validated.sessionId },
    });

    if (!targetSession) {
      return NextResponse.json(
        { success: false, error: { message: 'Cash session not found.' } },
        { status: 404 }
      );
    }

    const isAdminOrManager = auth.roles.includes('admin') || auth.roles.includes('manager');
    if (!isAdminOrManager && targetSession.cashierId !== auth.user.id) {
      return NextResponse.json(
        { success: false, error: { message: 'Forbidden. Cashiers can only close their own assigned shifts.' } },
        { status: 403 }
      );
    }

    const closedSession = await CashSessionService.closeSession({
      shopId: targetSession.shopId || auth.user.shopId || DEFAULT_SHOP_ID,
      sessionId: validated.sessionId,
      closingCashCounted: validated.closingCashCounted,
      closedBy: auth.user.id,
      notes: validated.notes,
    });

    return jsonSuccess({
      message: "Shift closed and Z-Report reconciled successfully.",
      session: closedSession,
    });
  } catch (error) {
    return jsonError(error);
  }
}
