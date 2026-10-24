import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { CashSessionService } from '@/services/cashSessionService';
import { requireAuth } from '@/lib/authGuard';
import { OpenShiftSchema } from '@/lib/validations/shift';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const body = await request.json();
    const validated = OpenShiftSchema.parse(body);

    const session = await CashSessionService.openSession({
      shopId: DEFAULT_SHOP_ID,
      cashierId: auth.user.id,
      openingFloat: validated.openingFloat,
      notes: validated.notes,
    });

    return jsonSuccess({
      message: "Shift unlocked and cash float initialized.",
      session,
    }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
