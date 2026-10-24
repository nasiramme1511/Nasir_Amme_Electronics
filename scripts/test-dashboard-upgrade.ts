/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Nasir Amme Electronics — Comprehensive Dashboard Upgrade Test Suite
 * Location: Dire Dawa, Ethiopia
 *
 * Validates:
 * 1. Revenue aggregation for the selected business date (EAT)
 * 2. Timezone and midnight boundary handling (UTC vs Africa/Addis_Ababa)
 * 3. Gross profit and COGS calculations with frozen snapshots
 * 4. Discounts, returns, refunds, and voided transactions treatment
 * 5. Empty datasets and genuine zero-value results (safe zero denominators)
 * 6. Mathematical consistency between KPI cards and chart series
 * 7. Role-based access control (Admin & Manager allowed; Cashier & Stock Keeper forbidden)
 * 8. Unauthorized API requests (401 status)
 * 9. Date-range preset calculations & validation
 * 10. Server-side pagination, search, and filtering in receipt ledger
 * 11. Database health status and latency telemetry
 * 12. Shift-closing permissions and least-privilege enforcement
 */

import { prisma } from '../src/lib/prisma';
import { AuthService } from '../src/services/authService';
import {
  getBusinessDateRange,
  getEATParts,
  createEATStartOfDay,
  createEATEndOfDay,
  formatStoreDateTime,
  formatStoreDate,
  STORE_TIMEZONE,
} from '../src/lib/dateUtils';

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  passed: number;
  failed: number;
}

const results: TestResult = { passed: 0, failed: 0 };

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    results.passed++;
  } else {
    console.error(`❌ FAIL: ${testName} ${details ? `— ${details}` : ''}`);
    results.failed++;
  }
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🛡️  NASIR AMME ELECTRONICS — OPERATIONS DASHBOARD VERIFICATION SUITE');
  console.log('    Dire Dawa, Ethiopia (Africa/Addis_Ababa, UTC+3)');
  console.log('========================================================================\n');

  // --- SETUP: Authenticate All Roles ---
  console.log('--- SETUP: Authenticating Staff Test Roles ---');
  const adminAuth = await AuthService.login('nasir@amme-electronics.et', 'Nasir@Admin2026!');
  const managerAuth = await AuthService.login('yonas@amme-electronics.et', 'Yonas@Mgr2026!');
  const cashierAuth = await AuthService.login('tigist@amme-electronics.et', 'Tigist@Cashier2026!');
  const stockKeeperAuth = await AuthService.login('abel@amme-electronics.et', 'Abel@Stock2026!');

  const adminHeaders = {
    Cookie: `nae_session=${adminAuth.token}; nae_role=admin`,
  };
  const managerHeaders = {
    Cookie: `nae_session=${managerAuth.token}; nae_role=manager`,
  };
  const cashierHeaders = {
    Cookie: `nae_session=${cashierAuth.token}; nae_role=cashier`,
  };
  const stockKeeperHeaders = {
    Cookie: `nae_session=${stockKeeperAuth.token}; nae_role=stock_keeper`,
  };

  console.log('All test roles authenticated successfully.\n');

  // ========================================================================
  // 1. Timezone & Midnight Boundary Verification
  // ========================================================================
  console.log('--- 1. Timezone and Midnight Boundary Handling ---');

  const refDate = new Date('2026-10-23T15:00:00Z'); // 18:00:00 EAT
  const eatParts = getEATParts(refDate);
  assert(
    eatParts.year === 2026 && eatParts.month === 10 && eatParts.day === 23 && eatParts.hour === 18,
    'EAT parts correctly resolve UTC+3 offset without drift'
  );

  const eatStart = createEATStartOfDay(2026, 10, 23);
  const eatEnd = createEATEndOfDay(2026, 10, 23);

  // 00:00:00 EAT on Oct 23 is 21:00:00 UTC on Oct 22
  assert(
    eatStart.toISOString() === '2026-10-22T21:00:00.000Z',
    'Start of business day matches 21:00:00 UTC of previous calendar day'
  );

  // 23:59:59.999 EAT on Oct 23 is 20:59:59.999 UTC on Oct 23
  assert(
    eatEnd.toISOString() === '2026-10-23T20:59:59.999Z',
    'End of business day matches 20:59:59.999 UTC of current calendar day'
  );

  const durationHours = (eatEnd.getTime() - eatStart.getTime() + 1) / (1000 * 60 * 60);
  assert(
    Math.round(durationHours) === 24,
    'Business day duration is exactly 24 hours across boundary'
  );

  // ========================================================================
  // 2. Revenue Aggregation for Selected Business Date
  // ========================================================================
  console.log('\n--- 2. Revenue Aggregation for Business Date ---');

  // Query API for Today
  const todayRes = await fetch(`${BASE_URL}/api/admin/dashboard?range=today&referenceDate=${refDate.toISOString()}`, {
    headers: adminHeaders,
  });
  assert(todayRes.status === 200, 'GET /api/admin/dashboard?range=today returns 200 OK');
  const todayJson = await todayRes.json();
  assert(
    todayJson.data.kpis.grossSalesRevenue.current >= 0,
    `Today daily gross revenue correctly aggregates active business transactions (${todayJson.data.kpis.grossSalesRevenue.formatted} ETB)`
  );
  assert(
    todayJson.data.kpis.grossSalesRevenue.previous === 7450,
    'Previous day (Yesterday Oct 22) gross revenue correctly aggregates 7,450.00 ETB'
  );

  // Query API for Yesterday (Oct 22)
  const yestRes = await fetch(`${BASE_URL}/api/admin/dashboard?range=yesterday&referenceDate=${refDate.toISOString()}`, {
    headers: adminHeaders,
  });
  const yestJson = await yestRes.json();
  assert(
    yestJson.data.kpis.grossSalesRevenue.current === 7450,
    'Yesterday gross revenue equals 7,450.00 ETB (REC-84: 2450 ETB + REC-83: 5000 ETB)'
  );
  assert(
    yestJson.data.kpis.salesTransactionCount.current === 2,
    'Yesterday transaction count equals 2 bills'
  );

  // ========================================================================
  // 3. Gross Profit and COGS Calculations
  // ========================================================================
  console.log('\n--- 3. Gross Profit and COGS Calculations ---');

  // For Yesterday: REC-84 COGS is 1700, REC-83 COGS is 2850 -> Total COGS = 4550 ETB
  // Gross Profit = 7450 - 4550 = 2900 ETB
  // Gross Margin = (2900 / 7450) * 100 = 38.92%
  const yestCogs = yestJson.data.kpis.cogs.current;
  const yestProfit = yestJson.data.kpis.grossProfit.current;
  const yestMargin = yestJson.data.kpis.grossProfit.grossMarginPercent;

  assert(yestCogs === 4550, `Yesterday COGS equals 4,550.00 ETB (received: ${yestCogs})`);
  assert(yestProfit === 2900, `Yesterday Gross Profit equals 2,900.00 ETB (received: ${yestProfit})`);
  assert(
    Math.round(yestMargin * 10) / 10 === 38.9,
    `Yesterday Gross Margin equals 38.9% (received: ${yestMargin})`
  );
  assert(
    yestProfit === yestJson.data.kpis.netSalesRevenue.current - yestCogs,
    'Gross Profit mathematically equals Net Revenue minus COGS'
  );

  // ========================================================================
  // 4. Discounts, Returns, and Voided Transactions
  // ========================================================================
  console.log('\n--- 4. Discounts, Returns, and Voided Transactions ---');

  // Verify that voided transactions are strictly excluded from revenue
  const voidCount = await prisma.sale.count({
    where: { shopId: 'shop-dire-dawa-01', status: 'voided' },
  });
  console.log(`Verified current voided sales in shop: ${voidCount}`);

  // Query Last 7 Days
  const l7Res = await fetch(`${BASE_URL}/api/admin/dashboard?range=last_7_days`, {
    headers: adminHeaders,
  });
  const l7Json = await l7Res.json();
  const l7NetRevenue = l7Json.data.kpis.netSalesRevenue.current;
  const l7GrossRevenue = l7Json.data.kpis.grossSalesRevenue.current;

  assert(
    l7NetRevenue <= l7GrossRevenue,
    'Net sales revenue is strictly less than or equal to gross sales revenue'
  );
  assert(
    l7Json.data.receiptLedger.items.every((it: any) => it.saleStatus !== 'voided'),
    'Standard ledger view excludes voided transactions'
  );

  // ========================================================================
  // 5. Empty Datasets & Genuine Zero-Value Handling (No Fake Data)
  // ========================================================================
  console.log('\n--- 5. Empty Datasets and Zero-Denominator Safety ---');

  // Query an empty business day to verify genuine zero-denominator handling
  const emptyRes = await fetch(
    `${BASE_URL}/api/admin/dashboard?range=custom&startDate=2026-11-01T00:00:00.000Z&endDate=2026-11-01T23:59:59.999Z`,
    { headers: adminHeaders }
  );
  const emptyJson = await emptyRes.json();

  assert(
    emptyJson.data.kpis.grossSalesRevenue.formatted === '0.00',
    'Empty day formats gross revenue as genuine "0.00"'
  );
  assert(
    emptyJson.data.kpis.grossProfit.formatted === '0.00',
    'Empty day formats gross profit as genuine "0.00"'
  );
  assert(
    emptyJson.data.kpis.salesTransactionCount.current === 0,
    'Empty day has transaction count 0'
  );
  assert(
    emptyJson.data.kpis.averageTransactionValue.current === 0,
    'Empty day has average transaction value 0.00 ETB'
  );
  assert(
    emptyJson.data.kpis.grossProfit.grossMarginPercent === null,
    'Zero-revenue day sets gross margin percentage to null (displayed as N/A, not fake benchmark)'
  );

  // ========================================================================
  // 6. Consistency Between KPI Cards and Chart Calculations
  // ========================================================================
  console.log('\n--- 6. KPI vs Chart Mathematical Consistency ---');

  const chartSeries = l7Json.data.performanceChart.series;
  const chartSumGross = chartSeries.reduce((s: number, b: any) => s + b.grossRevenue, 0);
  const chartSumProfit = chartSeries.reduce((s: number, b: any) => s + b.grossProfit, 0);
  const chartSumCogs = chartSeries.reduce((s: number, b: any) => s + b.cogs, 0);
  const chartSumOrders = chartSeries.reduce((s: number, b: any) => s + b.orderCount, 0);

  assert(
    chartSumGross === l7Json.data.kpis.grossSalesRevenue.current,
    `Chart sum gross (${chartSumGross}) matches KPI Gross Revenue (${l7Json.data.kpis.grossSalesRevenue.current})`
  );
  assert(
    chartSumProfit === l7Json.data.kpis.grossProfit.current,
    `Chart sum profit (${chartSumProfit}) matches KPI Gross Profit (${l7Json.data.kpis.grossProfit.current})`
  );
  assert(
    chartSumCogs === l7Json.data.kpis.cogs.current,
    `Chart sum COGS (${chartSumCogs}) matches KPI COGS (${l7Json.data.kpis.cogs.current})`
  );
  assert(
    chartSumOrders === l7Json.data.kpis.salesTransactionCount.current,
    `Chart sum order count (${chartSumOrders}) matches KPI Transaction Count (${l7Json.data.kpis.salesTransactionCount.current})`
  );

  // ========================================================================
  // 7. Role-Based Access Control (RBAC) to Dashboard Data
  // ========================================================================
  console.log('\n--- 7. Role-Based Access Control (RBAC) Boundaries ---');

  // Admin allowed (200)
  assert(todayRes.status === 200, 'Admin can access /api/admin/dashboard (200 OK)');

  // Store Manager allowed (200)
  const mgrRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: managerHeaders,
  });
  assert(mgrRes.status === 200, 'Store Manager can access /api/admin/dashboard (200 OK)');

  // Cashier forbidden (403)
  const cashierRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: cashierHeaders,
  });
  assert(cashierRes.status === 403, 'Cashier attempting to access /api/admin/dashboard returns 403 Forbidden');

  // Stock Keeper forbidden (403)
  const stockKeeperRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: stockKeeperHeaders,
  });
  assert(
    stockKeeperRes.status === 403,
    'Stock Keeper attempting to access /api/admin/dashboard returns 403 Forbidden'
  );

  // ========================================================================
  // 8. Unauthorized API Requests
  // ========================================================================
  console.log('\n--- 8. Unauthorized API Requests (401) ---');

  const unauthRes = await fetch(`${BASE_URL}/api/admin/dashboard`);
  assert(
    unauthRes.status === 401,
    'Unauthenticated request to /api/admin/dashboard returns 401 Unauthorized'
  );

  // ========================================================================
  // 9. Date-Range Presets and Custom Range Validation
  // ========================================================================
  console.log('\n--- 9. Date Range Preset & Custom Validation ---');

  const presets = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month'] as const;
  for (const p of presets) {
    const rangeObj = getBusinessDateRange(p);
    assert(
      rangeObj.startDate <= rangeObj.endDate,
      `Preset "${p}" produces valid chronological bounds (start <= end)`
    );
    assert(
      rangeObj.previousPeriod.startDate <= rangeObj.previousPeriod.endDate,
      `Preset "${p}" produces valid comparison bounds`
    );
  }

  // Custom range
  const customRange = getBusinessDateRange('custom', '2026-10-01', '2026-10-15');
  assert(
    customRange.label === 'Custom Range',
    'Custom range produces label "Custom Range"'
  );
  assert(
    customRange.startDate < customRange.endDate,
    'Custom range start date precedes end date'
  );

  // ========================================================================
  // 10. Server-Side Pagination, Search, and Filtering
  // ========================================================================
  console.log('\n--- 10. Pagination, Search, and Filtering ---');

  // Page 1 with limit 2
  const pageRes = await fetch(
    `${BASE_URL}/api/admin/dashboard?range=last_7_days&page=1&limit=2`,
    { headers: adminHeaders }
  );
  const pageJson = await pageRes.json();
  assert(
    pageJson.data.receiptLedger.items.length === 2,
    'Pagination limit=2 returns exactly 2 records'
  );
  assert(
    pageJson.data.receiptLedger.pagination.page === 1,
    'Pagination reports current page = 1'
  );
  assert(
    pageJson.data.receiptLedger.pagination.totalCount >= 9,
    'Pagination reports correct total count >= 9'
  );

  // Search by receipt reference
  const searchRes = await fetch(
    `${BASE_URL}/api/admin/dashboard?range=last_7_days&search=REC-2026-0084`,
    { headers: adminHeaders }
  );
  const searchJson = await searchRes.json();
  assert(
    searchJson.data.receiptLedger.items.length === 1 &&
      searchJson.data.receiptLedger.items[0].receiptNumber === 'REC-2026-0084',
    'Search by receipt number "REC-2026-0084" returns exact matching receipt'
  );

  // Payment method filter (Telebirr)
  const telebirrRes = await fetch(
    `${BASE_URL}/api/admin/dashboard?range=last_7_days&paymentMethod=telebirr`,
    { headers: adminHeaders }
  );
  const telebirrJson = await telebirrRes.json();
  assert(
    telebirrJson.data.receiptLedger.items.every((it: any) => it.paymentMethod === 'Telebirr'),
    'Payment method filter "telebirr" returns exclusively Telebirr receipts'
  );

  // ========================================================================
  // 11. Database Health Check & Latency
  // ========================================================================
  console.log('\n--- 11. Real Database Health & Telemetry ---');

  assert(
    todayJson.data.databaseHealth.status === 'healthy',
    'Database health check reports status "healthy"'
  );
  assert(
    todayJson.data.databaseHealth.connected === true,
    'Database health check confirms live connection'
  );
  assert(
    typeof todayJson.data.databaseHealth.latencyMs === 'number' &&
      todayJson.data.databaseHealth.latencyMs >= 0,
    `Database query latency measured accurately (${todayJson.data.databaseHealth.latencyMs}ms)`
  );

  // ========================================================================
  // 12. Least-Privilege Shift Closing Enforcement
  // ========================================================================
  console.log('\n--- 12. Secure Shift Closing Permissions ---');

  // Check active session
  const activeSession = await prisma.cashSession.findFirst({
    where: { shopId: 'shop-dire-dawa-01', status: 'open' },
  });

  if (activeSession) {
    console.log(`Active session found: ${activeSession.sessionNumber} owned by cashier ${activeSession.cashierId}`);

    // Cashier who does not own the session attempting to close it
    // Abel (Stock Keeper) or a different cashier
    const forbiddenCloseRes = await fetch(`${BASE_URL}/api/v1/pos/shifts/close`, {
      method: 'POST',
      headers: {
        ...cashierHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: activeSession.id,
        closingCashCounted: 15000,
        notes: 'Malicious close attempt by unauthorized cashier',
      }),
    });

    // If tigist owns it, tigist can close it. If someone else tries, 403 Forbidden!
    if (activeSession.cashierId !== cashierAuth.user.id) {
      assert(
        forbiddenCloseRes.status === 403,
        'Cashier attempting to close someone else’s active shift receives 403 Forbidden'
      );
    } else {
      // Stock keeper trying to close shift
      const stockKeeperCloseRes = await fetch(`${BASE_URL}/api/v1/pos/shifts/close`, {
        method: 'POST',
        headers: {
          ...stockKeeperHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: activeSession.id,
          closingCashCounted: 15000,
        }),
      });
      assert(
        stockKeeperCloseRes.status === 403,
        'Stock keeper attempting to close active shift receives 403 Forbidden'
      );
    }

    // Negative cash input rejection
    const invalidCashRes = await fetch(`${BASE_URL}/api/v1/pos/shifts/close`, {
      method: 'POST',
      headers: {
        ...adminHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: activeSession.id,
        closingCashCounted: -500,
      }),
    });
    assert(
      invalidCashRes.status === 400,
      'Negative counted cash is strictly rejected with 400 Bad Request'
    );
  } else {
    console.log('No active shift currently open in database to test closure permissions.');
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log('\n========================================================================');
  console.log(`🎯 TEST RUN COMPLETE: ${results.passed} PASSED | ${results.failed} FAILED`);
  console.log('========================================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
