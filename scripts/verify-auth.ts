/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthService } from '../src/services/authService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

async function runAuthTests() {
  console.log('🧪 Starting Staff Authentication & RBAC Verification Suite...\n');

  // =========================================================================
  // Test Suite 1: Password Authentication & Negative Tests
  // =========================================================================
  console.log('--- Test Suite 1: Authentication & Credential Verification ---');

  // 1.1: Invalid password rejected
  try {
    await AuthService.login('nasir@amme-electronics.et', 'WrongPassword123!');
    assert(false, 'Auth: Invalid password must be rejected');
  } catch (err: any) {
    assert(err.statusCode === 401, 'Auth: Invalid password rejected with 401 Unauthorized');
  }

  // 1.2: Non-existent user rejected
  try {
    await AuthService.login('ghost@amme-electronics.et', 'AmmeAdmin#2026!');
    assert(false, 'Auth: Non-existent email must be rejected');
  } catch (err: any) {
    assert(err.statusCode === 401, 'Auth: Non-existent email rejected with 401 Unauthorized');
  }

  // 1.3: Successful login for Admin
  const adminLogin = await AuthService.login(
    'nasir@amme-electronics.et',
    'AmmeAdmin#2026!',
    { ipAddress: '127.0.0.1', userAgent: 'VerificationSuite/1.0' }
  );
  assert(!!adminLogin.token, 'Auth: Admin login generates secure token');
  assert(adminLogin.user.roles.includes('admin'), 'Auth: Admin user has "admin" role');
  assert(adminLogin.user.permissions.length === 13, 'Auth: Admin has all 13 permissions');

  // 1.4: Successful login for Manager
  const managerLogin = await AuthService.login(
    'yonas@amme-electronics.et',
    'YonasManager#2026!'
  );
  assert(managerLogin.user.roles.includes('manager'), 'Auth: Manager user has "manager" role');
  assert(managerLogin.user.permissions.length === 11, 'Auth: Manager has 11 permissions');
  assert(!managerLogin.user.permissions.includes('users.manage'), 'Auth: Manager lacks users.manage');

  // 1.5: Successful login for Cashier
  const cashierLogin = await AuthService.login(
    'tigist@amme-electronics.et',
    'TigistCashier#2026!'
  );
  assert(cashierLogin.user.roles.includes('cashier'), 'Auth: Cashier user has "cashier" role');
  assert(cashierLogin.user.permissions.includes('sales.checkout'), 'Auth: Cashier has sales.checkout');
  assert(!cashierLogin.user.permissions.includes('purchases.receive'), 'Auth: Cashier lacks purchases.receive');

  // 1.6: Successful login for Stock Keeper
  const stockLogin = await AuthService.login(
    'abel@amme-electronics.et',
    'AbelStock#2026!'
  );
  assert(stockLogin.user.roles.includes('stock_keeper'), 'Auth: Stock Keeper user has "stock_keeper" role');
  assert(stockLogin.user.permissions.includes('purchases.receive'), 'Auth: Stock Keeper has purchases.receive');
  assert(!stockLogin.user.permissions.includes('sales.checkout'), 'Auth: Stock Keeper lacks sales.checkout');

  // =========================================================================
  // Test Suite 2: Session Validation & Token Security
  // =========================================================================
  console.log('\n--- Test Suite 2: Session Validation & Invariants ---');

  // 2.1: Validate active session token
  const validated = await AuthService.validateSession(adminLogin.token);
  assert(validated.user.email === 'nasir@amme-electronics.et', 'Session: Token resolves correct user identity');
  assert(validated.session.userId === adminLogin.user.id, 'Session: Token matches database userId');

  // 2.2: Empty or malformed token rejected
  try {
    await AuthService.validateSession('');
    assert(false, 'Session: Empty token must fail');
  } catch (err: any) {
    assert(err.statusCode === 401, 'Session: Empty token rejected with 401');
  }

  // 2.3: Tampered token rejected
  try {
    await AuthService.validateSession(adminLogin.token.substring(0, 30) + 'invalid');
    assert(false, 'Session: Tampered token must fail');
  } catch (err: any) {
    assert(err.statusCode === 401, 'Session: Tampered token rejected with 401');
  }

  // =========================================================================
  // Test Suite 3: Role-Based Access Control (RBAC) Boundaries
  // =========================================================================
  console.log('\n--- Test Suite 3: RBAC Authorization Boundaries ---');

  // 3.1: Cashier accessing users.manage must be rejected (403)
  const cashierAuth = await AuthService.validateSession(cashierLogin.token);
  const cashierHasUserManage = cashierAuth.user.roles.includes('admin') || cashierAuth.user.permissions.includes('users.manage');
  assert(!cashierHasUserManage, 'RBAC: Cashier cannot manage users (Forbidden 403)');

  // 3.2: Cashier accessing settings.manage must be rejected (403)
  const cashierHasSettingsManage = cashierAuth.user.roles.includes('admin') || cashierAuth.user.permissions.includes('settings.manage');
  assert(!cashierHasSettingsManage, 'RBAC: Cashier cannot modify shop settings (Forbidden 403)');

  // 3.3: Stock Keeper attempting POS checkout must be rejected (403)
  const stockAuth = await AuthService.validateSession(stockLogin.token);
  const stockHasPosCheckout = stockAuth.user.roles.includes('admin') || stockAuth.user.permissions.includes('sales.checkout');
  assert(!stockHasPosCheckout, 'RBAC: Stock keeper cannot process sales (Forbidden 403)');

  // 3.4: Manager attempting to manage users must be rejected (403)
  const managerAuth = await AuthService.validateSession(managerLogin.token);
  const managerHasUserManage = managerAuth.user.roles.includes('admin') || managerAuth.user.permissions.includes('users.manage');
  assert(!managerHasUserManage, 'RBAC: Store manager cannot manage staff accounts (Forbidden 403)');

  // 3.5: Manager viewing reports must be authorized
  const managerHasReportsView = managerAuth.user.roles.includes('admin') || managerAuth.user.permissions.includes('reports.view');
  assert(managerHasReportsView, 'RBAC: Store manager can view financial reports (Authorized)');

  // 3.6: Admin has universal access
  const adminAuth = await AuthService.validateSession(adminLogin.token);
  assert(adminAuth.user.roles.includes('admin'), 'RBAC: Admin has master authorization bypass');

  // =========================================================================
  // Test Suite 4: Session Revocation & Expiry
  // =========================================================================
  console.log('\n--- Test Suite 4: Session Revocation & Expiry ---');

  // 4.1: Logout revokes session
  await AuthService.logout(cashierLogin.token);
  try {
    await AuthService.validateSession(cashierLogin.token);
    assert(false, 'Logout: Revoked token must not be accepted');
  } catch (err: any) {
    assert(err.statusCode === 401, 'Logout: Revoked token rejected with 401 Unauthorized');
  }

  // 4.2: Revoke all user sessions
  await AuthService.revokeAllUserSessions(adminLogin.user.id);
  try {
    await AuthService.validateSession(adminLogin.token);
    assert(false, 'RevokeAll: All user tokens must be revoked');
  } catch (err: any) {
    assert(err.statusCode === 401, 'RevokeAll: Session rejected after mass revocation');
  }

  console.log('\n✨ ALL AUTHENTICATION AND RBAC TESTS PASSED WITH 100% INVARIANTS INTACT!\n');
}

if (require.main === module) {
  runAuthTests()
    .catch((err) => {
      console.error('Verification failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
