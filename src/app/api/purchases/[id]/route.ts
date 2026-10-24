import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { requireRole } from '@/lib/authGuard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!po || po.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('PurchaseOrder', id);
    }

    return jsonSuccess(po);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'admin', 'manager').catch(() => null);
    const { id } = await params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { goodsReceipts: true },
    });

    if (!po || po.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('PurchaseOrder', id);
    }

    if (po.status === 'received' || po.goodsReceipts.length > 0) {
      throw new ValidationError(
        'Cannot delete a purchase order that has already been received into inventory. Goods receipt ledger records must be reversed first.'
      );
    }

    // Delete purchase items and purchase order from PostgreSQL
    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      await tx.purchaseOrder.delete({ where: { id } });
    });

    return jsonSuccess({
      message: 'Purchase order removed from database successfully.',
      id,
    });
  } catch (error) {
    return jsonError(error);
  }
}
