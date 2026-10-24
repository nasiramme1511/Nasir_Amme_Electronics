import { NextRequest } from 'next/server';
import { RecoveryService } from '@/services/recoveryService';
import { requirePermission } from '@/lib/authGuard';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ValidationError, ForbiddenError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'users.manage');
    if (!auth.roles.includes('admin') && !auth.roles.includes('manager')) {
      throw new ForbiddenError('Only Administrators and Store Managers can access the recovery ticket queue.');
    }

    const tickets = await RecoveryService.listRecoveryTickets(auth.user.shopId || DEFAULT_SHOP_ID);
    return jsonSuccess(tickets);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'users.manage');
    if (!auth.roles.includes('admin')) {
      throw new ForbiddenError('Only Administrators can revoke staff recovery tickets.');
    }

    const body = await request.json();
    const { ticketId } = body;

    if (!ticketId) {
      throw new ValidationError('Ticket ID is required.');
    }

    const result = await RecoveryService.revokeTicket(ticketId, auth.user.id);
    return jsonSuccess({
      message: `Recovery ticket ${ticketId} has been revoked.`,
      result,
    });
  } catch (error) {
    return jsonError(error);
  }
}
