
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { requireAuth } from '@/lib/authGuard';
import { ForbiddenError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.roles.includes('admin') && !auth.roles.includes('manager') && !auth.roles.includes('stock_keeper')) {
      throw new ForbiddenError('Cashiers are not permitted to inspect backend stock movements.');
    }

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
        actor: {
          select: {
            id: true,
            fullName: true,
            userRoles: {
              include: {
                role: {
                  select: {
                    code: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
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

    const formattedMovements = movements.map((m) => {
      const roleName =
        m.actor?.userRoles?.[0]?.role?.displayName ||
        m.actor?.userRoles?.[0]?.role?.code ||
        'Staff';

      return {
        ...m,
        actor: m.actor
          ? {
              id: m.actor.id,
              fullName: m.actor.fullName,
              role: roleName,
            }
          : null,
        product: {
          ...m.product,
          title: m.product?.name || '',
        },
      };
    });

    return jsonSuccess(formattedMovements);
  } catch (error) {
    return jsonError(error);
  }
}
