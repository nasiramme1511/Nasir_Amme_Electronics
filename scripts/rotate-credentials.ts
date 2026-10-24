import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

const STAFF_CREDENTIALS: Record<string, string> = {
  'nasir@amme-electronics.et': 'Nasir@Admin2026!',
  'admin@amme-electronics.et': 'Admin@Sec2026!',
  'muaz@amme-electronics.et': 'Muaz@Admin2026!',
  'yonas@amme-electronics.et': 'Yonas@Mgr2026!',
  'haji@amme-electronics.et': 'Haji@Mgr2026!',
  'tigist@amme-electronics.et': 'Tigist@Cashier2026!',
  'hamza@amme-electronics.et': 'Hamza@Cashier2026!',
  'abel@amme-electronics.et': 'Abel@Stock2026!',
};

async function rotateCredentials() {
  console.log('🔐 Rotating staff credentials to individual secure bcrypt hashes in PostgreSQL...');

  for (const [email, plainPassword] of Object.entries(STAFF_CREDENTIALS)) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          status: 'active',
        },
      });
      console.log(`✓ Updated credentials for ${user.fullName} (${email})`);
    } else {
      console.warn(`⚠️ User with email ${email} not found in database.`);
    }
  }

  console.log('✅ Credential rotation complete.');
}

rotateCredentials()
  .catch((err) => {
    console.error('❌ Error rotating credentials:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
