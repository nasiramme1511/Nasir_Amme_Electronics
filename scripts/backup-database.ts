import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function backup() {
  console.log('📦 Starting pre-migration database backup...');
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `db-backup-${timestamp}.json`);

  const data = {
    timestamp: new Date().toISOString(),
    shops: await prisma.shop.findMany(),
    roles: await prisma.role.findMany(),
    permissions: await prisma.permission.findMany(),
    rolePermissions: await prisma.rolePermission.findMany(),
    users: await prisma.user.findMany(),
    userRoles: await prisma.userRole.findMany(),
    categories: await prisma.category.findMany(),
    products: await prisma.product.findMany(),
    suppliers: await prisma.supplier.findMany(),
    customers: await prisma.customer.findMany(),
    purchaseOrders: await prisma.purchaseOrder.findMany({ include: { items: true } }),
    goodsReceipts: await prisma.goodsReceipt.findMany({ include: { items: true } }),
    sales: await prisma.sale.findMany({ include: { items: true, payments: true } }),
    payments: await prisma.payment.findMany(),
    saleReturns: await prisma.saleReturn.findMany({ include: { items: true } }),
    stockMovements: await prisma.stockMovement.findMany(),
    stockCounts: await prisma.stockCount.findMany({ include: { items: true } }),
    auditLogs: await prisma.auditLog.findMany(),
    idempotencyRecords: await prisma.idempotencyRecord.findMany(),
  };

  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`✅ Database backup saved successfully to ${backupFile}`);
  console.log(`Summary:
  - Shops: ${data.shops.length}
  - Users: ${data.users.length}
  - Products: ${data.products.length}
  - Suppliers: ${data.suppliers.length}
  - Customers: ${data.customers.length}
  - Purchase Orders: ${data.purchaseOrders.length}
  - Sales: ${data.sales.length}
  - Payments: ${data.payments.length}
  - Returns: ${data.saleReturns.length}
  - Stock Movements: ${data.stockMovements.length}
  `);
}

backup()
  .catch((e) => {
    console.error('❌ Backup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
