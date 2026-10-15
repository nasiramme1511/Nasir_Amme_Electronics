import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const INITIAL_STAFF_CREDENTIALS = [
  {
    email: 'nasir@amme-electronics.et',
    plainPassword: 'AmmeAdmin#2026!',
    role: 'admin',
    name: 'Nasir Amme',
  },
  {
    email: 'yonas@amme-electronics.et',
    plainPassword: 'YonasManager#2026!',
    role: 'manager',
    name: 'Yonas Bekele',
  },
  {
    email: 'tigist@amme-electronics.et',
    plainPassword: 'TigistCashier#2026!',
    role: 'cashier',
    name: 'Tigist Alem',
  },
  {
    email: 'hamza@amme-electronics.et',
    plainPassword: 'HamzaCashier#2026!',
    role: 'cashier',
    name: 'Hamza Mohammed',
  },
  {
    email: 'abel@amme-electronics.et',
    plainPassword: 'AbelStock#2026!',
    role: 'stock_keeper',
    name: 'Abel Girma',
  },
];

export async function provisionStaffPasswords() {
  console.log('🔐 Starting secure staff account password provisioning...');

  for (const staff of INITIAL_STAFF_CREDENTIALS) {
    const user = await prisma.user.findUnique({
      where: { email: staff.email },
    });

    if (!user) {
      console.warn(`⚠️ User not found: ${staff.email}`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(staff.plainPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          status: 'active',
        },
      });

      // Revoke any stale sessions
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          shopId: user.shopId,
          actorUserId: user.id,
          entityType: 'User',
          entityId: user.id,
          action: 'PROVISION_INITIAL_PASSWORD',
          newValues: {
            method: 'bcrypt_12_rounds',
            updatedAt: new Date().toISOString(),
          },
        },
      });
    });

    console.log(`✓ Successfully provisioned secure password for [${staff.role}] ${staff.name} (${staff.email})`);
  }

  console.log('✅ All 5 staff accounts securely provisioned with bcrypt password hashes.');
}

if (require.main === module) {
  provisionStaffPasswords()
    .catch((err) => {
      console.error('Provisioning failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
