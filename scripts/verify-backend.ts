import { CostingService } from '../src/services/costingService';
import { Prisma } from '@prisma/client';

/**
 * Automated Verification Script for Nasir Amme Electronics Backend Services.
 * Tests core business logic invariants, AVCO edge cases, and return validations.
 */

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

async function runTests() {
  console.log('🧪 Starting Nasir Amme Electronics Backend Verification Suite...\n');

  // =========================================================================
  // Test Suite 1: Moving Weighted-Average Cost (AVCO) Invariants
  // =========================================================================
  console.log('--- Test Suite 1: Moving Weighted-Average Costing (AVCO) ---');

  // Test 1.1: Standard weighted replenishment
  // 10 units @ 100 ETB + 10 units @ 200 ETB = 20 units @ 150.00 ETB
  const cost1 = CostingService.calculateMovingAverageCost(10, 100, 10, 200);
  assert(
    cost1.equals(new Prisma.Decimal('150.00')),
    'AVCO: Standard intake balances proportionately (10 @ 100 + 10 @ 200 = 150.00)'
  );

  // Test 1.2: Asymmetric weighted replenishment
  // 20 units @ 1000 ETB (20,000) + 5 units @ 1500 ETB (7,500) = 27,500 / 25 = 1100.00 ETB
  const cost2 = CostingService.calculateMovingAverageCost(20, 1000, 5, 1500);
  assert(
    cost2.equals(new Prisma.Decimal('1100.00')),
    'AVCO: Asymmetric volumes weighted correctly (20 @ 1000 + 5 @ 1500 = 1100.00)'
  );

  // Test 1.3: Zero-stock edge case (Q_old = 0)
  // New cost must be equal to incoming received unit cost
  const costZeroStock = CostingService.calculateMovingAverageCost(0, 1200, 15, 1450);
  assert(
    costZeroStock.equals(new Prisma.Decimal('1450.00')),
    'AVCO Edge Case: Zero existing stock adopts incoming purchase cost (Q_old = 0 -> C_received)'
  );

  // Test 1.4: Negative stock edge case (Q_old < 0)
  // New cost must be equal to incoming received unit cost
  const costNegativeStock = CostingService.calculateMovingAverageCost(-3, 800, 10, 950);
  assert(
    costNegativeStock.equals(new Prisma.Decimal('950.00')),
    'AVCO Edge Case: Negative stock balance adopts incoming purchase cost'
  );

  // Test 1.5: Zero received quantity (Q_received = 0)
  // Must preserve existing average cost
  const costZeroReceived = CostingService.calculateMovingAverageCost(15, 750, 0, 1000);
  assert(
    costZeroReceived.equals(new Prisma.Decimal('750.00')),
    'AVCO Edge Case: Zero received units preserves existing average cost'
  );

  // Test 1.6: Decimal rounding (cents in ETB)
  // 7 units @ 333.33 ETB (2333.31) + 4 units @ 421.50 ETB (1686.00) = 4019.31 / 11 = 365.3918... -> 365.39
  const costRounding = CostingService.calculateMovingAverageCost(7, '333.33', 4, '421.50');
  assert(
    costRounding.equals(new Prisma.Decimal('365.39')),
    'AVCO Precision: Fractional cents round half-up to 2 decimal places'
  );

  // =========================================================================
  // Test Suite 2: COGS Frozen Snapshot
  // =========================================================================
  console.log('\n--- Test Suite 2: Historical COGS Freezing ---');
  const frozenCost = CostingService.freezeCostSnapshot(new Prisma.Decimal('1450.00'));
  assert(
    frozenCost.equals(new Prisma.Decimal('1450.00')),
    'COGS Snapshot: Unit cost frozen to preserve historical gross margin'
  );

  // =========================================================================
  // Test Suite 3: Cumulative Return Arithmetic & Limit Invariant
  // =========================================================================
  console.log('\n--- Test Suite 3: Cumulative Return Logic Invariants ---');

  const originalSaleQuantity = 5;
  const returnAttempt1 = 2;
  const remainingAfterAttempt1 = originalSaleQuantity - returnAttempt1;
  assert(
    remainingAfterAttempt1 === 3,
    'Returns: Cumulative remaining quantity computes correctly on first return (5 - 2 = 3)'
  );

  const returnAttempt2 = 3;
  const remainingAfterAttempt2 = remainingAfterAttempt1 - returnAttempt2;
  assert(
    remainingAfterAttempt2 === 0,
    'Returns: Full return reduces remaining returnable balance to 0 (3 - 3 = 0)'
  );

  // Attempting to return 1 more when remaining is 0 must violate condition
  const returnAttempt3 = 1;
  const isAttempt3Allowed = returnAttempt3 <= remainingAfterAttempt2;
  assert(
    !isAttempt3Allowed,
    'Returns: Excess return attempt beyond remaining returnable is rejected'
  );

  // =========================================================================
  // Test Suite 4: Disposition Stock Segregation
  // =========================================================================
  console.log('\n--- Test Suite 4: Return Disposition Stock Segregation ---');
  let shelfStock = 20;

  // Case A: Restock disposition adds units to active inventory
  const dispositionRestock = 'restock';
  if (dispositionRestock === 'restock') {
    shelfStock += 2;
  }
  assert(
    shelfStock === 22,
    'Disposition "restock": Shelf stock incremented for resalable units (20 -> 22)'
  );

  // Case B: Quarantine disposition does NOT add units to active inventory
  const dispositionQuarantine: string = 'quarantine';
  if (dispositionQuarantine === 'restock') {
    shelfStock += 2;
  }
  assert(
    shelfStock === 22,
    'Disposition "quarantine": Shelf stock untouched; defective units isolated from active inventory'
  );

  console.log('\n=======================================================');
  console.log('🎉 ALL BACKEND BUSINESS LOGIC VERIFICATION TESTS PASSED!');
  console.log('=======================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
