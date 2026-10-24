import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
import { Prisma } from '@prisma/client';
import { requireAuth, requirePermission } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.roles.includes('admin')) {
      throw new ForbiddenError('Only Administrators can view or manage business settings.');
    }

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
    const auth = await requirePermission(request, 'settings.manage');
    if (!auth.roles.includes('admin')) {
      throw new ForbiddenError('Only Administrators can modify shop settings.');
    }

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

    const updated = await prisma.$transaction(async (tx) => {
      const shopRecord = await tx.shop.update({
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

      await tx.auditLog.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          actorUserId: auth.user.id,
          entityType: 'Shop',
          entityId: DEFAULT_SHOP_ID,
          action: 'UPDATE_SETTINGS',
          newValues: {
            updatedFields: Object.keys(body),
          },
        },
      });

      return shopRecord;
    });

    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}
