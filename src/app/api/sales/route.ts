import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { PosService } from '@/services/posService';
import { ValidationError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const query = searchParams.get('query');
    const status = searchParams.get('status');

    const sales = await prisma.sale.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
        ...(status ? { status } : {}),
        ...(query
          ? {
              OR: [
                { receiptNumber: { contains: query, mode: 'insensitive' } },
                { customer: { displayName: { contains: query, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
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
      orderBy: {
        soldAt: 'desc',
      },
      take: limit,
    });

    return jsonSuccess(sales);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cashierId, customerId, items, payments, discountTotal, notes, idempotencyKey } = body;

    // Default cashier if not explicitly supplied in body (fallback to first active cashier)
    let effectiveCashierId = cashierId;
    if (!effectiveCashierId) {
      const defaultCashier = await prisma.user.findFirst({
        where: { shopId: DEFAULT_SHOP_ID, status: 'active' },
      });
      if (!defaultCashier) throw new ValidationError('No active cashier accounts found.');
      effectiveCashierId = defaultCashier.id;
    }

    const sale = await PosService.checkout({
      shopId: DEFAULT_SHOP_ID,
      cashierId: effectiveCashierId,
      customerId,
      items,
      payments,
      discountTotal,
      notes,
      idempotencyKey,
    });

    return jsonSuccess(sale, 201);
  } catch (error) {
    return jsonError(error);
  }
}
