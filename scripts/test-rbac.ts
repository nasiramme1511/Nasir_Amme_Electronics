/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Nasir Amme Electronics — Comprehensive RBAC & Security Test Suite
 * Location: Dire Dawa, Ethiopia
 */

const BASE_URL = 'http://localhost:3000';

interface LoginResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      fullName: string;
      email: string;
      roles: string[];
      permissions: string[];
    };
  };
  error?: string;
}

async function loginUser(email: string, passwordPlain: string): Promise<{ tokenCookie: string; roleCookie: string; data: LoginResponse }> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: passwordPlain }),
  });

  const rawSetCookie = res.headers.get('set-cookie') || '';
  const tokenMatch = rawSetCookie.match(/nae_session=([^;]+)/);
  const roleMatch = rawSetCookie.match(/nae_role=([^;]+)/);

  const tokenCookie = tokenMatch ? `nae_session=${tokenMatch[1]}` : '';
  const roleCookie = roleMatch ? `nae_role=${roleMatch[1]}` : '';

  const data: LoginResponse = await res.json();
  return { tokenCookie, roleCookie, data };
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🛡️  NASIR AMME ELECTRONICS — RBAC & SECURITY VERIFICATION SUITE');
  console.log('    Dire Dawa, Ethiopia');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // --- 1. Authentication & Retired Password Tests ---
  console.log('\n--- 1. Authentication & Credential Security ---');
  
  const adminLogin = await loginUser('nasir@amme-electronics.et', 'Nasir@Admin2026!');
  assert(adminLogin.data.success && adminLogin.data.data?.user.roles.includes('admin') === true,
    'Admin login with unique credentials succeeds and returns admin role');

  const managerLogin = await loginUser('yonas@amme-electronics.et', 'Yonas@Mgr2026!');
  assert(managerLogin.data.success && managerLogin.data.data?.user.roles.includes('manager') === true,
    'Manager login with unique credentials succeeds and returns manager role');

  const cashierLogin = await loginUser('tigist@amme-electronics.et', 'Tigist@Cashier2026!');
  assert(cashierLogin.data.success && cashierLogin.data.data?.user.roles.includes('cashier') === true,
    'Cashier login with unique credentials succeeds and returns cashier role');

  const stockKeeperLogin = await loginUser('abel@amme-electronics.et', 'Abel@Stock2026!');
  assert(stockKeeperLogin.data.success && stockKeeperLogin.data.data?.user.roles.includes('stock_keeper') === true,
    'Stock Keeper login with unique credentials succeeds and returns stock_keeper role');

  const retiredPassAttempt = await loginUser('nasir@amme-electronics.et', 'Amme@2026');
  assert(retiredPassAttempt.data.success === false,
    'Retired shared password (Amme@2026) is strictly rejected');

  const invalidPassAttempt = await loginUser('nasir@amme-electronics.et', 'WrongPassword123!');
  assert(invalidPassAttempt.data.success === false,
    'Arbitrary incorrect password is strictly rejected');

  // --- 2. Unauthenticated API Boundary Tests ---
  console.log('\n--- 2. Unauthenticated Access Protection (401) ---');

  const unauthProducts = await fetch(`${BASE_URL}/api/products`);
  assert(unauthProducts.status === 401,
    'Direct unauthenticated request to /api/products returns 401');

  const unauthUsers = await fetch(`${BASE_URL}/api/users`);
  assert(unauthUsers.status === 401,
    'Direct unauthenticated request to /api/users returns 401');

  const unauthSales = await fetch(`${BASE_URL}/api/sales`);
  assert(unauthSales.status === 401,
    'Direct unauthenticated request to /api/sales returns 401');

  const unauthPurchases = await fetch(`${BASE_URL}/api/purchases`);
  assert(unauthPurchases.status === 401,
    'Direct unauthenticated request to /api/purchases returns 401');

  // --- 3. Role-Based Access Control Boundaries (403) ---
  console.log('\n--- 3. Role-Based Access Control Boundaries (403) ---');

  // Cashier forbidden areas
  const cashierReports = await fetch(`${BASE_URL}/api/reports/summary`, {
    headers: { Cookie: cashierLogin.tokenCookie },
  });
  assert(cashierReports.status === 403,
    'Cashier attempting to view financial reports returns 403 Forbidden');

  const cashierPurchases = await fetch(`${BASE_URL}/api/purchases`, {
    headers: { Cookie: cashierLogin.tokenCookie },
  });
  assert(cashierPurchases.status === 403,
    'Cashier attempting to view purchases returns 403 Forbidden');

  const cashierUsers = await fetch(`${BASE_URL}/api/users`, {
    headers: { Cookie: cashierLogin.tokenCookie },
  });
  assert(cashierUsers.status === 403,
    'Cashier attempting to view staff directory returns 403 Forbidden');

  const cashierMovements = await fetch(`${BASE_URL}/api/inventory/movements`, {
    headers: { Cookie: cashierLogin.tokenCookie },
  });
  assert(cashierMovements.status === 403,
    'Cashier attempting to view stock movements returns 403 Forbidden');

  // Stock Keeper forbidden areas
  const stockReports = await fetch(`${BASE_URL}/api/reports/summary`, {
    headers: { Cookie: stockKeeperLogin.tokenCookie },
  });
  assert(stockReports.status === 403,
    'Stock Keeper attempting to view financial reports returns 403 Forbidden');

  const stockUsers = await fetch(`${BASE_URL}/api/users`, {
    headers: { Cookie: stockKeeperLogin.tokenCookie },
  });
  assert(stockUsers.status === 403,
    'Stock Keeper attempting to view staff administration returns 403 Forbidden');

  const stockSettings = await fetch(`${BASE_URL}/api/settings`, {
    headers: { Cookie: stockKeeperLogin.tokenCookie },
  });
  assert(stockSettings.status === 403,
    'Stock Keeper attempting to access shop settings returns 403 Forbidden');

  const adminSettings = await fetch(`${BASE_URL}/api/settings`, {
    headers: { Cookie: adminLogin.tokenCookie },
  });
  assert(adminSettings.status === 200,
    'Admin can access and manage shop settings');

  // Manager forbidden areas (staff admin)
  const managerUsers = await fetch(`${BASE_URL}/api/users`, {
    headers: { Cookie: managerLogin.tokenCookie },
  });
  assert(managerUsers.status === 403,
    'Store Manager attempting to access staff administration returns 403 Forbidden');

  // Manager allowed areas
  const managerReports = await fetch(`${BASE_URL}/api/reports/summary`, {
    headers: { Cookie: managerLogin.tokenCookie },
  });
  assert(managerReports.status === 200,
    'Store Manager can view authorized operational reports');

  const managerPurchases = await fetch(`${BASE_URL}/api/purchases`, {
    headers: { Cookie: managerLogin.tokenCookie },
  });
  assert(managerPurchases.status === 200,
    'Store Manager can view purchase orders');

  // --- 4. Privilege Escalation & Self-Demotion Defense ---
  console.log('\n--- 4. Privilege Escalation & Tamper Resistance ---');

  // Non-admin attempting to promote themselves or change roles
  const escalateAttempt = await fetch(`${BASE_URL}/api/users`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: managerLogin.tokenCookie,
    },
    body: JSON.stringify({
      userId: managerLogin.data.data?.user.id,
      roleCode: 'admin',
    }),
  });
  assert(escalateAttempt.status === 403,
    'Non-admin cannot assign roles or escalate privileges (returns 403)');

  // Admin cannot deactivate their own active account
  const selfDeactivateAttempt = await fetch(`${BASE_URL}/api/users`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminLogin.tokenCookie,
    },
    body: JSON.stringify({
      userId: adminLogin.data.data?.user.id,
      status: 'disabled',
    }),
  });
  assert(selfDeactivateAttempt.status === 403,
    'Administrator cannot demote or deactivate their own active account (returns 403)');

  // --- 5. Data Scoping & Wholesale Cost Redaction ---
  console.log('\n--- 5. Data Scoping & Information Leakage Protection ---');

  // Cashier GET /api/products must have averageCost redacted
  const cashierProductsRes = await fetch(`${BASE_URL}/api/products`, {
    headers: { Cookie: cashierLogin.tokenCookie },
  });
  const cashierProductsJson = await cashierProductsRes.json();
  const hasAverageCostLeaked = cashierProductsJson.data && cashierProductsJson.data.some((p: any) => p.averageCost !== undefined);
  assert(cashierProductsRes.status === 200 && !hasAverageCostLeaked,
    'Cashier product lookup redacts wholesale cost (averageCost is not exposed)');

  // Admin GET /api/products retains averageCost
  const adminProductsRes = await fetch(`${BASE_URL}/api/products`, {
    headers: { Cookie: adminLogin.tokenCookie },
  });
  const adminProductsJson = await adminProductsRes.json();
  const adminHasAverageCost = adminProductsJson.data && adminProductsJson.data.some((p: any) => p.averageCost !== undefined);
  assert(adminProductsRes.status === 200 && adminHasAverageCost,
    'Admin retains access to product wholesale costs and valuation');

  // Cashier GET /api/sales is scoped to their own cashierId
  const cashierSalesRes = await fetch(`${BASE_URL}/api/sales`, {
    headers: { Cookie: cashierLogin.tokenCookie },
  });
  const cashierSalesJson = await cashierSalesRes.json();
  const otherCashierSalesFound = cashierSalesJson.data && cashierSalesJson.data.some(
    (s: any) => s.cashierId && s.cashierId !== cashierLogin.data.data?.user.id
  );
  assert(cashierSalesRes.status === 200 && !otherCashierSalesFound,
    'Cashier sales query is strictly scoped to own cashier transactions');

  // --- 6. Business Operations Integrity ---
  console.log('\n--- 6. Business Operations Integrity ---');

  const categoriesRes = await fetch(`${BASE_URL}/api/categories`, {
    headers: { Cookie: cashierLogin.tokenCookie },
  });
  assert(categoriesRes.status === 200,
    'Categories catalog loads properly for active staff');

  const suppliersRes = await fetch(`${BASE_URL}/api/suppliers`, {
    headers: { Cookie: stockKeeperLogin.tokenCookie },
  });
  assert(suppliersRes.status === 200,
    'Suppliers directory is accessible to Stock Keeper for inbound receiving');

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
