import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ValidationError } from '@/lib/errors';
import { requireAuth } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request).catch(() => null);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    const customers = await prisma.customer.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
        ...(query
          ? {
              OR: [
                { displayName: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: {
        totalSpent: 'desc',
      },
    });

    return jsonSuccess(customers);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request).catch(() => null);

    const body = await request.json();
    const { displayName, phone, email, customerType = 'retail', city = 'Dire Dawa', notes } = body;

    if (!displayName || !phone) {
      throw new ValidationError('Customer name and phone number are required.');
    }

    const customer = await prisma.customer.create({
      data: {
        shopId: DEFAULT_SHOP_ID,
        displayName: displayName.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        customerType,
        city,
        notes,
      },
    });

    return jsonSuccess(customer, 201);
  } catch (error) {
    return jsonError(error);
  }
}
