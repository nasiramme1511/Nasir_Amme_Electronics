import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { requireRole } from '@/lib/authGuard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    if (!supplier || supplier.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Supplier', id);
    }

    return jsonSuccess(supplier);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'admin', 'manager').catch(() => null);
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      code,
      contactName,
      contactPerson,
      email,
      phone,
      city,
      cityHub,
      address,
      addressText,
      paymentTerms,
      notes,
      tinNumber,
      bankName,
      bankAccount,
      status,
    } = body;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing || existing.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Supplier', id);
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(code ? { code: code.trim().toUpperCase() } : {}),
        ...(contactName || contactPerson
          ? { contactName: (contactName || contactPerson).trim() }
          : {}),
        ...(email !== undefined ? { email: email?.trim() || null } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(city || cityHub ? { city: (city || cityHub).trim() } : {}),
        ...(cityHub !== undefined ? { cityHub: cityHub?.trim() || null } : {}),
        ...(address || addressText
          ? { addressText: (address || addressText).trim() }
          : {}),
        ...(paymentTerms ? { paymentTerms } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
        ...(tinNumber !== undefined ? { tinNumber: tinNumber?.trim() || null } : {}),
        ...(bankName !== undefined ? { bankName: bankName?.trim() || null } : {}),
        ...(bankAccount !== undefined ? { bankAccount: bankAccount?.trim() || null } : {}),
        ...(status ? { status } : {}),
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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    if (!supplier || supplier.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Supplier', id);
    }

    // If purchase orders reference this supplier, soft-delete to maintain accounting links
    if (supplier._count.purchaseOrders > 0) {
      await prisma.supplier.update({
        where: { id },
        data: { status: 'inactive' },
      });
    } else {
      // Purge completely from PostgreSQL database
      await prisma.supplier.delete({
        where: { id },
      });
    }

    return jsonSuccess({
      message: 'Supplier removed from database successfully.',
      id,
    });
  } catch (error) {
    return jsonError(error);
  }
}
