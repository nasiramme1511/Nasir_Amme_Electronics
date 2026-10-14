import { prisma } from '../src/lib/prisma';
import { InventoryService } from '../src/services/inventoryService';

async function main() {
  console.log('🔍 Starting Read-Only Stock vs Ledger Reconciliation Audit...');
  const shopId = 'shop-dire-dawa-01';

  const products = await prisma.product.findMany({
    where: { shopId },
    select: { id: true, sku: true, name: true, onHand: true },
  });

  let discrepanciesCount = 0;

  for (const p of products) {
    const rec = await InventoryService.reconcileLedgerBalance(shopId, p.id);
    if (!rec.isBalanced) {
      console.error(
        `❌ DISCREPANCY on ${p.sku} (${p.name}): onHand Cached = ${rec.onHandCached}, Ledger Sum = ${rec.ledgerComputed}`
      );
      discrepanciesCount++;
    } else {
      console.log(
        `✅ ${p.sku}: Cached onHand (${rec.onHandCached}) matches Ledger Sum (${rec.ledgerComputed})`
      );
    }
  }

  console.log(`\nReconciliation Completed: ${products.length} products checked, ${discrepanciesCount} discrepancies.`);
}

main()
  .catch((e) => {
    console.error('Reconciliation error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
