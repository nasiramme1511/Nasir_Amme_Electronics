import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { requireAuth, requireRole } from '@/lib/authGuard';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        sale: {
          include: {
            customer: true,
            cashier: {
              select: { id: true, fullName: true, email: true },
            },
            items: true,
          },
        },
        cashSession: true,
      },
    });

    if (!payment || payment.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Payment', id);
    }

    return jsonSuccess(payment);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.payment.findUnique({
      where: { id },
      include: { sale: true },
    });

    if (!existing || existing.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Payment', id);
    }

    const {
      providerReference,
      method,
      status,
      amount,
    } = body;

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        ...(providerReference !== undefined
          ? { providerReference: providerReference ? providerReference.trim() : null }
          : {}),
        ...(method ? { method: method.toLowerCase() } : {}),
        ...(status ? { status: status.toLowerCase() } : {}),
        ...(amount !== undefined ? { amount: new Prisma.Decimal(Number(amount)) } : {}),
      },
      include: {
        sale: {
          select: {
            id: true,
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
        action: 'PAYMENT_UPDATED',
        entityType: 'Payment',
        entityId: id,
        oldValues: {
          method: existing.method,
          status: existing.status,
          providerReference: existing.providerReference,
          amount: Number(existing.amount),
        },
        newValues: {
          method: updated.method,
          status: updated.status,
          providerReference: updated.providerReference,
          amount: Number(updated.amount),
          updatedBy: auth.user.fullName,
        },
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
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
    const auth = await requireRole(request, 'admin', 'manager');
    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { sale: true },
    });

    if (!payment || payment.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Payment', id);
    }

    // Set payment status to refunded/voided to maintain immutable accounting ledger
    const voided = await prisma.payment.update({
      where: { id },
      data: {
        status: 'refunded',
      },
    });

    await prisma.auditLog.create({
      data: {
        shopId: DEFAULT_SHOP_ID,
        actorUserId: auth.user.id,
        action: 'PAYMENT_VOIDED',
        entityType: 'Payment',
        entityId: id,
        oldValues: {
          receiptNumber: payment.sale.receiptNumber,
          amount: Number(payment.amount),
          method: payment.method,
          status: payment.status,
        },
        newValues: {
          status: 'refunded',
          voidedBy: auth.user.fullName,
        },
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return jsonSuccess({
      message: 'Payment marked as refunded / voided in audit ledger.',
      id,
      payment: voided,
    });
  } catch (error) {
    return jsonError(error);
  }
}
