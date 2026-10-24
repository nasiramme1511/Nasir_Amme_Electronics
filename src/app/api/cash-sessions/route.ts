import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { CashSessionService } from '@/services/cashSessionService';
import { requireAuth } from '@/lib/authGuard';
import { ValidationError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const telemetry = await CashSessionService.getCurrentSessionTelemetry(
      DEFAULT_SHOP_ID,
      auth.user.id
    );

    return jsonSuccess(telemetry);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const { action = 'open', openingFloat = 0, notes, sessionId, closingCashCounted } = body;

    if (action === 'open') {
      const session = await CashSessionService.openSession({
        shopId: DEFAULT_SHOP_ID,
        cashierId: auth.user.id,
        openingFloat: Number(openingFloat) || 0,
        notes,
      });
      return jsonSuccess(session, 201);
    }

    if (action === 'close') {
      if (!sessionId || closingCashCounted === undefined) {
        throw new ValidationError('sessionId and closingCashCounted are required to close shift.');
      }
      const targetSession = await prisma.cashSession.findUnique({
        where: { id: sessionId },
      });
      if (!targetSession) {
        throw new ValidationError('Cash session not found.');
      }
      const isAdminOrManager = auth.roles.includes('admin') || auth.roles.includes('manager');
      if (!isAdminOrManager && targetSession.cashierId !== auth.user.id) {
        throw new ValidationError('Forbidden. Cashiers can only close their own assigned shifts.');
      }
      const closed = await CashSessionService.closeSession({
        shopId: targetSession.shopId || auth.user.shopId || DEFAULT_SHOP_ID,
        sessionId,
        closingCashCounted: Number(closingCashCounted) || 0,
        closedBy: auth.user.id,
        notes,
      });
      return jsonSuccess(closed);
    }

    throw new ValidationError(`Unknown action "${action}". Must be "open" or "close".`);
  } catch (error) {
    return jsonError(error);
  }
}
