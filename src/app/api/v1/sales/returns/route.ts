import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ReturnService } from '@/services/returnService';
import { requirePermission } from '@/lib/authGuard';
import { ProcessReturnSchema } from '@/lib/validations/return';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'returns.process');

    const body = await request.json();
    const validated = ProcessReturnSchema.parse(body);

    // 1. Resolve sale from receipt ID
    const sale = await prisma.sale.findFirst({
      where: {
        shopId: DEFAULT_SHOP_ID,
        OR: [
          { id: validated.originalReceiptId },
          { receiptNumber: validated.originalReceiptId },
        ],
      },
      include: {
        items: true,
      },
    });

    if (!sale) {
      throw new NotFoundError('Sale Receipt', validated.originalReceiptId);
    }

    // 2. Resolve matching line item
    const lineItem = sale.items.find(
      (i) => i.productId === validated.productId || i.skuSnapshot === validated.productId || i.id === validated.productId
    ) || sale.items[0];

    const refundMethodMap: Record<string, 'cash' | 'telebirr' | 'credit_note'> = {
      CASH_DRAWER: 'cash',
      TELEBIRR_REVERSAL: 'telebirr',
      STORE_CREDIT: 'credit_note',
    };

    const reasonMap: Record<string, string> = {
      DEFECTIVE_HARDWARE: 'defective',
      CUSTOMER_REGRET: 'customer_regret',
      WRONG_SPECIFICATION: 'wrong_item',
    };

    const dispMap: Record<string, 'restock' | 'quarantine'> = {
      RESTOCKED_TO_SHELF: 'restock',
      QUARANTINE_DEFECTIVE: 'quarantine',
    };

    const saleReturn = await ReturnService.processReturn({
      shopId: DEFAULT_SHOP_ID,
      saleId: sale.id,
      postedBy: auth.user.fullName,
      refundMethod: refundMethodMap[validated.payoutMode] || 'cash',
      reason: reasonMap[validated.reason] || 'defective',
      notes: validated.inspectionNotes,
      items: [
        {
          saleItemId: lineItem.id,
          quantity: validated.quantity,
          reason: reasonMap[validated.reason] || 'defective',
          disposition: dispMap[validated.disposition] || 'restock',
        },
      ],
    });

    return jsonSuccess(saleReturn, 201);
  } catch (error) {
    return jsonError(error);
  }
}
