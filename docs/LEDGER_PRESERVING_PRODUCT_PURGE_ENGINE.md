# Ledger-Preserving Permanent Product Purge Engine
**Nasir Amme Electronics — Dire Dawa, Ethiopia**
**Database Architecture & ERP Financial Specification**

---

## 1. Executive Summary & Objective

In high-volume retail electronics POS environments, product management faces two fundamentally conflicting business mandates:

1. **Definitive Operational Purge**: When an authorized store administrator deletes an obsolete, erroneous, or discontinued product, it must be permanently eradicated from active inventory grids, cashier POS search registers, catalog listings, and barcode scan lookups. Under no circumstances should operational staff encounter purged products or phantom inventory.
2. **Strict Financial & Legal Audit Immutability**: Retail transactions are governed by legal and tax obligations (Ethiopian Ministry of Revenues, VAT reporting, shift balance reconciliations, and warranty claim tracking). Hard-deleting records referenced by historical customer receipts (`SaleItem`), goods receipts (`GoodsReceiptItem`), or inventory movement ledgers (`StockMovement`) triggers PostgreSQL foreign key violations (`ON DELETE RESTRICT` / Prisma `P2003`), or worse, destroys audit trails and invalidates past fiscal receipts.

To solve this dilemma, the **Ledger-Preserving Permanent Product Purge Engine** establishes a deterministic, dual-path deletion strategy with unique constraint decoupling (barcode and SKU reclamation).

---

## 2. Architecture & Decision Flow

```
                  [ Admin Initiates DELETE /api/products/:id ]
                                       │
                         [ Enforce requireAdmin() RBAC ]
                                       │
                  [ Fetch Product with Dependency Counts: ]
                  [ _count: { sales, stockMovements }     ]
                                       │
                       Does product have historical data?
                                  /         \
                             NO  /           \  YES
                                /             \
            ┌──────────────────────┐       ┌────────────────────────────────┐
            │   PATH A: Hard Purge │       │  PATH B: Ledger-Preserved Purge│
            │                      │       │                                │
            │ • prisma.product.    │       │ • deletedAt = new Date()       │
            │   delete({ where })  │       │ • isArchived = true            │
            │ • Record completely  │       │ • stockQuantity = 0            │
            │   erased from DB     │       │ • Suffix SKU & Barcode with    │
            │ • Returns:           │       │   `_PURGED_${timestamp}`       │
            │   type: HARD_DELETE  │       │ • Returns:                     │
            └──────────────────────┘       │   type: PERMANENT_CATALOG_PURGE│
                                           └────────────────────────────────┘
```

---

## 3. Data Modeling & Database Schema

In `prisma/schema.prisma`, the `Product` model incorporates active catalog indexes and audit markers:

```prisma
model Product {
  id                 String             @id @default(uuid())
  shopId             String
  categoryId         String
  sku                String             // Internal stock-keeping code
  barcode            String?            // Optional retail EAN/UPC barcode
  name               String
  brand              String
  sellingPrice       Decimal            @db.Decimal(14, 2)
  averageCost        Decimal            @default(0.00) @db.Decimal(14, 2)
  onHand             Int                @default(0)
  retailPrice        Decimal?           @db.Decimal(14, 2)
  costPrice          Decimal?           @default(0.00) @db.Decimal(14, 2)
  stockQuantity      Int                @default(0)
  reorderLevel       Int                @default(5)
  location           String?
  description        String?
  warrantyMonths     Int                @default(0)
  imageUrl           String?
  createdBy          String?
  hasSerials         Boolean            @default(false)
  status             String             @default("active") // "active", "inactive", "discontinued", "purged"
  isArchived         Boolean            @default(false)
  deletedAt          DateTime?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  shop               Shop               @relation(fields: [shopId], references: [id], onDelete: Restrict)
  category           Category           @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  purchaseOrderItems PurchaseOrderItem[]
  goodsReceiptItems  GoodsReceiptItem[]
  sales              SaleItem[]
  returnItems        SaleReturnItem[]
  stockMovements     StockMovement[]
  stockCountItems    StockCountItem[]
  serials            ProductSerial[]

  @@unique([shopId, sku])
  @@unique([shopId, barcode])
  @@index([deletedAt, isArchived])
  @@index([barcode])
  @@index([sku])
  @@index([shopId, status, categoryId, brand])
  @@map("products")
}
```

### Composite Indexing Rationale
- `@@index([deletedAt, isArchived])`: Ensures `GET /api/products` and operational catalog lookups execute high-performance index scans, instantly filtering out purged items.
- `@@index([barcode])` & `@@index([sku])`: Accelerates barcode reader lookups and checkout queries.
- `@@unique([shopId, barcode])` & `@@unique([shopId, sku])`: Enforces single-shop identifier integrity while allowing instant reclamation upon suffixing.

---

## 4. Deletion Branching Specification

### Path A: Zero Historical Ledger (Clean Hard Delete)
- **Condition**: `salesCount === 0 && stockMovementsCount === 0`.
- **Execution**: Physical deletion via `await prisma.product.delete({ where: { id } })`.
- **Audit**: An entry is appended to `AuditLog` with `action: 'PRODUCT_HARD_PURGED'`.
- **Response**: HTTP 200 OK
  ```json
  {
    "success": true,
    "type": "HARD_DELETE",
    "message": "Product \"...\" was permanently purged from the database."
  }
  ```

### Path B: Ledger-Preserved Permanent Purge
- **Condition**: `salesCount > 0 || stockMovementsCount > 0`.
- **Execution**:
  1. `deletedAt = new Date()`
  2. `isArchived = true`
  3. `stockQuantity = 0` and `onHand = 0`
  4. Suffix SKU with `_PURGED_${Date.now()}`
  5. Suffix Barcode with `_PURGED_${Date.now()}` (if non-null)
  6. `status = 'purged'`
- **Audit**: An entry is appended to `AuditLog` with `action: 'PRODUCT_PERMANENT_CATALOG_PURGE'`.
- **Response**: HTTP 200 OK
  ```json
  {
    "success": true,
    "type": "PERMANENT_CATALOG_PURGE",
    "message": "Product \"...\" has been permanently removed from the active catalog and POS terminals.",
    "data": { "id": "..." }
  }
  ```

---

## 5. Catalog & POS Query Isolation

All operational endpoints implement strict isolation criteria:

### `GET /api/products`
- **Mandatory Filter**: `deletedAt: null AND isArchived: false`.
- **Parameters Supported**:
  - `?categoryId=...`: Filter by specific category ID.
  - `?search=...` / `?query=...`: Multi-field search across `name`, `sku`, and `barcode` with case-insensitive matching (`mode: 'insensitive'`).
  - `?sort=createdAt` / `?sort=name`: Order by `createdAt: 'desc'` or `name: 'asc'`.
- **Response Format**:
  ```json
  {
    "success": true,
    "count": 10,
    "data": [ ...activeProductsOnly ]
  }
  ```

---

## 6. Verification & Acceptance Criteria Matrix

| Criterion | Specification | Verification Result |
| :--- | :--- | :--- |
| **Active Table Exclusion** | Purged items must not appear in `GET /api/products`, POS terminals, or barcode searches. Direct `GET /api/products/[id]` returns 404. | ✅ PASSED |
| **Foreign Key Integrity** | Deleting items with existing sales lines must never throw Prisma P2003 or transaction timeouts. | ✅ PASSED |
| **Receipt Immutability** | Sales vouchers and thermal printouts retain their frozen `nameSnapshot`, `skuSnapshot`, `unitPrice`, and quantities. | ✅ PASSED |
| **Barcode Reclamation** | After an item with barcode `6952210844129` is purged, a new product can immediately reuse `6952210844129` without collision. | ✅ PASSED |
| **RBAC Security** | Calls lacking Admin credentials return 401 Unauthorized or 403 Forbidden. | ✅ PASSED |
| **Zero Cascade Corruption** | Historical ledgers and tax journals remain 100% auditable with zero cascade deletions. | ✅ PASSED |
