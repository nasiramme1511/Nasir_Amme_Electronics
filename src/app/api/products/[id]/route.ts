import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { NotFoundError } from '@/lib/errors';
import { InventoryService } from '@/services/inventoryService';
import { Prisma } from '@prisma/client';
import { requireAuth, requireRole } from '@/lib/authGuard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockMovements: {
          orderBy: { occurredAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product || product.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Product', id);
    }

    return jsonSuccess(product);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin', 'manager');
    const { id } = await params;
    const body = await request.json();

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product || product.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Product', id);
    }

    const {
      name,
      brand,
      categoryId,
      sellingPrice,
      minStockThreshold,
      location,
      description,
      warrantyMonths,
      status,
      stockQuantity,
      adjustmentReason = 'Manual inventory correction from product management',
    } = body;

    // 1. If stockQuantity is explicitly passed and different from current onHand, perform audited correction
    if (stockQuantity !== undefined && stockQuantity !== product.onHand) {
      await InventoryService.performManualCorrection({
        shopId: DEFAULT_SHOP_ID,
        productId: product.id,
        newStockQuantity: Number(stockQuantity),
        reason: adjustmentReason,
        actorId: auth.user.id,
      });
    }

    // 2. Update general product details
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(brand ? { brand: brand.trim() } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(sellingPrice !== undefined ? { sellingPrice: new Prisma.Decimal(sellingPrice) } : {}),
        ...(minStockThreshold !== undefined ? { reorderLevel: Number(minStockThreshold) } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(warrantyMonths !== undefined ? { warrantyMonths: Number(warrantyMonths) } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        category: true,
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'admin');
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product || product.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Product', id);
    }

    // Soft deactivate to maintain relational referential integrity with sales and purchase history
    const deactivated = await prisma.product.update({
      where: { id },
      data: { status: 'inactive' },
    });

    return jsonSuccess({ message: 'Product deactivated successfully.', product: deactivated });
  } catch (error) {
    return jsonError(error);
  }
}
