import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/authGuard';
import { verifyPassword, hashPassword } from '@/lib/authCrypto';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ValidationError, UnauthorizedError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required.');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long.');
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found.');
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new ValidationError('Current password is incorrect.');
    }

    const newHashed = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newHashed },
      });

      await tx.auditLog.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          actorUserId: user.id,
          entityType: 'User',
          entityId: user.id,
          action: 'PASSWORD_CHANGED',
          newValues: {
            method: 'self_service_profile',
            changedAt: new Date().toISOString(),
          },
        },
      });
    });

    return jsonSuccess({ message: 'Password updated successfully.' });
  } catch (error) {
    return jsonError(error);
  }
}
