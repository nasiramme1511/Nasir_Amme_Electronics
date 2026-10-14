import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const movementType = searchParams.get('movementType');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

    const movements = await prisma.stockMovement.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
        ...(productId ? { productId } : {}),
        ...(movementType ? { movementType } : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            brand: true,
          },
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: limit,
    });

    return jsonSuccess(movements);
  } catch (error) {
    return jsonError(error);
  }
}
