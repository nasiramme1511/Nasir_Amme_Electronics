import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ValidationError } from '@/lib/errors';
import { Prisma } from '@prisma/client';
import { requireAuth, requireRole } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status') ?? 'active';
    const query = searchParams.get('query');
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const whereClause: Prisma.ProductWhereInput = {
      shopId: DEFAULT_SHOP_ID,
      ...(status !== 'all' ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { sku: { contains: query, mode: 'insensitive' } },
              { brand: { contains: query, mode: 'insensitive' } },
              { barcode: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const filtered = lowStockOnly
      ? products.filter((p) => p.onHand <= p.reorderLevel)
      : products;

    return jsonSuccess(filtered);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'admin', 'manager');

    const body = await request.json();
    const {
      sku,
      barcode,
      name,
      brand,
      categoryId,
      sellingPrice,
      costPrice,
      stockQuantity = 0,
      minStockThreshold = 5,
      location,
      description,
      warrantyMonths = 0,
    } = body;

    if (!sku || !name || !brand || !categoryId || sellingPrice === undefined) {
      throw new ValidationError('Required fields missing: sku, name, brand, categoryId, sellingPrice.');
    }

    const price = new Prisma.Decimal(sellingPrice);
    const cost = costPrice !== undefined ? new Prisma.Decimal(costPrice) : new Prisma.Decimal(0);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          sku: sku.trim(),
          barcode: barcode ? barcode.trim() : null,
          name: name.trim(),
          brand: brand.trim(),
          categoryId,
          sellingPrice: price,
          averageCost: cost,
          onHand: stockQuantity,
          reorderLevel: minStockThreshold,
          location,
          description,
          warrantyMonths: Number(warrantyMonths) || 0,
          status: 'active',
        },
        include: {
          category: true,
        },
      });

      if (stockQuantity > 0) {
        await tx.stockMovement.create({
          data: {
            shopId: DEFAULT_SHOP_ID,
            productId: created.id,
            movementType: 'opening_balance',
            quantityDelta: stockQuantity,
            unitCostSnapshot: cost,
            previousStock: 0,
            balanceAfter: stockQuantity,
            referenceNumber: 'INITIAL-CATALOG-ADD',
            sourceType: 'catalog_add',
            reason: 'Opening inventory balance on product creation',
          },
        });
      }

      return created;
    });

    return jsonSuccess(product, 201);
  } catch (error) {
    return jsonError(error);
  }
}
