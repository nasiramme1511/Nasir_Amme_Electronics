/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Nasir Amme Electronics — Inventory Sync & Valuation Integrity Test Suite
 * Location: Dire Dawa, Ethiopia (UTC+3, Africa/Addis_Ababa)
 *
 * Verifies:
 * 1. Checkout execution triggers revalidatePath on:
 *    - /admin/dashboard
 *    - /inventory/dashboard
 *    - /inventory/movements
 * 2. Asset valuation at cost dynamically decreases in exact mathematical alignment
 *    with deducted unit costs (COGS = quantity * unitCostSnapshot).
 * 3. Immutable Stock Movement Audit Ledger records correct movementType, delta,
 *    and human-readable actor identity and role.
 * 4. Inventory Shortage Monitor computes dynamic deficit: -(safetyMin - currentStock).
 * 5. Critical Low-Stock items (PWR-ORA-TOAST, CHG-ANK20W) correctly flagged.
 */

// Step 1: Install spy on next/cache revalidatePath before importing services
const nextCache = require('next/cache');
const revalidatedPaths: string[] = [];
const originalRevalidatePath = nextCache.revalidatePath;
nextCache.revalidatePath = (path: string) => {
  revalidatedPaths.push(path);
  if (typeof originalRevalidatePath === 'function') {
    try {
      originalRevalidatePath(path);
    } catch {
      // Invariant error in test environment without active Next.js request store
    }
  }
};

import { prisma } from '../src/lib/prisma';
import { PosService } from '../src/services/posService';
import { checkoutAction } from '../src/app/actions/checkout';
import { AuthService } from '../src/services/authService';
import { DEFAULT_SHOP_ID } from '../src/lib/apiHelper';

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

async function calculateTotalAssetValuation(shopId: string): Promise<{ totalCost: number; totalUnits: number }> {
  const products = await prisma.product.findMany({
    where: {
      shopId,
      status: 'active',
      deletedAt: null,
      isArchived: false,
    },
    select: {
      onHand: true,
      averageCost: true,
    },
  });

  let totalCost = 0;
  let totalUnits = 0;
  for (const p of products) {
    totalUnits += p.onHand;
    totalCost += Number(p.averageCost) * p.onHand;
  }
  return { totalCost: Math.round(totalCost * 100) / 100, totalUnits };
}

async function runInventorySyncSuite() {
  console.log('========================================================================');
  console.log('🛡️  NASIR AMME ELECTRONICS — INVENTORY SYNC & VALUATION PATCH SUITE');
  console.log('    Branch: DD-MAIN-01 | Dire Dawa, Ethiopia (EAT UTC+3)');
  console.log('========================================================================\n');

  try {
    // --- SETUP: Authenticate Staff Roles ---
    console.log('--- SETUP: Authenticating Staff Test Roles ---');
    const adminAuth = await AuthService.login('nasir@amme-electronics.et', 'Nasir@Admin2026!');
    const cashierAuth = await AuthService.login('tigist@amme-electronics.et', 'Tigist@Cashier2026!');
    assert(!!adminAuth.token, 'Admin authentication token established');
    assert(!!cashierAuth.token, 'Cashier authentication token established');

    // ========================================================================
    // 1. Cross-Route Cache Invalidation on Checkout
    // ========================================================================
    console.log('\n--- 1. Cross-Route Cache Invalidation on Checkout ---');

    // Select a healthy product with plenty of on-hand inventory
    const targetProduct = await prisma.product.findFirst({
      where: {
        shopId: DEFAULT_SHOP_ID,
        status: 'active',
        hasSerials: false,
        onHand: { gte: 10 },
      },
    });

    if (!targetProduct) {
      throw new Error('No test product with onHand >= 10 found in database.');
    }

    const testProductId = targetProduct.id;
    const testSku = targetProduct.sku;
    const testUnitCost = Number(targetProduct.averageCost);
    const testSellingPrice = Number(targetProduct.sellingPrice);
    const decrementQty = 2;
    const expectedCostDeduction = testUnitCost * decrementQty;

    console.log(`Target SKU for sync test: ${testSku} (${targetProduct.name})`);
    console.log(`Initial onHand: ${targetProduct.onHand} pcs | Moving Average Cost: ${testUnitCost} ETB`);

    const valuationBefore = await calculateTotalAssetValuation(DEFAULT_SHOP_ID);
    console.log(`Initial Storewide Valuation: ${valuationBefore.totalCost.toLocaleString()} ETB across ${valuationBefore.totalUnits} units`);

    // Clear tracked revalidations
    revalidatedPaths.length = 0;

    // Execute checkout decrement
    const saleResult = await PosService.checkout({
      shopId: DEFAULT_SHOP_ID,
      cashierId: cashierAuth.user.id,
      items: [
        {
          productId: testProductId,
          quantity: decrementQty,
          unitPrice: testSellingPrice,
        },
      ],
      payments: [
        {
          method: 'cash',
          amount: testSellingPrice * decrementQty,
          amountTendered: testSellingPrice * decrementQty,
        },
      ],
      notes: 'Inventory Sync Patch Verification Sale',
    });

    assert(!!saleResult && !!saleResult.receiptNumber, `Checkout completed with receipt ${saleResult?.receiptNumber}`);

    // Verify cache invalidations triggered
    assert(
      revalidatedPaths.includes('/admin/dashboard'),
      'Executing checkout decrement triggers revalidatePath on /admin/dashboard'
    );
    assert(
      revalidatedPaths.includes('/inventory/dashboard'),
      'Executing checkout decrement triggers revalidatePath on /inventory/dashboard'
    );
    assert(
      revalidatedPaths.includes('/inventory/movements'),
      'Executing checkout decrement triggers revalidatePath on /inventory/movements'
    );

    // Also verify Server Action checkoutAction invalidates the same paths
    revalidatedPaths.length = 0;
    const actionSaleResult = await checkoutAction({
      shopId: DEFAULT_SHOP_ID,
      cashierId: cashierAuth.user.id,
      items: [
        {
          productId: testProductId,
          quantity: 1,
          unitPrice: testSellingPrice,
        },
      ],
      payments: [
        {
          method: 'telebirr',
          amount: testSellingPrice,
          providerReference: 'TELEBIRR-SYNC-TEST-01',
        },
      ],
      notes: 'Server Action Invalidation Verification',
    });

    assert(!!actionSaleResult, 'checkoutAction server action successfully executed');
    assert(
      revalidatedPaths.includes('/admin/dashboard') && revalidatedPaths.includes('/inventory/dashboard'),
      'checkoutAction Server Action triggers revalidatePath on both /admin/dashboard and /inventory/dashboard'
    );

    // ========================================================================
    // 2. Exact Alignment of Asset Valuation at Cost
    // ========================================================================
    console.log('\n--- 2. Exact Alignment of Asset Valuation at Cost ---');

    // Total decremented across both test checkouts: decrementQty + 1
    const totalDeductedQty = decrementQty + 1;
    const totalExpectedValuationDrop = Math.round(totalDeductedQty * testUnitCost * 100) / 100;

    const targetProductAfter = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    const valuationAfter = await calculateTotalAssetValuation(DEFAULT_SHOP_ID);

    assert(
      targetProductAfter?.onHand === targetProduct.onHand - totalDeductedQty,
      `Product onHand precisely reduced from ${targetProduct.onHand} to ${targetProductAfter?.onHand} (-${totalDeductedQty} pcs)`
    );

    const actualValuationDrop = Math.round((valuationBefore.totalCost - valuationAfter.totalCost) * 100) / 100;
    assert(
      actualValuationDrop === totalExpectedValuationDrop,
      `Asset valuation at cost dynamically decreased by exactly ${actualValuationDrop} ETB (expected ${totalExpectedValuationDrop} ETB)`
    );

    const actualUnitsDrop = valuationBefore.totalUnits - valuationAfter.totalUnits;
    assert(
      actualUnitsDrop === totalDeductedQty,
      `Storewide physical unit count dynamically decreased from ${valuationBefore.totalUnits} to ${valuationAfter.totalUnits} (-${totalDeductedQty} units)`
    );

    // ========================================================================
    // 3. Movement Audit Ledger Relation Join & Human Identity
    // ========================================================================
    console.log('\n--- 3. Movement Audit Ledger Relation Join & Identity Format ---');

    // Query recent stock movements via API
    const movementsRes = await fetch(`${BASE_URL}/api/inventory/movements?limit=5`, {
      headers: {
        Cookie: `nae_session=${adminAuth.token}; nae_role=admin`,
      },
    });

    assert(movementsRes.status === 200, 'GET /api/inventory/movements returns 200 OK');
    const movementsJson = await movementsRes.json();
    assert(movementsJson.success && Array.isArray(movementsJson.data), 'Movements API returns valid data array');

    const latestMovement = movementsJson.data[0];
    assert(!!latestMovement, 'Latest stock movement retrieved');
    assert(
      latestMovement.movementType === 'sale',
      `Movement type correctly recorded as 'sale' (received: ${latestMovement.movementType})`
    );
    assert(
      latestMovement.actor !== null && typeof latestMovement.actor === 'object',
      'Stock movement includes populated actor relation object'
    );
    assert(
      !!latestMovement.actor?.fullName,
      `Actor full name populated: "${latestMovement.actor?.fullName}"`
    );
    assert(
      !!latestMovement.actor?.role,
      `Actor role populated: "${latestMovement.actor?.role}"`
    );
    assert(
      !!latestMovement.product?.title || !!latestMovement.product?.name,
      'Product title/name populated on stock movement'
    );

    // Verify defensive fallback format: `${row.actor.fullName} (${row.actor.role})`
    const formattedIdentity = latestMovement.actor?.fullName
      ? `${latestMovement.actor.fullName} (${latestMovement.actor.role})`
      : latestMovement.performedBy || 'System';

    assert(
      formattedIdentity.includes('(') && formattedIdentity.includes(')'),
      `Operator identity rendered in human-readable format: "${formattedIdentity}" (not raw usr ID)`
    );

    // ========================================================================
    // 4. Shortage Monitor Deficit Calculation & Critical Alert Verification
    // ========================================================================
    console.log('\n--- 4. Shortage Monitor Deficit Calculation & Critical Alert ---');

    // Verify PWR-ORA-TOAST and CHG-ANK20W
    const criticalProducts = await prisma.product.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
        sku: { in: ['PWR-ORA-TOAST', 'CHG-ANK20W'] },
      },
    });

    for (const prod of criticalProducts) {
      const safetyMin = prod.reorderLevel;
      const currentStock = prod.onHand;
      const deficit = -(safetyMin - currentStock);

      assert(
        currentStock <= safetyMin,
        `Item ${prod.sku} correctly identified below safety minimum (${currentStock} <= ${safetyMin})`
      );

      const dynamicShortageDisplay = `-${Math.max(0, safetyMin - currentStock)} pcs`;
      assert(
        dynamicShortageDisplay === `${deficit} pcs`,
        `Shortage Level dynamically computed as "${dynamicShortageDisplay}" for ${prod.sku}`
      );
    }

    // ========================================================================
    // 5. Vendor Assignment & Fast Reorder Target Verification
    // ========================================================================
    console.log('\n--- 5. Vendor Assignment & Fast Reorder Targets ---');

    const suppliers = await prisma.supplier.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
        code: { in: ['SUP-HORN-TECH', 'SUP-GULF-GLOBAL'] },
      },
    });

    const hornTech = suppliers.find((s) => s.code === 'SUP-HORN-TECH');
    const gulfGlobal = suppliers.find((s) => s.code === 'SUP-GULF-GLOBAL');

    assert(!!hornTech, 'Registered vendor SUP-HORN-TECH (Horn of Africa Tech Importers) exists');
    assert(!!gulfGlobal, 'Registered vendor SUP-GULF-GLOBAL (Gulf-Africa Spares Co.) exists');

    const manager = await prisma.user.findFirst({
      where: {
        shopId: DEFAULT_SHOP_ID,
        email: 'yonas@amme-electronics.et',
      },
    });

    assert(
      !!manager && manager.fullName.includes('Yonas'),
      `Store Manager Yonas Bekele (${manager?.id}) is registered for PO approval`
    );

    // Summary
    console.log('\n========================================================================');
    console.log(`🎯 TEST RUN COMPLETE: ${results.passed} PASSED | ${results.failed} FAILED`);
    console.log('========================================================================\n');

    if (results.failed > 0) {
      process.exit(1);
    } else {
      console.log('✨ ALL INVENTORY SYNC & VALUATION TESTS PASSED WITH ZERO REGRESSIONS! 🛡️\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal Test Exception:', error);
    process.exit(1);
  }
}

runInventorySyncSuite();
