import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { requireRole } from '@/lib/authGuard';
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    if (!customer || customer.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Customer', id);
    }

    return jsonSuccess(customer);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'admin', 'manager', 'cashier').catch(() => null);
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      displayName,
      phone,
      email,
      customerType,
      priceTier,
      city,
      address,
      addressText,
      tinNumber,
      allowCredit,
      creditLimit,
      notes,
    } = body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Customer', id);
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name || displayName
          ? { displayName: (name || displayName).trim() }
          : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(email !== undefined ? { email: email?.trim() || null } : {}),
        ...(customerType ? { customerType: customerType.toLowerCase() } : {}),
        ...(priceTier ? { priceTier } : {}),
        ...(city ? { city: city.trim() } : {}),
        ...(address || addressText
          ? { addressText: (address || addressText).trim() }
          : {}),
        ...(tinNumber !== undefined ? { tinNumber: tinNumber?.trim() || null } : {}),
        ...(allowCredit !== undefined ? { allowCredit: Boolean(allowCredit) } : {}),
        ...(creditLimit !== undefined ? { creditLimit: new Prisma.Decimal(creditLimit) } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
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
    await requireRole(request, 'admin', 'manager').catch(() => null);
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Customer', id);
    }

    // Since Sale.customerId has onDelete: SetNull, we can safely delete or unlink
    await prisma.$transaction(async (tx) => {
      await tx.sale.updateMany({
        where: { customerId: id },
        data: { customerId: null },
      });
      await tx.customer.delete({
        where: { id },
      });
    });

    return jsonSuccess({
      message: 'Customer removed from database successfully.',
      id,
    });
  } catch (error) {
    return jsonError(error);
  }
}
