import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { PurchaseService } from '@/services/purchaseService';
import { requirePermission } from '@/lib/authGuard';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'purchases.receive').catch(() => null);
    const { id } = await params;
    const body = await request.json();
    const { items, notes, idempotencyKey } = body;

    const receipt = await PurchaseService.receiveGoods({
      shopId: DEFAULT_SHOP_ID,
      purchaseOrderId: id,
      receivedBy: auth?.user?.fullName || 'Manager',
      items,
      notes,
      idempotencyKey,
    });

    return jsonSuccess(receipt, 201);
  } catch (error) {
    return jsonError(error);
  }
}
