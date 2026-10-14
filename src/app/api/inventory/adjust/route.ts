import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { InventoryService } from '@/services/inventoryService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, newStockQuantity, reason, notes, actorId } = body;

    const result = await InventoryService.performManualCorrection({
      shopId: DEFAULT_SHOP_ID,
      productId,
      newStockQuantity: Number(newStockQuantity),
      reason,
      notes,
      actorId,
    });

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}
