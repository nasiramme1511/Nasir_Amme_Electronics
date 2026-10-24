import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Emergency Admin Credential & Email Recovery Script
 * -------------------------------------------------------------
 * Shop: Nasir Amme Electronics
 * Location: Dire Dawa, Ethiopia
 * 
 * Usage Examples:
 *   1. Emergency reset with default strong temporary password:
 *      npm run admin:reset
 * 
 *   2. Set a custom new password:
 *      npm run admin:reset -- --password="MyNewStrongPassword2026!"
 * 
 *   3. If Admin ALSO lost their email and needs to change login email:
 *      npm run admin:reset -- --new-email="nasir.emergency@gmail.com" --password="MyNewPassword123!"
 * 
 *   4. Direct invocation via tsx:
 *      npx tsx scripts/reset-admin-password.ts --new-email="admin@amme-electronics.et" --password="NewPassword!"
 */

interface CliArgs {
  targetEmail?: string;
  newEmail?: string;
  password?: string;
}

function parseCliArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {};

  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      parsed.targetEmail = arg.replace('--email=', '').trim();
    } else if (arg.startsWith('--new-email=')) {
      parsed.newEmail = arg.replace('--new-email=', '').trim();
    } else if (arg.startsWith('--password=')) {
      parsed.password = arg.replace('--password=', '').trim();
    }
  }

  return parsed;
}

async function main() {
  const { targetEmail, newEmail, password } = parseCliArgs();

  console.log('\n=============================================================');
  console.log('⚡ NASIR AMME ELECTRONICS — EMERGENCY ADMIN RECOVERY TOOL');
  console.log('   Dire Dawa, Ethiopia');
  console.log('=============================================================\n');

  try {
    // 1. Locate the Administrator account
    let adminUser = null;

    if (targetEmail) {
      adminUser = await prisma.user.findUnique({
        where: { email: targetEmail },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    } else {
      // Find user with 'admin' role
      const adminRole = await prisma.role.findUnique({
        where: { code: 'admin' },
      });

      if (adminRole) {
        const userRole = await prisma.userRole.findFirst({
          where: { roleId: adminRole.id },
          include: {
            user: {
              include: {
                userRoles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
        });
        if (userRole?.user) {
          adminUser = userRole.user;
        }
      }

      // Fallback: look for nasir@amme-electronics.et
      if (!adminUser) {
        adminUser = await prisma.user.findUnique({
          where: { email: 'nasir@amme-electronics.et' },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        });
      }
    }

    if (!adminUser) {
      console.error('❌ Error: Could not find Administrator account in the database.');
      console.error('   Please provide --email=<current-admin-email>');
      process.exit(1);
    }

    const currentEmail = adminUser.email;
    const finalEmail = newEmail || currentEmail;
    const finalPlainPassword = password || 'AmmeAdmin#2026Recovered!';

    console.log(`👤 Target Admin Found: ${adminUser.fullName}`);
    console.log(`📧 Current Database Email: ${currentEmail}`);
    if (newEmail && newEmail !== currentEmail) {
      console.log(`🔄 Migrating Email To:     ${newEmail}`);
    }

    // 2. Hash new password with bcrypt (salt rounds = 12)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(finalPlainPassword, saltRounds);

    // 3. Atomically update user credentials and invalidate prior sessions
    await prisma.$transaction(async (tx) => {
      // Invalidate existing active sessions for security
      await tx.session.deleteMany({
        where: { userId: adminUser.id },
      });

      // Update password hash, status to active, and email if changed
      await tx.user.update({
        where: { id: adminUser.id },
        data: {
          email: finalEmail,
          passwordHash: hashedPassword,
          status: 'active',
          updatedAt: new Date(),
        },
      });

      // Log to AuditLog if table exists
      try {
        await tx.auditLog.create({
          data: {
            shopId: adminUser.shopId,
            actorUserId: adminUser.id,
            action: 'EMERGENCY_ADMIN_CREDENTIAL_RESET',
            entityType: 'User',
            entityId: adminUser.id,
            newValues: {
              reason: 'Direct CLI Emergency Recovery (Admin Lost Email/Password)',
              previousEmail: currentEmail,
              updatedEmail: finalEmail,
              executedBy: 'SYSTEM_CONSOLE_CLI',
            },
          },
        });
      } catch {
        // Audit log table might be optional in certain test schemas
      }
    });

    console.log('\n✅ EMERGENCY RECOVERY COMPLETED SUCCESSFULLY!');
    console.log('-------------------------------------------------------------');
    console.log(`🔑 Login Email:    ${finalEmail}`);
    console.log(`🔐 New Password:   ${finalPlainPassword}`);
    console.log(`🛡️  Role Clearance: ADMINISTRATOR / OWNER (Full Access)`);
    console.log(`🌐 Login URL:      http://localhost:3000/login`);
    console.log('-------------------------------------------------------------');
    console.log('⚠️  Notice: All previous active sessions were invalidated for security.');
    console.log('    The Admin can now log in immediately without needing external email.\n');
  } catch (error) {
    console.error('❌ Failed to reset Admin credentials:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
