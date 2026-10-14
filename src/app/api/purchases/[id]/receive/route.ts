import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { PurchaseService } from '@/services/purchaseService';
import { ValidationError } from '@/lib/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { receivedBy, items, notes, idempotencyKey } = body;

    let effectiveReceivedBy = receivedBy;
    if (!effectiveReceivedBy) {
      const defaultUser = await prisma.user.findFirst({
        where: { shopId: DEFAULT_SHOP_ID, status: 'active' },
      });
      if (!defaultUser) throw new ValidationError('No active staff accounts found.');
      effectiveReceivedBy = defaultUser.fullName;
    }

    const receipt = await PurchaseService.receiveGoods({
      shopId: DEFAULT_SHOP_ID,
      purchaseOrderId: id,
      receivedBy: effectiveReceivedBy,
      items,
      notes,
      idempotencyKey,
    });

    return jsonSuccess(receipt, 201);
  } catch (error) {
    return jsonError(error);
  }
}
