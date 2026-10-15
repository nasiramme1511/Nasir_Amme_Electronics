import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ValidationError } from '@/lib/errors';
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

    const body = await request.json();
    const { fullName, email, phone, roleCode = 'cashier', password, initialPassword } = body;

    if (!fullName || !email) {
      throw new ValidationError('User full name and email are required.');
    }

    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new ValidationError(`Role "${roleCode}" is not recognized.`);

    const plainPassword = password || initialPassword || 'Amme@2026';
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
