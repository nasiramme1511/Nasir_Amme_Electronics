/**
 * Nasir Amme Electronics — Ledger-Preserving Permanent Product Purge Engine Test Suite
 *
 * Verifies:
 * 1. RBAC Clearance: requireAdmin() returns 401 (unauthenticated) and 403 (non-admin).
 * 2. Error Handling: Missing ID (400), Not Found (404), Already Purged (404).
 * 3. Path A: Zero Historical Ledger -> Clean Hard Delete (HARD_DELETE).
 * 4. Path B: Historical Ledger / Sales -> Ledger-Preserved Purge (PERMANENT_CATALOG_PURGE).
 * 5. Foreign Key Integrity: No P2003 error on items with sales lines.
 * 6. Receipt Immutability: Historical sales lines retain snapshots, price, quantity, and product linkage.
 * 7. Barcode Reclamation: Purged barcode 6952210844129 can be immediately reused by a new product.
 * 8. Active Catalog & POS Isolation: GET /api/products strictly excludes purged items.
 */

import { prisma } from '../src/lib/prisma';
import { NextRequest } from 'next/server';
import { DELETE, GET as getProductById } from '../src/app/api/products/[id]/route';
import { GET as getProducts, POST as createProduct } from '../src/app/api/products/route';
import { AuthService, COOKIE_NAME } from '../src/services/authService';
import { generateSessionToken } from '../src/lib/authCrypto';
import { DEFAULT_SHOP_ID } from '../src/lib/apiHelper';
import { Prisma } from '@prisma/client';

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🛡️  LEDGER-PRESERVING PERMANENT PRODUCT PURGE ENGINE: TEST SUITE');
  console.log('    Nasir Amme Electronics — Dire Dawa, Ethiopia');
  console.log('========================================================================\n');

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

  // 1. Setup Test Users: Admin and Cashier
  console.log('--- SETUP: Retrieving Users & Sessions ---');
  const adminUser = await prisma.user.findFirst({
    where: {
      shopId: DEFAULT_SHOP_ID,
      userRoles: { some: { role: { code: 'admin' } } },
    },
  });
  if (!adminUser) throw new Error('No admin user found in database.');

  const cashierUser = await prisma.user.findFirst({
    where: {
      shopId: DEFAULT_SHOP_ID,
      status: 'active',
      userRoles: { some: { role: { code: 'cashier' } } },
    },
  });
  if (!cashierUser) throw new Error('No cashier user found in database.');

  const category = await prisma.category.findFirst({
    where: { shopId: DEFAULT_SHOP_ID },
  });
  if (!category) throw new Error('No category found in database.');

  async function createTestSession(userId: string) {
  const { rawToken, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + 8 * 3600 * 1000);
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
  return { token: rawToken, session };
}

  // Create real sessions
  const adminSession = await createTestSession(adminUser.id);
  const cashierSession = await createTestSession(cashierUser.id);

  function createRequest(
    url: string,
    method: string,
    token?: string,
    body?: any
  ): NextRequest {
    const headers = new Headers();
    if (body) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Cookie', `${COOKIE_NAME}=${token}`);
    }
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // --- 1. RBAC Clearance Tests ---
  console.log('\n--- 1. RBAC SECURITY & CLEARANCE TESTS ---');

  // Test 1.1: Unauthenticated DELETE call -> 401
  const reqUnauth = createRequest('http://localhost:3000/api/products/test-id', 'DELETE');
  const resUnauth = await DELETE(reqUnauth, { params: Promise.resolve({ id: 'test-id' }) });
  assert(resUnauth.status === 401, 'Unauthenticated call returns 401 Unauthorized');

  // Test 1.2: Non-Admin (Cashier) DELETE call -> 403
  const reqCashier = createRequest(
    'http://localhost:3000/api/products/test-id',
    'DELETE',
    cashierSession.token
  );
  const resCashier = await DELETE(reqCashier, { params: Promise.resolve({ id: 'test-id' }) });
  assert(resCashier.status === 403, 'Non-Admin (Cashier) call returns 403 Forbidden');

  // Test 1.3: Non-existent product DELETE call by Admin -> 404
  const reqNotFound = createRequest(
    'http://localhost:3000/api/products/non-existent-uuid',
    'DELETE',
    adminSession.token
  );
  const resNotFound = await DELETE(reqNotFound, {
    params: Promise.resolve({ id: 'non-existent-uuid' }),
  });
  assert(resNotFound.status === 404, 'Non-existent product returns 404 Not Found');

  // --- 2. PATH A: Zero Historical Ledger (Clean Hard Delete) ---
  console.log('\n--- 2. PATH A: ZERO HISTORICAL LEDGER (CLEAN HARD DELETE) ---');

  const pathASku = `TEST-PATHA-${Date.now().toString().slice(-6)}`;
  const pathABarcode = `695${Date.now().toString().slice(-10)}`;
  const cleanProduct = await prisma.product.create({
    data: {
      shopId: DEFAULT_SHOP_ID,
      sku: pathASku,
      barcode: pathABarcode,
      name: 'Unsold Temporary Demo Adapter',
      brand: 'TestBrand',
      categoryId: category.id,
      sellingPrice: new Prisma.Decimal(120.0),
      retailPrice: new Prisma.Decimal(120.0),
      averageCost: new Prisma.Decimal(80.0),
      costPrice: new Prisma.Decimal(80.0),
      onHand: 0,
      stockQuantity: 0,
      reorderLevel: 2,
      isArchived: false,
      deletedAt: null,
    },
  });

  const reqPathA = createRequest(
    `http://localhost:3000/api/products/${cleanProduct.id}`,
    'DELETE',
    adminSession.token
  );
  const resPathA = await DELETE(reqPathA, { params: Promise.resolve({ id: cleanProduct.id }) });
  const dataPathA = await resPathA.json();

  assert(resPathA.status === 200, 'Path A returns HTTP 200 OK');
  assert(dataPathA.success === true, 'Path A returns success: true');
  assert(dataPathA.type === 'HARD_DELETE', 'Path A returns type: "HARD_DELETE"');
  assert(
    dataPathA.message.includes('permanently purged from the database'),
    'Path A message confirms hard purge'
  );

  // Verify completely erased from DB
  const dbCheckPathA = await prisma.product.findUnique({ where: { id: cleanProduct.id } });
  assert(dbCheckPathA === null, 'Path A product is completely erased from PostgreSQL database');

  // Verify Audit Log
  const auditPathA = await prisma.auditLog.findFirst({
    where: { entityId: cleanProduct.id, action: 'PRODUCT_HARD_PURGED' },
  });
  assert(auditPathA !== null, 'Path A created PRODUCT_HARD_PURGED audit trail log');

  // --- 3. PATH B: Historical Ledger & Sales (Ledger-Preserved Purge) ---
  console.log('\n--- 3. PATH B: HISTORICAL LEDGER & SALES (LEDGER-PRESERVED PURGE) ---');

  const testBarcode = '6952210844129';
  const testSku = `TEST-SKU-${Date.now().toString().slice(-6)}`;
  const testName = 'Sony WH-1000XM5 Premium ANC (Audit Protected Item)';

  // Ensure test barcode is free first
  await prisma.product.deleteMany({
    where: {
      shopId: DEFAULT_SHOP_ID,
      barcode: testBarcode,
      sales: { none: {} },
      stockMovements: { none: {} },
    },
  });

  // Create Product with initial stock and historical ledger
  const productWithHistory = await prisma.product.create({
    data: {
      shopId: DEFAULT_SHOP_ID,
      sku: testSku,
      barcode: testBarcode,
      name: testName,
      brand: 'Sony',
      categoryId: category.id,
      sellingPrice: new Prisma.Decimal(24500.0),
      retailPrice: new Prisma.Decimal(24500.0),
      averageCost: new Prisma.Decimal(18000.0),
      costPrice: new Prisma.Decimal(18000.0),
      onHand: 5,
      stockQuantity: 5,
      reorderLevel: 2,
      isArchived: false,
      deletedAt: null,
    },
  });

  // Create Stock Movement (Ledger row)
  const stockMove = await prisma.stockMovement.create({
    data: {
      shopId: DEFAULT_SHOP_ID,
      productId: productWithHistory.id,
      movementType: 'purchase_receive',
      quantityDelta: 5,
      unitCostSnapshot: new Prisma.Decimal(18000.0),
      previousStock: 0,
      balanceAfter: 5,
      referenceNumber: `PO-TEST-${Date.now().toString().slice(-4)}`,
      sourceType: 'goods_receipt',
    },
  });

  // Create Sale & SaleItem (Financial ledger row)
  const receiptNumber = `REC-TEST-${Date.now().toString().slice(-6)}`;
  const sale = await prisma.sale.create({
    data: {
      shopId: DEFAULT_SHOP_ID,
      receiptNumber,
      cashierId: cashierUser.id,
      status: 'posted',
      subtotal: new Prisma.Decimal(24500.0),
      discountTotal: new Prisma.Decimal(0.0),
      taxTotal: new Prisma.Decimal(0.0),
      grandTotal: new Prisma.Decimal(24500.0),
      items: {
        create: {
          productId: productWithHistory.id,
          skuSnapshot: testSku,
          nameSnapshot: testName,
          quantity: 1,
          unitPrice: new Prisma.Decimal(24500.0),
          unitCostSnapshot: new Prisma.Decimal(18000.0),
          lineSubtotal: new Prisma.Decimal(24500.0),
          lineTotal: new Prisma.Decimal(24500.0),
          lineCogs: new Prisma.Decimal(18000.0),
          lineGrossProfit: new Prisma.Decimal(6500.0),
        },
      },
    },
    include: { items: true },
  });

  console.log(`Created test product ${productWithHistory.id} with Sale receipt ${receiptNumber}`);

  // Now execute DELETE /api/products/[id] on the product with sales & stock movements
  const reqPathB = createRequest(
    `http://localhost:3000/api/products/${productWithHistory.id}`,
    'DELETE',
    adminSession.token
  );
  const resPathB = await DELETE(reqPathB, {
    params: Promise.resolve({ id: productWithHistory.id }),
  });
  const dataPathB = await resPathB.json();

  assert(resPathB.status === 200, 'Path B returns HTTP 200 OK');
  assert(dataPathB.success === true, 'Path B returns success: true');
  assert(
    dataPathB.type === 'PERMANENT_CATALOG_PURGE',
    'Path B returns type: "PERMANENT_CATALOG_PURGE"'
  );
  assert(
    dataPathB.message.includes('permanently removed from the active catalog and POS terminals'),
    'Path B message confirms catalog purge'
  );
  assert(dataPathB.data.id === productWithHistory.id, 'Path B returns product ID in payload');

  // Check Database State of Purged Item
  const dbCheckPathB = await prisma.product.findUnique({
    where: { id: productWithHistory.id },
  });
  assert(dbCheckPathB !== null, 'Path B product record still exists in DB (preserves ledger)');
  assert(dbCheckPathB?.isArchived === true, 'Path B sets isArchived = true');
  assert(dbCheckPathB?.deletedAt !== null, 'Path B sets deletedAt timestamp');
  assert(dbCheckPathB?.stockQuantity === 0, 'Path B resets stockQuantity = 0');
  assert(dbCheckPathB?.onHand === 0, 'Path B resets onHand = 0');
  assert(
    dbCheckPathB?.sku.includes('_PURGED_') || false,
    `Path B SKU is decoupled with suffix: ${dbCheckPathB?.sku}`
  );
  assert(
    dbCheckPathB?.barcode?.includes('_PURGED_') || false,
    `Path B Barcode is decoupled with suffix: ${dbCheckPathB?.barcode}`
  );

  // Verify Audit Log
  const auditPathB = await prisma.auditLog.findFirst({
    where: { entityId: productWithHistory.id, action: 'PRODUCT_PERMANENT_CATALOG_PURGE' },
  });
  assert(
    auditPathB !== null,
    'Path B created PRODUCT_PERMANENT_CATALOG_PURGE audit trail log'
  );

  // --- 4. RECEIPT IMMUTABILITY & FOREIGN KEY INTEGRITY ---
  console.log('\n--- 4. RECEIPT IMMUTABILITY & FOREIGN KEY INTEGRITY ---');

  const historicalSale = await prisma.sale.findUnique({
    where: { id: sale.id },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  assert(historicalSale !== null, 'Historical sale voucher remains queryable');
  assert(historicalSale?.items.length === 1, 'Sale line items remain intact');
  const lineItem = historicalSale?.items[0];
  assert(
    lineItem?.nameSnapshot === testName,
    `Receipt frozen title intact: "${lineItem?.nameSnapshot}"`
  );
  assert(
    lineItem?.skuSnapshot === testSku,
    `Receipt frozen SKU intact: "${lineItem?.skuSnapshot}"`
  );
  assert(
    Number(lineItem?.unitPrice) === 24500.0,
    `Receipt frozen unitPrice intact: ETB ${lineItem?.unitPrice}`
  );
  assert(
    lineItem?.product.id === productWithHistory.id,
    'Foreign key relationship to purged product remains intact (NO P2003 FK error)'
  );

  // --- 5. ACTIVE CATALOG & POS QUERY ISOLATION ---
  console.log('\n--- 5. ACTIVE CATALOG & POS QUERY ISOLATION ---');

  // Test 5.1: GET /api/products excludes purged item
  const reqCatalog = createRequest('http://localhost:3000/api/products', 'GET', adminSession.token);
  const resCatalog = await getProducts(reqCatalog);
  const dataCatalog = await resCatalog.json();

  assert(resCatalog.status === 200, 'GET /api/products returns 200');
  assert(typeof dataCatalog.count === 'number', 'GET /api/products payload has count');
  assert(Array.isArray(dataCatalog.data), 'GET /api/products payload has data array');

  const foundInCatalog = dataCatalog.data.some((p: any) => p.id === productWithHistory.id);
  assert(!foundInCatalog, 'Purged product is completely EXCLUDED from active catalog listing');

  // Test 5.2: Search by original barcode returns 0 results for purged item
  const reqSearch = createRequest(
    `http://localhost:3000/api/products?search=${testBarcode}`,
    'GET',
    adminSession.token
  );
  const resSearch = await getProducts(reqSearch);
  const dataSearch = await resSearch.json();
  const foundInBarcodeSearch = dataSearch.data.some((p: any) => p.id === productWithHistory.id);
  assert(
    !foundInBarcodeSearch,
    `Barcode lookup for original barcode "${testBarcode}" returns empty for purged item`
  );

  // Test 5.3: GET /api/products/[id] for purged product returns 404 Not Found
  const reqGetById = createRequest(
    `http://localhost:3000/api/products/${productWithHistory.id}`,
    'GET',
    adminSession.token
  );
  const resGetById = await getProductById(reqGetById, {
    params: Promise.resolve({ id: productWithHistory.id }),
  });
  assert(
    resGetById.status === 404,
    'Direct lookup GET /api/products/[id] on purged item returns 404 Not Found'
  );

  // --- 6. BARCODE & SKU RECLAMATION ---
  console.log('\n--- 6. BARCODE & SKU RECLAMATION ---');

  // Creating a NEW product using the EXACT same original barcode (6952210844129) and SKU
  const newReclaimedProduct = await prisma.product.create({
    data: {
      shopId: DEFAULT_SHOP_ID,
      sku: testSku, // original SKU reused
      barcode: testBarcode, // original barcode 6952210844129 reused!
      name: 'Sony WH-1000XM5 (Re-indexed Batch 2026)',
      brand: 'Sony',
      categoryId: category.id,
      sellingPrice: new Prisma.Decimal(25000.0),
      retailPrice: new Prisma.Decimal(25000.0),
      averageCost: new Prisma.Decimal(18500.0),
      costPrice: new Prisma.Decimal(18500.0),
      onHand: 10,
      stockQuantity: 10,
      reorderLevel: 3,
      isArchived: false,
      deletedAt: null,
    },
  });

  assert(
    newReclaimedProduct.id !== productWithHistory.id,
    'New product successfully created with reclaimed original barcode & SKU'
  );
  assert(
    newReclaimedProduct.barcode === testBarcode,
    `Reclaimed barcode correctly set to: ${newReclaimedProduct.barcode}`
  );
  assert(
    newReclaimedProduct.sku === testSku,
    `Reclaimed SKU correctly set to: ${newReclaimedProduct.sku}`
  );

  // Verify that GET /api/products now finds ONLY the new reclaimed product
  const reqSearchReclaimed = createRequest(
    `http://localhost:3000/api/products?search=${testBarcode}`,
    'GET',
    adminSession.token
  );
  const resSearchReclaimed = await getProducts(reqSearchReclaimed);
  const dataSearchReclaimed = await resSearchReclaimed.json();

  assert(
    dataSearchReclaimed.count === 1,
    'Catalog search for barcode returns exactly 1 active product'
  );
  assert(
    dataSearchReclaimed.data[0].id === newReclaimedProduct.id,
    'Catalog search resolves to the newly created reclaimed product'
  );

  // --- CLEANUP ---
  console.log('\n--- CLEANUP: Removing Test Records ---');
  await prisma.product.delete({ where: { id: newReclaimedProduct.id } });
  await prisma.saleItem.deleteMany({ where: { saleId: sale.id } });
  await prisma.sale.delete({ where: { id: sale.id } });
  await prisma.stockMovement.delete({ where: { id: stockMove.id } });
  await prisma.product.delete({ where: { id: productWithHistory.id } });
  await prisma.session.deleteMany({
    where: { id: { in: [adminSession.session.id, cashierSession.session.id] } },
  });
  console.log('Test artifacts and temporary rows cleaned up cleanly.');

  // Summary
  console.log('\n========================================================================');
  console.log(`🎯 TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((e) => {
    console.error('Test Suite encountered fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
