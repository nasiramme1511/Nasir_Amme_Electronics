import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { InventoryService } from '@/services/inventoryService';
import { requirePermission } from '@/lib/authGuard';

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'inventory.adjust');

    const body = await request.json();
    const { productId, newStockQuantity, reason, notes } = body;

    const result = await InventoryService.performManualCorrection({
      shopId: DEFAULT_SHOP_ID,
      productId,
      newStockQuantity: Number(newStockQuantity),
      reason,
      notes,
      actorId: auth.user.id,
    });

    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/admin/dashboard');
      revalidatePath('/inventory/dashboard');
      revalidatePath('/inventory/movements');
    } catch {}

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
