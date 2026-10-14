import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { PurchaseService } from '@/services/purchaseService';

export async function GET() {
  try {
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
    const body = await request.json();
    const { supplierId, items, notes, expectedAt, createdBy } = body;

    const po = await PurchaseService.createPurchaseOrder({
      shopId: DEFAULT_SHOP_ID,
      supplierId,
      items,
      notes,
      expectedAt,
      createdBy,
    });

    return jsonSuccess(po, 201);
  } catch (error) {
    return jsonError(error);
  }
}
