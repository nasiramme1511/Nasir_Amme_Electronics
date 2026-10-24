import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { requireAuth } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const shopId = auth.user.shopId || DEFAULT_SHOP_ID;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const query = searchParams.get('query');

    const where: any = {
      shopId,
      status: 'in_stock',
    };

    if (productId) {
      where.productId = productId;
    }

    if (query) {
      where.serialNumber = {
        contains: query.trim(),
        mode: 'insensitive',
      };
    }

    const serials = await prisma.productSerial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
    });

    return jsonSuccess({
      serials: serials.map((s) => ({
        id: s.id,
        productId: s.productId,
        serialNumber: s.serialNumber,
        status: s.status,
        productName: s.product.name,
        sku: s.product.sku,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
