import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ValidationError, ForbiddenError } from '@/lib/errors';
import { requireAuth, requireRole } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request).catch(() => null);
    if (auth && !auth.roles.includes('admin') && !auth.roles.includes('manager') && !auth.roles.includes('stock_keeper') && !auth.roles.includes('cashier')) {
      throw new ForbiddenError('Access denied to supplier records.');
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
        status: 'active',
      },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return jsonSuccess(suppliers);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'admin', 'manager').catch(() => null);

    const body = await request.json();
    const { code, name, contactName, email, phone, city = 'Dire Dawa', addressText, paymentTerms = 'Net 15', notes } = body;

    if (!code || !name || !phone) {
      throw new ValidationError('Supplier code, company name, and phone number are required.');
    }

    const supplier = await prisma.supplier.create({
      data: {
        shopId: DEFAULT_SHOP_ID,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        contactName,
        email,
        phone: phone.trim(),
        city,
        addressText,
        paymentTerms,
        notes,
        status: 'active',
      },
    });

    return jsonSuccess(supplier, 201);
  } catch (error) {
    return jsonError(error);
  }
}
