import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
import { requireRole } from '@/lib/authGuard';
import { hashPassword } from '@/lib/authCrypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('User', id);
    }

    return jsonSuccess({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles: user.userRoles.map((ur) => ur.role.code),
      permissions: Array.from(
        new Set(
          user.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map((rp) => rp.permission.code)
          )
        )
      ),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin').catch(() => null);
    const { id } = await params;
    const body = await request.json();
    const { fullName, email, phone, roleCode, status, password, temporaryPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user || user.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('User', id);
    }

    // Protect root admin from demotion or deactivation
    if (user.email === 'nasir@amme-electronics.et') {
      if ((roleCode && roleCode !== 'admin') || (status && status !== 'active')) {
        throw new ForbiddenError('Root administrator account cannot be deactivated or demoted.');
      }
    }

    // Prevent administrators from self-demoting
    if (auth && auth.user.id === id) {
      if ((roleCode && roleCode !== 'admin') || status === 'disabled' || status === 'inactive') {
        throw new ForbiddenError('Administrators cannot demote or deactivate their own active account.');
      }
    }

    const updateData: {
      fullName?: string;
      email?: string;
      phone?: string | null;
      status?: string;
      passwordHash?: string;
    } = {};

    if (fullName) updateData.fullName = fullName.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (status) updateData.status = status.toLowerCase();

    const plainPass = temporaryPassword || password;
    if (plainPass && plainPass.trim().length > 0) {
      updateData.passwordHash = await hashPassword(plainPass.trim());
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (roleCode) {
        const targetRole = await tx.role.findUnique({ where: { code: roleCode.toLowerCase() } });
        if (targetRole) {
          await tx.userRole.deleteMany({ where: { userId: id } });
          await tx.userRole.create({
            data: {
              userId: id,
              roleId: targetRole.id,
            },
          });
        }
      }

      const res = await tx.user.update({
        where: { id },
        data: updateData,
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          actorUserId: auth?.user?.id || id,
          entityType: 'User',
          entityId: id,
          action: 'UPDATE_STAFF_DETAILS',
          newValues: {
            email: res.email,
            status: res.status,
            role: roleCode,
          },
        },
      });

      return res;
    });

    return jsonSuccess({
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      roles: updatedUser.userRoles.map((r) => r.role.code),
      status: updatedUser.status,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin').catch(() => null);
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    if (!user || user.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('User', id);
    }

    if (auth && auth.user.id === id) {
      throw new ForbiddenError('You cannot delete your own active administrator account.');
    }

    if (user.email === 'nasir@amme-electronics.et') {
      throw new ForbiddenError('Primary root administrator account cannot be deleted.');
    }

    // Enterprise audit preservation: Never delete stock movements or purge users with transaction records
    const hasOperationalHistory = (user._count.sales > 0);

    if (hasOperationalHistory) {
      // Soft-deactivate to maintain ledger and audit trail integrity
      await prisma.$transaction(
        async (tx) => {
          await tx.user.update({
            where: { id },
            data: { status: 'inactive' },
          });
          await tx.session.deleteMany({ where: { userId: id } });
        },
        { timeout: 10000, maxWait: 5000 }
      );

      return jsonSuccess({
        message: 'Staff account has operational history and was safely deactivated/archived.',
        id,
        status: 'inactive',
      });
    } else {
      // Clean purge of zero-history account (never touch immutable stock movements)
      await prisma.$transaction(
        async (tx) => {
          await tx.session.deleteMany({ where: { userId: id } });
          await tx.userRole.deleteMany({ where: { userId: id } });
          await tx.user.delete({ where: { id } });
        },
        { timeout: 10000, maxWait: 5000 }
      );

      return jsonSuccess({
        message: 'Staff account successfully removed from database.',
        id,
      });
    }
  } catch (error) {
    return jsonError(error);
  }
}
