import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ValidationError } from '@/lib/errors';

export async function GET() {
  try {
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
    const body = await request.json();
    const { fullName, email, phone, roleCode = 'cashier', passwordHash } = body;

    if (!fullName || !email) {
      throw new ValidationError('User full name and email are required.');
    }

    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new ValidationError(`Role "${roleCode}" is not recognized.`);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
          passwordHash: passwordHash ?? '$argon2id$v=19$m=65536,t=3,p=4$default_placeholder',
          status: 'active',
        },
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: role.id,
        },
      });

      return createdUser;
    });

    return jsonSuccess(user, 201);
  } catch (error) {
    return jsonError(error);
  }
}
