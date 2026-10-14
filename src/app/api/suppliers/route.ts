import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ValidationError } from '@/lib/errors';

export async function GET() {
  try {
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
