import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { PosService, revalidateInventoryRoutes } from '@/services/posService';
import { requirePermission } from '@/lib/authGuard';
import { POSCheckoutSchema } from '@/lib/validations/pos';

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'sales.checkout');

    const body = await request.json();
    const validated = POSCheckoutSchema.parse(body);

    const result = await PosService.checkout({
      shopId: DEFAULT_SHOP_ID,
      cashierId: auth.user.id,
      customerId: validated.customerId ?? undefined,
      items: validated.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discount,
      })),
      payments: validated.payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        amountTendered: p.amountTendered,
        providerReference: p.providerReference,
      })),
      discountTotal: validated.discountTotal,
      notes: validated.notes,
      idempotencyKey: validated.idempotencyKey,
    });

    revalidateInventoryRoutes();

    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
