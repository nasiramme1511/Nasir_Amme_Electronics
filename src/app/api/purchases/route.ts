import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { PurchaseService } from '@/services/purchaseService';
import { requireAuth, requirePermission } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
      },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
        goodsReceipts: {
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return jsonSuccess(orders);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'purchases.create');

    const body = await request.json();
    const { supplierId, items, notes, expectedAt } = body;

    const po = await PurchaseService.createPurchaseOrder({
      shopId: DEFAULT_SHOP_ID,
      supplierId,
      items,
      notes,
      expectedAt,
      createdBy: auth.user.fullName,
    });

    return jsonSuccess(po, 201);
  } catch (error) {
    return jsonError(error);
  }
}
