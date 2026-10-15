import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ReturnService } from '@/services/returnService';
import { requirePermission } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'returns.process');

    const returns = await prisma.saleReturn.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
      },
      include: {
        sale: {
          select: {
            receiptNumber: true,
            soldAt: true,
            grandTotal: true,
            customer: true,
          },
        },
        items: {
          include: {
            product: true,
            saleItem: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return jsonSuccess(returns);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'returns.process');

    const body = await request.json();
    const { saleId, refundMethod = 'cash', reason, notes, items, idempotencyKey } = body;

    const saleReturn = await ReturnService.processReturn({
      shopId: DEFAULT_SHOP_ID,
      saleId,
      postedBy: auth.user.fullName,
      refundMethod,
      reason,
      notes,
      items,
      idempotencyKey,
    });

    return jsonSuccess(saleReturn, 201);
  } catch (error) {
    return jsonError(error);
  }
}
