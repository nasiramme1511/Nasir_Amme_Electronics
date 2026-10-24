'use server';

import { revalidatePath } from 'next/cache';
import { PosService, CheckoutOrderInput } from '@/services/posService';
import { DEFAULT_SHOP_ID } from '@/lib/apiHelper';

export function revalidateInventoryRoutes() {
  try {
    revalidatePath('/admin/dashboard');
  } catch {}
  try {
    revalidatePath('/inventory/dashboard');
  } catch {}
  try {
    revalidatePath('/inventory/movements');
  } catch {}
}

export async function checkoutAction(input: CheckoutOrderInput) {
  const result = await PosService.checkout(input);
  revalidateInventoryRoutes();
  return result;
}

export async function processCheckout(payload: {
  cashierId: string;
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice?: number;
    discountAmount?: number;
    serialNumbers?: string[];
  }>;
  payments: Array<{
    method: 'cash' | 'telebirr' | 'cbe_birr' | 'bank_transfer' | 'credit';
    amount: number;
    amountTendered?: number;
    providerReference?: string;
  }>;
  discountTotal?: number;
  notes?: string;
  managerPin?: string;
  idempotencyKey?: string;
}) {
  const result = await PosService.checkout({
    shopId: DEFAULT_SHOP_ID,
    ...payload,
  });
  revalidateInventoryRoutes();
  return result;
}
