import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { NotFoundError } from '@/lib/errors';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: DEFAULT_SHOP_ID },
    });

    if (!shop) throw new NotFoundError('Shop', DEFAULT_SHOP_ID);

    return jsonSuccess(shop);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      legalName,
      addressText,
      city,
      phonePrimary,
      phoneSecondary,
      email,
      tinNumber,
      receiptHeader,
      receiptFooter,
      taxRate,
      isTaxEnabled,
      lowStockGlobalThreshold,
    } = body;

    const updated = await prisma.shop.update({
      where: { id: DEFAULT_SHOP_ID },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(legalName !== undefined ? { legalName } : {}),
        ...(addressText !== undefined ? { addressText } : {}),
        ...(city ? { city } : {}),
        ...(phonePrimary !== undefined ? { phonePrimary } : {}),
        ...(phoneSecondary !== undefined ? { phoneSecondary } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(tinNumber !== undefined ? { tinNumber } : {}),
        ...(receiptHeader !== undefined ? { receiptHeader } : {}),
        ...(receiptFooter !== undefined ? { receiptFooter } : {}),
        ...(taxRate !== undefined ? { taxRate: new Prisma.Decimal(taxRate) } : {}),
        ...(isTaxEnabled !== undefined ? { isTaxEnabled: Boolean(isTaxEnabled) } : {}),
        ...(lowStockGlobalThreshold !== undefined
          ? { lowStockGlobalThreshold: Number(lowStockGlobalThreshold) }
          : {}),
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}
