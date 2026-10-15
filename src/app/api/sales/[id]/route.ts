import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { NotFoundError } from '@/lib/errors';
import { requireAuth } from '@/lib/authGuard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        cashier: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: { product: true },
        },
        payments: true,
        returns: {
          include: { items: true },
        },
      },
    });

    if (!sale || sale.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Sale', id);
    }

    return jsonSuccess(sale);
  } catch (error) {
    return jsonError(error);
  }
}
