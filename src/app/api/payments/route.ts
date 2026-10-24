import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { requireAuth } from '@/lib/authGuard';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request).catch(() => null);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || searchParams.get('search');
    const method = searchParams.get('method');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

    const whereClause: Prisma.PaymentWhereInput = {
      shopId: DEFAULT_SHOP_ID,
      ...(method && method !== 'all' ? { method: method.toLowerCase() } : {}),
      ...(status && status !== 'all' ? { status: status.toLowerCase() } : {}),
      ...(query
        ? {
            OR: [
              { providerReference: { contains: query, mode: 'insensitive' } },
              { recordedBy: { contains: query, mode: 'insensitive' } },
              {
                sale: {
                  receiptNumber: { contains: query, mode: 'insensitive' },
                },
              },
              {
                sale: {
                  customer: {
                    displayName: { contains: query, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [payments, aggregateStats] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
        include: {
          sale: {
            select: {
              id: true,
              receiptNumber: true,
              grandTotal: true,
              soldAt: true,
              customer: {
                select: {
                  id: true,
                  displayName: true,
                  phone: true,
                },
              },
              cashier: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          cashSession: {
            select: {
              id: true,
              sessionNumber: true,
              status: true,
            },
          },
        },
        orderBy: {
          receivedAt: 'desc',
        },
        take: limit,
      }),
      prisma.payment.groupBy({
        by: ['method'],
        where: {
          shopId: DEFAULT_SHOP_ID,
          status: 'succeeded',
        },
        _sum: {
          amount: true,
        },
        _count: true,
      }),
    ]);

    const summary = {
      totalCollected: 0,
      totalCount: 0,
      cash: 0,
      telebirr: 0,
      cbe_birr: 0,
      bank_transfer: 0,
      credit: 0,
    };

    for (const group of aggregateStats) {
      const amt = Number(group._sum.amount || 0);
      summary.totalCollected += amt;
      summary.totalCount += group._count;
      if (group.method === 'cash') summary.cash += amt;
      else if (group.method === 'telebirr') summary.telebirr += amt;
      else if (group.method === 'cbe_birr') summary.cbe_birr += amt;
      else if (group.method === 'bank_transfer') summary.bank_transfer += amt;
      else if (group.method === 'credit') summary.credit += amt;
    }

    return jsonSuccess({
      payments,
      summary,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();

    const {
      saleId,
      receiptNumber,
      method,
      amount,
      amountTendered,
      changeGiven,
      providerReference,
      notes,
    } = body;

    if (!method) {
      throw new ValidationError('Payment method (cash, telebirr, cbe_birr, bank_transfer, credit) is required.');
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new ValidationError('Valid positive payment amount is required.');
    }

    // Locate target sale
    let targetSaleId = saleId;
    if (!targetSaleId && receiptNumber) {
      const sale = await prisma.sale.findFirst({
        where: {
          shopId: DEFAULT_SHOP_ID,
          receiptNumber: receiptNumber.trim(),
        },
      });
      if (!sale) {
        throw new NotFoundError('Sale with receipt', receiptNumber);
      }
      targetSaleId = sale.id;
    }

    if (!targetSaleId) {
      throw new ValidationError('Sale ID or Receipt Number is required to record payment.');
    }

    const sale = await prisma.sale.findUnique({
      where: { id: targetSaleId },
      include: { payments: true },
    });

    if (!sale || sale.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Sale', targetSaleId);
    }

    // Find active cash session for cashier if cash transaction
    let activeCashSessionId: string | null = null;
    const activeSession = await prisma.cashSession.findFirst({
      where: {
        shopId: DEFAULT_SHOP_ID,
        cashierId: auth.user.id,
        status: 'open',
      },
      orderBy: { openedAt: 'desc' },
    });
    if (activeSession) {
      activeCashSessionId = activeSession.id;
    }

    const newPayment = await prisma.payment.create({
      data: {
        shopId: DEFAULT_SHOP_ID,
        saleId: targetSaleId,
        cashSessionId: activeCashSessionId,
        method: method.toLowerCase(),
        status: 'succeeded',
        amount: new Prisma.Decimal(numAmount),
        amountTendered: amountTendered ? new Prisma.Decimal(Number(amountTendered)) : null,
        changeGiven: changeGiven ? new Prisma.Decimal(Number(changeGiven)) : null,
        providerReference: providerReference ? providerReference.trim() : null,
        recordedBy: auth.user.fullName || auth.user.email,
      },
      include: {
        sale: {
          select: {
            receiptNumber: true,
            grandTotal: true,
            customer: true,
          },
        },
      },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        shopId: DEFAULT_SHOP_ID,
        actorUserId: auth.user.id,
        action: 'PAYMENT_RECORDED',
        entityType: 'Payment',
        entityId: newPayment.id,
        newValues: {
          receiptNumber: sale.receiptNumber,
          method: newPayment.method,
          amount: Number(newPayment.amount),
          providerReference: newPayment.providerReference,
          recordedBy: newPayment.recordedBy,
        },
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return jsonSuccess(newPayment, 201);
  } catch (error) {
    return jsonError(error);
  }
}
