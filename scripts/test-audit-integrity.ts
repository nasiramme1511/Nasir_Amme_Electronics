/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Nasir Amme Electronics — Comprehensive Retail Audit & Anti-Theft Integrity Test Suite
 * Location: Dire Dawa, Ethiopia (Branch: DD-MAIN-01)
 * Currency: Ethiopian Birr (ETB)
 * Timezone: Africa/Addis_Ababa (UTC+3, EAT)
 *
 * Verifies:
 * 1. EAT Boundary Alignment (UTC+3, no DST, 21:00 UTC previous day boundary)
 * 2. Zero-Denominator Safety (Percentage changes with 0 previous period return null / 'N/A')
 * 3. Financial KPI Consistency (Gross Revenue, COGS, Gross Margin, Net Tender Reconciliation)
 * 4. Immutable Stock Movement Ledger (Intake and sales record append-only movements)
 * 5. Serialized Inventory Custody (IMEI/Serial lifecycle: in_stock -> sold atomic transition)
 * 6. Blind Cash Register Drop & Discrepancy Logging (Cashier counted cash vs expected cash difference)
 * 7. Four-Eyes Principle Manager PIN Authorization (Admin/Manager PIN verification & discount gating)
 */

import { prisma } from '../src/lib/prisma';
import { AuthService } from '../src/services/authService';
import { PosService } from '../src/services/posService';
import { CashSessionService } from '../src/services/cashSessionService';
import {
  getBusinessDateRange,
  getEATParts,
  createEATStartOfDay,
  createEATEndOfDay,
  STORE_TIMEZONE,
} from '../src/lib/dateUtils';
import { calculatePercentageChange, formatPercentageChange } from '../src/lib/formatters';

import { DEFAULT_SHOP_ID } from '../src/lib/apiHelper';

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

async function runAuditIntegrityTests() {
  console.log('========================================================================');
  console.log('🛡️  NASIR AMME ELECTRONICS — ZERO-THEFT AUDIT & INTEGRITY VERIFICATION');
  console.log('    Branch: DD-MAIN-01 | Dire Dawa, Ethiopia (EAT UTC+3)');
  console.log('========================================================================\n');

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: EAT Boundary & Timezone Alignment
    // ------------------------------------------------------------------------
    console.log('--- 1. Timezone and Business Midnight Boundary Alignment (EAT / UTC+3) ---');
    
    const sampleUtcDate = new Date('2026-10-23T15:30:00.000Z'); // 18:30:00 EAT
    const eatParts = getEATParts(sampleUtcDate);
    assert(
      eatParts.year === 2026 && eatParts.month === 10 && eatParts.day === 23 && eatParts.hour === 18 && eatParts.minute === 30,
      'EAT part extraction matches UTC+3 exactly without DST drift'
    );

    const startOfOct23EAT = createEATStartOfDay(2026, 10, 23);
    const endOfOct23EAT = createEATEndOfDay(2026, 10, 23);

    assert(
      startOfOct23EAT.toISOString() === '2026-10-22T21:00:00.000Z',
      '00:00:00 EAT on Oct 23 corresponds exactly to 21:00:00.000Z on Oct 22'
    );
    assert(
      endOfOct23EAT.toISOString() === '2026-10-23T20:59:59.999Z',
      '23:59:59.999 EAT on Oct 23 corresponds exactly to 20:59:59.999Z on Oct 23'
    );

    const todayRange = getBusinessDateRange('today');
    assert(
      todayRange.startDate < todayRange.endDate,
      'Today business date range generates strictly valid forward boundaries'
    );

    // ------------------------------------------------------------------------
    // SECTION 2: Zero-Denominator and Mathematical Safety
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Zero-Denominator Safety & Mathematical Precision ---');

    const zeroBaselineDelta = calculatePercentageChange(15000, 0);
    assert(
      zeroBaselineDelta === null,
      'Percentage change returns null when previous period is 0 (safe zero denominator)'
    );

    const formattedZeroDelta = formatPercentageChange(zeroBaselineDelta);
    assert(
      formattedZeroDelta === 'N/A',
      'Zero-denominator percentage formats safely as "N/A" (never NaN or 0%)'
    );

    const normalDelta = calculatePercentageChange(12000, 10000);
    assert(
      normalDelta === 20,
      'Normal positive period delta evaluates to +20.0%'
    );

    const negativeDelta = calculatePercentageChange(8000, 10000);
    assert(
      negativeDelta === -20,
      'Normal negative period delta evaluates to -20.0%'
    );

    // ------------------------------------------------------------------------
    // SECTION 3: Financial KPI Math & Inventory Valuation Consistency
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Financial KPI Math & Active Inventory Valuation ---');

    const activeProducts = await prisma.product.findMany({
      where: { shopId: DEFAULT_SHOP_ID, status: 'active', isArchived: false, deletedAt: null },
    });

    const calculatedAssetCost = activeProducts.reduce(
      (sum, p) => sum + Number(p.averageCost || p.costPrice || 0) * p.onHand,
      0
    );
    const calculatedRetailPotential = activeProducts.reduce(
      (sum, p) => sum + Number(p.sellingPrice) * p.onHand,
      0
    );

    assert(
      calculatedAssetCost > 400000 && calculatedAssetCost <= 460000,
      `Active product inventory valuation at cost (${calculatedAssetCost.toLocaleString()} ETB) is within expected audit range (~453,380 ETB)`
    );
    assert(
      calculatedRetailPotential >= calculatedAssetCost,
      `Retail potential (${calculatedRetailPotential.toLocaleString()} ETB) is >= inventory asset cost (${calculatedAssetCost.toLocaleString()} ETB)`
    );

    const lowStockCount = activeProducts.filter((p) => p.onHand <= p.reorderLevel).length;
    assert(
      lowStockCount === 2,
      `Low stock SKU count is deterministic (exactly 2 items below threshold: PWR-ORA-TOAST, CHG-ANK20W)`
    );

    // ------------------------------------------------------------------------
    // SECTION 4: Four-Eyes Principle Manager PIN Authorization
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Four-Eyes Principle Manager Security Authorization ---');

    // Test verifyManagerPin with valid and invalid PINs
    const validNasirPin = await AuthService.verifyManagerPin(DEFAULT_SHOP_ID, '1234');
    assert(
      validNasirPin.authorized === true && validNasirPin.managerName !== undefined,
      `Manager PIN "1234" successfully authenticates supervisor (${validNasirPin.managerName}) for Four-Eyes override`
    );

    const invalidPinResult = await AuthService.verifyManagerPin(DEFAULT_SHOP_ID, '9999');
    assert(
      invalidPinResult.authorized === false,
      'Invalid PIN "9999" is strictly rejected for supervisor authorization'
    );

    const emptyPinResult = await AuthService.verifyManagerPin(DEFAULT_SHOP_ID, '');
    assert(
      emptyPinResult.authorized === false,
      'Empty PIN is rejected unconditionally'
    );

    // ------------------------------------------------------------------------
    // SECTION 5: Serialized Inventory Custody (IMEI Lifecycle)
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Serialized Inventory Custody (IMEI / Serial Lifecycle) ---');

    // Find or create a serialized test product
    let serialProduct = await prisma.product.findFirst({
      where: { shopId: DEFAULT_SHOP_ID, hasSerials: true, status: 'active', isArchived: false, deletedAt: null },
    });

    if (!serialProduct) {
      serialProduct = await prisma.product.findFirst({
        where: { shopId: DEFAULT_SHOP_ID, status: 'active', isArchived: false, deletedAt: null },
      });
      if (serialProduct) {
        await prisma.product.update({
          where: { id: serialProduct.id },
          data: { hasSerials: true },
        });
      }
    }

    assert(
      serialProduct !== null,
      `Identified serialized custody product: ${serialProduct?.name} (${serialProduct?.sku})`
    );

    if (serialProduct) {
      const testSerialNum = `IMEI-TEST-${Date.now()}`;
      
      // Create test serial in status: 'in_stock'
      const createdSerial = await prisma.productSerial.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          productId: serialProduct.id,
          serialNumber: testSerialNum,
          status: 'in_stock',
        },
      });

      assert(
        createdSerial.status === 'in_stock' && createdSerial.serialNumber === testSerialNum,
        `New serialized item registered with initial status "in_stock" (${testSerialNum})`
      );

      // Verify PosService checkout validates serial custody
      const cashierUser = await prisma.user.findFirst({
        where: { shopId: DEFAULT_SHOP_ID, email: 'tigist@amme-electronics.et' },
      });

      if (cashierUser) {
        // Attempt checkout with serialized item
        const checkoutResult = await PosService.checkout({
          shopId: DEFAULT_SHOP_ID,
          cashierId: cashierUser.id,
          items: [
            {
              productId: serialProduct.id,
              quantity: 1,
              unitPrice: Number(serialProduct.sellingPrice),
              discountAmount: 0,
              serialNumbers: [testSerialNum],
            },
          ],
          payments: [
            {
              method: 'cash',
              amount: Number(serialProduct.sellingPrice),
            },
          ],
          notes: 'Automated Audit Verification Test Sale',
        });

        assert(
          checkoutResult !== null && checkoutResult.receiptNumber.startsWith('REC-'),
          `Checkout issued audit receipt: ${checkoutResult?.receiptNumber}`
        );

        // Check serial number status transition to 'sold'
        const updatedSerial = await prisma.productSerial.findUnique({
          where: { id: createdSerial.id },
        });

        assert(
          updatedSerial?.status === 'sold',
          `Serialized unit status atomically transitioned from "in_stock" to "sold"`
        );

        // Check immutable stock_movements ledger
        const movement = await prisma.stockMovement.findFirst({
          where: {
            shopId: DEFAULT_SHOP_ID,
            productId: serialProduct.id,
            referenceNumber: checkoutResult?.receiptNumber || '',
          },
          orderBy: { occurredAt: 'desc' },
        });

        assert(
          movement !== null && movement.quantityDelta === -1,
          `Immutable stock_movement record written with quantityDelta -1 and reference ${checkoutResult?.receiptNumber}`
        );
        assert(
          movement?.notes !== null && (movement?.notes?.includes(testSerialNum) || false),
          `Stock movement audit log contains serialized custody tracking (${testSerialNum})`
        );
      }
    }

    // ------------------------------------------------------------------------
    // SECTION 6: Blind Cash Register Drops & Discrepancy Reconciliation
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Blind Cash Register Drops & Discrepancy Reconciliation ---');

    const adminUser = await prisma.user.findFirst({
      where: { shopId: DEFAULT_SHOP_ID, email: 'nasir@amme-electronics.et' },
    });

    if (adminUser) {
      // Create a test cash session to verify blind drop math
      const sessionNumber = `CS-AUDIT-${Date.now().toString().slice(-6)}`;
      const openingFloat = 5000;
      const countedClosingCash = 4850; // 150 ETB deliberate shortage

      const testSession = await prisma.cashSession.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          cashierId: adminUser.id,
          sessionNumber,
          openingFloat,
          status: 'open',
          notes: 'Test shift session for blind drop reconciliation',
        },
      });

      // Close session with blind counted cash
      const closedSession = await CashSessionService.closeSession({
        shopId: DEFAULT_SHOP_ID,
        sessionId: testSession.id,
        closingCashCounted: countedClosingCash,
        closedBy: adminUser.id,
        notes: 'Blind register drop test with shortage',
      });

      assert(
        closedSession.status === 'closed',
        `Cash drawer session transitioned to status "closed"`
      );

      // Expected cash was 5000 (opening float + 0 cash sales)
      // Counted was 4850
      // Expected difference: 4850 - 5000 = -150
      const recordedDiff = Number(closedSession.cashDifference);
      assert(
        recordedDiff === -150,
        `Blind drop accurately recorded discrepancy variance: ${recordedDiff} ETB (expected -150 ETB shortage)`
      );

      // Verify audit log entry was written
      const sessionAuditLog = await prisma.auditLog.findFirst({
        where: {
          shopId: DEFAULT_SHOP_ID,
          entityType: 'cash_session',
          entityId: closedSession.id,
          action: 'CASH_SESSION_CLOSED',
        },
      });

      assert(
        sessionAuditLog !== null,
        `Immutable audit log written for CASH_SESSION_CLOSED with actor ID ${adminUser.id}`
      );
    }

    // ------------------------------------------------------------------------
    // SECTION 7: Four-Eyes Principle Discount Enforcement in PosService
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Four-Eyes Discount Enforcement in POS Service ---');

    const cashierUser = await prisma.user.findFirst({
      where: { shopId: DEFAULT_SHOP_ID, email: 'tigist@amme-electronics.et' },
    });
    const anyProduct = await prisma.product.findFirst({
      where: { shopId: DEFAULT_SHOP_ID, status: 'active', isArchived: false, deletedAt: null, hasSerials: false, onHand: { gt: 5 } },
    });

    if (cashierUser && anyProduct) {
      // 1. Attempt checkout with discount as cashier WITHOUT manager PIN -> MUST FAIL
      let failedAsExpected = false;
      try {
        await PosService.checkout({
          shopId: DEFAULT_SHOP_ID,
          cashierId: cashierUser.id,
          items: [
            {
              productId: anyProduct.id,
              quantity: 1,
              unitPrice: Number(anyProduct.sellingPrice),
              discountAmount: 100, // Discount applied
            },
          ],
          payments: [
            {
              method: 'cash',
              amount: Number(anyProduct.sellingPrice) - 100,
            },
          ],
          discountTotal: 100,
          // managerPin is deliberately omitted
        });
      } catch (err: any) {
        if (err.message.includes('Four-Eyes') || err.message.includes('Manager PIN')) {
          failedAsExpected = true;
        }
      }

      assert(
        failedAsExpected,
        'POS checkout strictly blocks cashier discount when manager PIN is missing (Four-Eyes enforcement)'
      );

      // 2. Attempt checkout with discount WITH valid manager PIN -> MUST SUCCEED
      let succeededWithPin = false;
      try {
        const approvedCheckout = await PosService.checkout({
          shopId: DEFAULT_SHOP_ID,
          cashierId: cashierUser.id,
          items: [
            {
              productId: anyProduct.id,
              quantity: 1,
              unitPrice: Number(anyProduct.sellingPrice),
              discountAmount: 100,
            },
          ],
          payments: [
            {
              method: 'cash',
              amount: Number(anyProduct.sellingPrice) - 100,
            },
          ],
          discountTotal: 100,
          managerPin: '1234', // Valid Manager PIN
        });

        if (approvedCheckout && approvedCheckout.receiptNumber) {
          succeededWithPin = true;
        }
      } catch (err: any) {
        console.error('Approved checkout failed unexpectedly:', err);
      }

      assert(
        succeededWithPin,
        'POS checkout with discount succeeds when valid manager PIN ("1234") is provided'
      );
    }

  } catch (globalError) {
    console.error('Fatal error during audit verification test suite:', globalError);
    results.failed++;
  }

  // ------------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 TEST EXECUTION SUMMARY: ${results.passed} PASSED | ${results.failed} FAILED`);
  console.log('========================================================================\n');

  if (results.failed > 0) {
    console.error(`💥 Audit verification failed with ${results.failed} errors.`);
    process.exit(1);
  } else {
    console.log('✨ ALL AUDIT AND INTEGRITY TESTS PASSED SUCCESSFULLY! 🛡️');
    process.exit(0);
  }
}

runAuditIntegrityTests();
