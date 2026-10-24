import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ValidationError, ForbiddenError } from '@/lib/errors';
import { requirePermission } from '@/lib/authGuard';
import { hashPassword } from '@/lib/authCrypto';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'users.manage');

    const users = await prisma.user.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
      },
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    const sanitized = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      status: u.status,
      roles: u.userRoles.map((ur) => ur.role.code),
      permissions: Array.from(
        new Set(
          u.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map((rp) => rp.permission.code)
          )
        )
      ),
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));

    return jsonSuccess(sanitized);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'users.manage');
    if (!auth.roles.includes('admin')) {
      throw new ForbiddenError('Only Administrators can register new staff accounts.');
    }

    const body = await request.json();
    const { fullName, email, phone, roleCode = 'cashier', password, initialPassword, temporaryPassword } = body;

    if (!fullName || !email) {
      throw new ValidationError('User full name and email are required.');
    }

    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new ValidationError(`Role "${roleCode}" is not recognized.`);

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let generatedPass = 'Amme-';
    for (let i = 0; i < 8; i++) {
      generatedPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const plainPassword = temporaryPassword || password || initialPassword || generatedPass;
    const passwordHashed = await hashPassword(plainPassword);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
          passwordHash: passwordHashed,
          status: 'active',
        },
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: role.id,
        },
      });

      await tx.auditLog.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          actorUserId: auth.user.id,
          entityType: 'User',
          entityId: createdUser.id,
          action: 'CREATE_USER',
          newValues: {
            email: createdUser.email,
            role: roleCode,
          },
        },
      });

      return createdUser;
    });

    return jsonSuccess({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: roleCode,
      status: user.status,
    }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'users.manage');
    if (!auth.roles.includes('admin')) {
      throw new ForbiddenError('Only Administrators can modify staff accounts or assign roles.');
    }

    const body = await request.json();
    const { userId, email, temporaryPassword, status, roleCode, fullName, phone } = body;

    if (!userId && !email) {
      throw new ValidationError('User ID or Email is required.');
    }

    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email: email.trim().toLowerCase() },
    });

    if (!user) {
      throw new ValidationError('User record not found.');
    }

    // Prevent administrators from self-demoting or self-deactivating
    if (auth && user.id === auth.user.id && (roleCode && roleCode !== 'admin' || status === 'disabled' || status === 'inactive')) {
      throw new ForbiddenError('Administrators cannot demote or deactivate their own active account.');
    }

    const updateData: {
      passwordHash?: string;
      status?: string;
      fullName?: string;
      phone?: string | null;
    } = {};

    if (temporaryPassword && temporaryPassword.trim().length > 0) {
      updateData.passwordHash = await hashPassword(temporaryPassword.trim());
    }

    if (status) {
      updateData.status = status;
    }

    if (fullName) {
      updateData.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null;
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (roleCode) {
        const role = await tx.role.findUnique({ where: { code: roleCode } });
        if (role) {
          await tx.userRole.deleteMany({ where: { userId: user.id } });
          await tx.userRole.create({
            data: { userId: user.id, roleId: role.id },
          });
        }
      }

      const res = await tx.user.update({
        where: { id: user.id },
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
          actorUserId: auth?.user?.id || user.id,
          entityType: 'User',
          entityId: user.id,
          action: temporaryPassword ? 'RESET_STAFF_PASSWORD' : 'UPDATE_USER',
          newValues: {
            email: res.email,
            status: res.status,
            passwordReset: !!temporaryPassword,
          },
        },
      });

      return res;
    });

    return jsonSuccess({
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      roles: updatedUser.userRoles.map((r) => r.role.code),
      status: updatedUser.status,
    });
  } catch (error) {
    return jsonError(error);
  }
}
