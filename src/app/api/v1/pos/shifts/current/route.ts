import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    // Look for active open session for this cashier or active session in shop
    const session = await prisma.cashSession.findFirst({
      where: {
        shopId: auth.user.shopId || DEFAULT_SHOP_ID,
        status: 'open',
        ...(auth.roles.includes('admin') || auth.roles.includes('manager')
          ? {}
          : { cashierId: auth.user.id }),
      },
      orderBy: { openedAt: 'desc' },
      include: {
        cashier: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return jsonSuccess({
      session,
    });
  } catch (error) {
    return jsonError(error);
  }
}
