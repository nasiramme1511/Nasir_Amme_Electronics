import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { PosService } from '@/services/posService';
import { requireAuth, requirePermission } from '@/lib/authGuard';
import { ForbiddenError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    // Cashier, Manager, Admin can view sales
    if (!auth.roles.includes('admin') && !auth.permissions.includes('sales.checkout') && !auth.permissions.includes('reports.view')) {
      throw new ForbiddenError('Access denied to sales records.');
    }

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
    const auth = await requirePermission(request, 'sales.checkout');

    const body = await request.json();
    const { cashierId, customerId, items, payments, discountTotal, notes, idempotencyKey } = body;

    // Use authenticated user as authoritative cashier
    const effectiveCashierId = auth.roles.includes('admin') && cashierId ? cashierId : auth.user.id;

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
