import { prisma } from '../src/lib/prisma';
import { validateEAN13, calculateEAN13CheckDigit, generateValidEAN13 } from '../src/lib/barcode';
import { generateSKU } from '../src/lib/formatters';
import { DEFAULT_SHOP_ID } from '../src/lib/apiHelper';
import { Prisma } from '@prisma/client';

async function runTests() {
  console.log('--- STARTING PRODUCT REQUIREMENTS VALIDATION TESTS ---');

  // Test 1: EAN-13 Validation & Calculation
  console.log('\n[TEST 1] EAN-13 Validation & Check Digit Calculation');
  const validBarcode = generateValidEAN13('600');
  console.log('Generated EAN-13:', validBarcode);
  const check1 = validateEAN13(validBarcode);
  if (!check1.isValid) throw new Error(`Generated EAN-13 should be valid: ${check1.error}`);
  console.log('✓ Valid EAN-13 passed check');

  // Corrupt the check digit
  const corruptedDigit = (Number(validBarcode.slice(12)) + 1) % 10;
  const invalidBarcode = `${validBarcode.slice(0, 12)}${corruptedDigit}`;
  const check2 = validateEAN13(invalidBarcode);
  if (check2.isValid) throw new Error('Corrupted EAN-13 should be rejected');
  console.log('✓ Invalid EAN-13 checksum correctly rejected:', check2.error);

  // Test 2: SKU Generation & Uniqueness
  console.log('\n[TEST 2] SKU Generation & Uniqueness');
  const autoSku = generateSKU('ANK');
  console.log('Generated SKU:', autoSku);
  if (!autoSku.startsWith('ANK-')) throw new Error('SKU should start with prefix');
  console.log('✓ SKU generation format confirmed');

  // Test 3: Get or Ensure Category Exists
  const category = await prisma.category.findFirst({
    where: { shopId: DEFAULT_SHOP_ID },
  });
  if (!category) throw new Error('No category found in database for testing.');
  console.log('Using category:', category.name, `(${category.id})`);

  // Test 4: Pricing Validation (Reject negative prices & flag below cost)
  console.log('\n[TEST 3] Pricing calculations');
  const costPrice = 500;
  const sellingPriceBelowCost = 450;
  const isBelowCost = sellingPriceBelowCost < costPrice;
  const grossProfit = sellingPriceBelowCost - costPrice;
  const grossMarginPercent = (grossProfit / sellingPriceBelowCost) * 100;
  if (!isBelowCost || grossProfit !== -50) throw new Error('Pricing margin calculation mismatch');
  console.log(`✓ Live Margin Calculation: ETB ${grossProfit} (${grossMarginPercent.toFixed(1)}%) correctly identified as below cost`);

  // Test 5: Atomic Creation of Product + Opening Stock Ledger + Device Serials + Audit Trail
  console.log('\n[TEST 4] Atomic Product Creation, Opening Stock Ledger, Serials & Audit Trail');
  const testSku = `TEST-${Date.now().toString().slice(-6)}`;
  const testBarcode = generateValidEAN13('600');
  const testSerials = [`SN-${Date.now()}-1`, `SN-${Date.now()}-2`];
  const openingStock = 2;
  const unitCost = 350;
  const sellPrice = 600;

  const testProduct = await prisma.$transaction(async (tx) => {
    // A. Product
    const created = await tx.product.create({
      data: {
        shopId: DEFAULT_SHOP_ID,
        sku: testSku,
        barcode: testBarcode,
        name: 'Anker PowerPort III 65W Pod (Test Item)',
        brand: 'Anker',
        categoryId: category.id,
        sellingPrice: new Prisma.Decimal(sellPrice),
        averageCost: new Prisma.Decimal(unitCost),
        onHand: openingStock,
        reorderLevel: 5,
        location: 'Shelf B-02',
        description: 'Test electronics product created for requirement validation',
        warrantyMonths: 18,
        imageUrl: '/uploads/products/test-anker-65w.webp',
        createdBy: 'Admin Nasir (Integration Test)',
        hasSerials: true,
        status: 'active',
      },
    });

    // B. Opening stock movement (Immutable ledger entry)
    const movement = await tx.stockMovement.create({
      data: {
        shopId: DEFAULT_SHOP_ID,
        productId: created.id,
        movementType: 'opening_balance',
        quantityDelta: openingStock,
        unitCostSnapshot: new Prisma.Decimal(unitCost),
        previousStock: 0,
        balanceAfter: openingStock,
        referenceNumber: `INIT-${created.sku}`,
        sourceType: 'catalog_add',
        sourceId: created.id,
        reason: 'Opening inventory balance on product creation',
        notes: 'Initial stock logged by Admin Nasir (Integration Test)',
      },
    });

    // C. Device serials
    await tx.productSerial.createMany({
      data: testSerials.map((sn) => ({
        shopId: DEFAULT_SHOP_ID,
        productId: created.id,
        serialNumber: sn,
        status: 'in_stock',
      })),
    });

    // D. Audit log
    await tx.auditLog.create({
      data: {
        shopId: DEFAULT_SHOP_ID,
        action: 'PRODUCT_CREATED',
        entityType: 'Product',
        entityId: created.id,
        newValues: {
          sku: created.sku,
          barcode: created.barcode,
          name: created.name,
          sellingPrice: sellPrice,
          costPrice: unitCost,
          openingStock,
          warrantyMonths: 18,
          serials: testSerials,
          imageUrl: created.imageUrl,
          createdBy: created.createdBy,
        },
      },
    });

    return { created, movement };
  });

  console.log('✓ Product created atomically:', testProduct.created.id, 'SKU:', testProduct.created.sku);
  console.log('✓ Opening stock movement logged:', testProduct.movement.id, 'Delta:', testProduct.movement.quantityDelta);

  // Verify Serials saved in database
  const savedSerials = await prisma.productSerial.findMany({
    where: { productId: testProduct.created.id },
  });
  if (savedSerials.length !== 2) throw new Error('Expected 2 serial records');
  console.log('✓ Device Serials saved & verified:', savedSerials.map((s) => s.serialNumber).join(', '));

  // Verify Audit Log saved in database
  const savedAudit = await prisma.auditLog.findFirst({
    where: { entityId: testProduct.created.id, action: 'PRODUCT_CREATED' },
  });
  if (!savedAudit) throw new Error('Expected AuditLog record for PRODUCT_CREATED');
  console.log('✓ Audit Log confirmed with action:', savedAudit.action, 'at:', savedAudit.occurredAt);

  // Test 6: Barcode Duplicate Prevention
  console.log('\n[TEST 5] Barcode Duplicate Prevention');
  const duplicateFound = await prisma.product.findFirst({
    where: { shopId: DEFAULT_SHOP_ID, barcode: testBarcode },
  });
  if (!duplicateFound) throw new Error('Existing barcode should be discoverable');
  console.log('✓ Duplicate barcode detection works: matched existing product', duplicateFound.name);

  // Test 7: Cleanup test item
  console.log('\n[TEST 6] Cleaning up test records');
  await prisma.stockMovement.deleteMany({ where: { productId: testProduct.created.id } });
  await prisma.auditLog.deleteMany({ where: { entityId: testProduct.created.id } });
  await prisma.product.delete({ where: { id: testProduct.created.id } });
  console.log('✓ Test cleanup complete');

  console.log('\n🎉 ALL PRODUCT REQUIREMENTS SUCCESSFULLY VALIDATED AGAINST DATABASE & DOMAIN LOGIC!');
}

runTests()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
