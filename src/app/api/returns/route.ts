import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ReturnService } from '@/services/returnService';
import { ValidationError } from '@/lib/errors';

export async function GET() {
  try {
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
    const body = await request.json();
    const { saleId, postedBy, refundMethod = 'cash', reason, notes, items, idempotencyKey } = body;

    let effectivePostedBy = postedBy;
    if (!effectivePostedBy) {
      const defaultUser = await prisma.user.findFirst({
        where: { shopId: DEFAULT_SHOP_ID, status: 'active' },
      });
      if (!defaultUser) throw new ValidationError('No active staff accounts found to authorize return.');
      effectivePostedBy = defaultUser.fullName;
    }

    const saleReturn = await ReturnService.processReturn({
      shopId: DEFAULT_SHOP_ID,
      saleId,
      postedBy: effectivePostedBy,
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
