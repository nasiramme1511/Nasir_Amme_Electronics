# Comprehensive pgAdmin 4 CRUD Operations Guide: Nasir Amme Electronics
**Database:** `nasir_amme_db` (PostgreSQL 16) | **Host:** `localhost:5432`  
**Location:** Dire Dawa, Ethiopia  

---

## 1. Quick Access: Opening the Query Tool in pgAdmin 4

In the left **Object Explorer / Browser** tree:
1. Expand:
   ```
   Servers
    └── Nasir Amme Local
         └── Databases
              └── nasir_amme_db
                   └── Schemas
                        └── public
                             └── Tables
   ```
2. Click on **`nasir_amme_db`**.
3. In the top navigation bar, click the **Query Tool** icon (lightning bolt) or press `Alt + Shift + Q`.

> **Important Database Architecture Note:**  
> In PostgreSQL, Prisma uses lowercase snake_case table names as defined by the schema mappings (`@@map`):
> - Model `Role` $\to$ Table **`roles`**
> - Model `User` $\to$ Table **`users`** (linked to roles via junction table **`user_roles`**)
> - Model `Category` $\to$ Table **`categories`**
> - Model `Supplier` $\to$ Table **`suppliers`**
> - Model `Customer` $\to$ Table **`customers`**
> - Model `Product` $\to$ Table **`products`**
> - Model `SaleItem` $\to$ Table **`sale_items`**
> - Model `StockMovement` $\to$ Table **`stock_movements`**
> - Default Store ID is **`'shop-dire-dawa-01'`**.

---

## 2. Table Dependency & Insertion Order

PostgreSQL foreign key constraints require parent records to exist before inserting dependent child records:
1. **`roles`** & **`permissions`** (Independent RBAC entities)
2. **`categories`** (Catalog taxonomic parents)
3. **`suppliers`** (Supply chain counterparties)
4. **`customers`** (Retail/wholesale buyers)
5. **`users`** & **`user_roles`** (Staff members; reference `shops` & `roles`)
6. **`products`** (Catalog items; reference `shops` & `categories`)

---

## 3. Entity 1: Roles (`roles`)

### Schema Overview
- `id` (UUID / text)
- `code` (Unique text: `'admin'`, `'manager'`, `'cashier'`, `'stock_keeper'`, `'floor_supervisor'`)
- `displayName` (Human readable title)
- `description` (Detailed privilege scope)
- `isSystemManaged` (Boolean)
- `createdAt` (Timestamp)

### A. Create (INSERT)
```sql
-- Create a custom Floor Supervisor role
INSERT INTO roles (id, code, "displayName", description, "isSystemManaged", "createdAt")
VALUES (
  gen_random_uuid()::text,
  'floor_supervisor',
  'Floor Supervisor',
  'Authorizes customer floor discounts, returns, and inventory counts',
  false,
  NOW()
)
ON CONFLICT (code) DO NOTHING;
```

### B. Read (SELECT)
```sql
-- List all registered roles
SELECT id, code, "displayName", description, "isSystemManaged", "createdAt"
FROM roles
ORDER BY "createdAt" ASC;
```

### C. Update (UPDATE)
```sql
-- Update description and title
UPDATE roles
SET 
  "displayName" = 'Senior Floor Supervisor',
  description = 'Authorizes POS price overrides, returns, and physical audit counts'
WHERE code = 'floor_supervisor';
```

### D. Delete (DELETE)
```sql
-- Safe removal: only delete if zero staff members reference this role
DELETE FROM roles
WHERE code = 'floor_supervisor'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles WHERE "roleId" = roles.id
  );
```

---

## 4. Entity 2: Staff Accounts (`users` & `user_roles`)

### Schema Overview
- `id` (UUID / text)
- `shopId` (`'shop-dire-dawa-01'`)
- `fullName`, `email` (Unique), `phone`
- `passwordHash` (Bcrypt hash)
- `quickPinHash` (Hashed 4-digit POS lock PIN)
- `status` (`'active'`, `'suspended'`, `'disabled'`)
- Role assignment via **`user_roles`** junction table (`userId`, `roleId`)

### A. Create (INSERT Staff Member + Assign Role)
```sql
-- 1. Ensure pgcrypto extension is active for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Insert new staff member with a hashed password ('Amme2026!') and PIN ('1234')
DO $$
DECLARE
  new_user_id TEXT := gen_random_uuid()::text;
  target_role_id TEXT;
BEGIN
  -- Find the Cashier role ID
  SELECT id INTO target_role_id FROM roles WHERE code = 'cashier' LIMIT 1;

  -- Insert User record
  INSERT INTO users (
    id, "shopId", "fullName", email, phone, "passwordHash", "quickPinHash", status, "createdAt", "updatedAt"
  )
  VALUES (
    new_user_id,
    'shop-dire-dawa-01',
    'Kiya Mohammed',
    'kiya.pos@amme-electronics.et',
    '+251 977 112233',
    crypt('Amme2026!', gen_salt('bf', 12)), -- Secure bcrypt hash
    crypt('1234', gen_salt('bf', 12)),      -- Hashed 4-digit POS lock PIN
    'active',
    NOW(),
    NOW()
  );

  -- Assign User to Role in junction table
  IF target_role_id IS NOT NULL THEN
    INSERT INTO user_roles (id, "userId", "roleId", "assignedAt")
    VALUES (gen_random_uuid()::text, new_user_id, target_role_id, NOW());
  END IF;

  RAISE NOTICE 'Staff member Kiya Mohammed created with ID: %', new_user_id;
END $$;
```

### B. Read (SELECT Active Staff with Roles)
```sql
-- Inspect all active staff with their joined Role codes and titles
SELECT 
  u.id,
  u."fullName",
  u.email,
  u.phone,
  u.status,
  r.code AS "roleCode",
  r."displayName" AS "roleTitle",
  u."lastLoginAt"
FROM users u
LEFT JOIN user_roles ur ON u.id = ur."userId"
LEFT JOIN roles r ON ur."roleId" = r.id
ORDER BY u."createdAt" DESC;
```

### C. Update (UPDATE Staff Profile or Emergency Password Reset)
```sql
-- 1. Update contact details
UPDATE users
SET 
  phone = '+251 911 887766',
  "updatedAt" = NOW()
WHERE email = 'kiya.pos@amme-electronics.et';

-- 2. Emergency Password Reset in pgAdmin 4 (reset to 'AmmeSecure2026!')
UPDATE users
SET 
  "passwordHash" = crypt('AmmeSecure2026!', gen_salt('bf', 12)),
  "updatedAt" = NOW()
WHERE email = 'kiya.pos@amme-electronics.et';
```

### D. Delete (Soft Deactivation — Financial Audit Preservation)
```sql
-- Never execute raw DELETE FROM users if the staff member has issued sales receipts!
-- Deactivate account to immediately revoke POS and ERP login privileges:
UPDATE users
SET 
  status = 'disabled',
  "updatedAt" = NOW()
WHERE email = 'kiya.pos@amme-electronics.et';
```

---

## 5. Entity 3: Categories (`categories`)

### Schema Overview
- `id` (UUID / text)
- `shopId` (`'shop-dire-dawa-01'`)
- `name` (Display name)
- `slug` (Unique per shop, e.g. `'smart-wearables-audio'`)
- `description`, `iconName`, `posVisible`, `displayOrder`

### A. Create (INSERT)
```sql
INSERT INTO categories (
  id, "shopId", name, slug, description, "iconName", "posVisible", "displayOrder", status, "createdAt", "updatedAt"
)
VALUES 
  (gen_random_uuid()::text, 'shop-dire-dawa-01', 'Smart Wearables & Audio', 'smart-wearables-audio', 'Smartwatches, fitness bands, and TWS earbuds', 'Headphones', true, 10, 'active', NOW(), NOW()),
  (gen_random_uuid()::text, 'shop-dire-dawa-01', 'General Accessories', 'general-accessories', 'Default fallback category for unclassified goods', 'Package', true, 99, 'active', NOW(), NOW())
ON CONFLICT ("shopId", slug) DO NOTHING;
```

### B. Read (SELECT with Live Active Product Counts)
```sql
SELECT 
  c.id, 
  c.name, 
  c.slug, 
  c.description, 
  c."posVisible",
  COUNT(p.id) AS "activeProductCount"
FROM categories c
LEFT JOIN products p ON p."categoryId" = c.id AND p."isArchived" = false AND p."deletedAt" IS NULL
WHERE c."shopId" = 'shop-dire-dawa-01'
GROUP BY c.id, c.name, c.slug, c.description, c."posVisible"
ORDER BY c."displayOrder" ASC;
```

### C. Update (UPDATE)
```sql
UPDATE categories
SET 
  name = 'Audio, Wireless & Wearables',
  description = 'High-fidelity Bluetooth headphones, speakers, and smartwatches',
  "updatedAt" = NOW()
WHERE slug = 'smart-wearables-audio' AND "shopId" = 'shop-dire-dawa-01';
```

### D. Safe Bulk Deletion with Product Reassignment Fallback
```sql
DO $$
DECLARE
  target_fallback_id TEXT;
  category_to_remove_id TEXT;
BEGIN
  -- 1. Locate fallback General Accessories category
  SELECT id INTO target_fallback_id FROM categories WHERE slug = 'general-accessories' LIMIT 1;
  
  -- 2. Locate category to remove
  SELECT id INTO category_to_remove_id FROM categories WHERE slug = 'smart-wearables-audio' LIMIT 1;

  IF category_to_remove_id IS NOT NULL AND target_fallback_id IS NOT NULL THEN
    -- Reassign existing products to the fallback category
    UPDATE products
    SET "categoryId" = target_fallback_id, "updatedAt" = NOW()
    WHERE "categoryId" = category_to_remove_id;

    -- Safely delete category without violating foreign key constraints
    DELETE FROM categories WHERE id = category_to_remove_id;
    RAISE NOTICE 'Category deleted and products reassigned to General Accessories.';
  END IF;
END $$;
```

---

## 6. Entity 4: Suppliers (`suppliers`)

### Schema Overview
- `id` (UUID / text)
- `shopId` (`'shop-dire-dawa-01'`)
- `code` (Unique per shop, e.g. `'SUP-ANK-01'`)
- `name`, `contactName`, `email`, `phone`, `tinNumber`, `addressText`, `paymentTerms`

### A. Create (INSERT)
```sql
INSERT INTO suppliers (
  id, "shopId", code, name, "contactName", email, phone, city, "addressText", "paymentTerms", "tinNumber", status, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid()::text,
  'shop-dire-dawa-01',
  'SUP-ANK-01',
  'Anker East Africa Distribution Ltd',
  'Dawit Haile',
  'supply@anker-ea.com',
  '+251 911 345678',
  'Dire Dawa',
  'Bole Sub-City, Addis Ababa & Dire Dawa Hub',
  'Net 15',
  '1009876543',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT ("shopId", code) DO NOTHING;
```

### B. Read (SELECT)
```sql
SELECT id, code, name, "contactName", phone, email, "paymentTerms", "tinNumber", status
FROM suppliers
WHERE "shopId" = 'shop-dire-dawa-01'
ORDER BY name ASC;
```

### C. Update (UPDATE)
```sql
UPDATE suppliers
SET 
  phone = '+251 922 998877',
  "contactName" = 'Almaz Kebede',
  "paymentTerms" = 'Net 30',
  "updatedAt" = NOW()
WHERE code = 'SUP-ANK-01' AND "shopId" = 'shop-dire-dawa-01';
```

### D. Delete (DELETE)
```sql
-- Safe Delete: Only delete if no historical purchase orders reference this supplier
DELETE FROM suppliers
WHERE code = 'SUP-ANK-01'
  AND NOT EXISTS (
    SELECT 1 FROM purchase_orders WHERE "supplierId" = suppliers.id
  );
```

---

## 7. Entity 5: Customers (`customers`)

### Schema Overview
- `id` (UUID / text)
- `shopId` (`'shop-dire-dawa-01'`)
- `displayName`, `phone`, `email`
- `customerType` (`'retail'`, `'wholesale'`)
- `creditLimit`, `creditBalance`, `loyaltyPoints`, `tinNumber`

### A. Create (INSERT)
```sql
INSERT INTO customers (
  id, "shopId", "displayName", phone, email, "customerType", "priceTier", city, "loyaltyPoints", "tinNumber", "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid()::text,
  'shop-dire-dawa-01',
  'Gende Kore Phone Clinic & Repairs',
  '+251 925 443322',
  'repairs@gendekore.et',
  'wholesale',
  'tier_1_wholesale',
  'Dire Dawa',
  150,
  '1003456789',
  NOW(),
  NOW()
);
```

### B. Read (SELECT)
```sql
SELECT id, "displayName", phone, "customerType", "priceTier", "loyaltyPoints", "totalSpent", "creditBalance"
FROM customers
WHERE "shopId" = 'shop-dire-dawa-01'
ORDER BY "createdAt" DESC;
```

### C. Update (UPDATE Loyalty Balance & Contact)
```sql
UPDATE customers
SET 
  phone = '+251 977 001122',
  "loyaltyPoints" = "loyaltyPoints" + 50,
  "updatedAt" = NOW()
WHERE "displayName" = 'Gende Kore Phone Clinic & Repairs';
```

### D. Delete (Safe Removal Check)
```sql
-- Customers linked to historical sales cannot be hard-deleted (onDelete: SetNull or Restrict).
-- Safe removal check:
DELETE FROM customers 
WHERE "displayName" = 'Gende Kore Phone Clinic & Repairs'
  AND NOT EXISTS (
    SELECT 1 FROM sales WHERE "customerId" = customers.id
  );
```

---

## 8. Entity 6: Products (`products`)

### Schema Overview
- `id` (UUID / text)
- `shopId` (`'shop-dire-dawa-01'`)
- `categoryId` (Foreign Key referencing `categories.id`)
- `sku` (Unique stock-keeping code)
- `barcode` (Unique retail EAN/UPC)
- `name`, `brand`
- `sellingPrice` & `retailPrice`
- `averageCost` & `costPrice`
- `onHand` & `stockQuantity`
- `isArchived` (Boolean)
- `deletedAt` (Timestamp)

### A. Create (INSERT Product & Optional Opening Stock Ledger)
```sql
DO $$
DECLARE
  cat_id TEXT;
  new_prod_id TEXT := gen_random_uuid()::text;
BEGIN
  -- Find audio category
  SELECT id INTO cat_id FROM categories WHERE slug LIKE '%audio%' LIMIT 1;
  IF cat_id IS NULL THEN
    SELECT id INTO cat_id FROM categories LIMIT 1;
  END IF;

  -- 1. Insert Product record
  INSERT INTO products (
    id, "shopId", "categoryId", sku, barcode, name, brand,
    "sellingPrice", "retailPrice", "averageCost", "costPrice",
    "onHand", "stockQuantity", "reorderLevel", location, description,
    "warrantyMonths", status, "isArchived", "deletedAt", "createdAt", "updatedAt"
  )
  VALUES (
    new_prod_id,
    'shop-dire-dawa-01',
    cat_id,
    'AUD-ANK-SPC1',
    '194644158912',
    'Anker Soundcore Space One ANC Headphones',
    'Anker',
    8900.00, 8900.00,
    6200.00, 6200.00,
    12, 12,
    3, 'Shelf A-02', 'High-resolution wireless noise cancelling headphones',
    18, 'active', false, NULL, NOW(), NOW()
  );

  -- 2. Insert Opening Stock Movement in immutable inventory ledger
  INSERT INTO stock_movements (
    id, "shopId", "productId", "movementType", "quantityDelta",
    "unitCostSnapshot", "previousStock", "balanceAfter",
    "referenceNumber", "sourceType", reason, "occurredAt"
  )
  VALUES (
    gen_random_uuid()::text,
    'shop-dire-dawa-01',
    new_prod_id,
    'opening_balance',
    12,
    6200.00,
    0,
    12,
    'INIT-AUD-ANK-SPC1',
    'catalog_add',
    'Initial stock created via pgAdmin 4 inventory provisioning',
    NOW()
  );

  RAISE NOTICE 'Product and opening stock ledger entry created successfully: %', new_prod_id;
END $$;
```

### B. Read (Active Operational Catalog Query)
> **Crucial Rule:** Always enforce `"isArchived" = false AND "deletedAt" IS NULL` to exclude permanently purged products, identical to the Next.js API.

```sql
SELECT 
  p.id,
  p.name,
  p.brand,
  p.sku,
  p.barcode,
  p."sellingPrice",
  p."averageCost",
  p."onHand",
  c.name AS "categoryName",
  p.location,
  p."warrantyMonths"
FROM products p
JOIN categories c ON p."categoryId" = c.id
WHERE p."shopId" = 'shop-dire-dawa-01'
  AND p."isArchived" = false 
  AND p."deletedAt" IS NULL
ORDER BY p."createdAt" DESC;
```

### C. Update (Price & Stock Correction)
```sql
UPDATE products
SET 
  "sellingPrice" = 9200.00,
  "retailPrice" = 9200.00,
  "onHand" = "onHand" + 5,
  "stockQuantity" = "stockQuantity" + 5,
  "updatedAt" = NOW()
WHERE barcode = '194644158912' AND "shopId" = 'shop-dire-dawa-01';
```

### D. Delete: Dual-Path Permanent Purge Routine in pgAdmin 4
Execute this deterministic PL/pgSQL block to automatically determine whether to execute a physical hard purge or a ledger-preserved permanent catalog purge:

```sql
DO $$
DECLARE
  target_product_id TEXT;
  target_name TEXT;
  sales_count INT := 0;
  movements_count INT := 0;
  ts BIGINT := FLOOR(EXTRACT(EPOCH FROM NOW()));
BEGIN
  -- 1. Identify target product by barcode or SKU
  SELECT id, name INTO target_product_id, target_name 
  FROM products 
  WHERE barcode = '194644158912' AND "shopId" = 'shop-dire-dawa-01'
  LIMIT 1;

  IF target_product_id IS NULL THEN
    RAISE NOTICE 'Product not found.';
    RETURN;
  END IF;

  -- 2. Count financial and stock ledger dependencies
  SELECT COUNT(*) INTO sales_count FROM sale_items WHERE "productId" = target_product_id;
  SELECT COUNT(*) INTO movements_count FROM stock_movements WHERE "productId" = target_product_id;

  -- 3. Branching logic
  IF sales_count = 0 AND movements_count = 0 THEN
    -- PATH A: Zero ledger history -> Clean physical removal
    DELETE FROM products WHERE id = target_product_id;
    RAISE NOTICE 'PATH A executed: Product "%" had 0 transactions and was physically hard-deleted.', target_name;
  ELSE
    -- PATH B: Ledger-preserved purge (decouple unique identifiers and archive)
    UPDATE products
    SET 
      "deletedAt" = NOW(),
      "isArchived" = true,
      "onHand" = 0,
      "stockQuantity" = 0,
      status = 'purged',
      sku = sku || '_PURGED_' || ts,
      barcode = CASE WHEN barcode IS NOT NULL THEN barcode || '_PURGED_' || ts ELSE NULL END,
      "updatedAt" = NOW()
    WHERE id = target_product_id;
    
    RAISE NOTICE 'PATH B executed: Product "%" (Sales: %, Movements: %) permanently purged from catalog; barcode released for reuse.', target_name, sales_count, movements_count;
  END IF;
END $$;
```

---

## 9. Visual GUI Spreadsheet CRUD in pgAdmin 4

If you prefer using pgAdmin 4's spreadsheet interface without writing SQL:

### 1. Open Table Data View
1. In the left browser tree, expand **Tables**.
2. Right-click any table (e.g., `products`, `users`, or `categories`) > **View/Edit Data** > **All Rows**.

### 2. Add a Row (Create)
1. Scroll down to the bottom empty row (marked with an asterisk `*`).
2. Double-click any cell to type.
3. For the `id` column, you can leave it blank (PostgreSQL assigns a UUID default) or enter a custom UUID.
4. Fill in required fields (`shopId`: `'shop-dire-dawa-01'`, `name`, `sellingPrice`, etc.).
5. Click the **Save Data Changes** icon (floppy disk) or press `F6`.

### 3. Edit Data (Update)
1. Double-click the cell you want to update (e.g. `sellingPrice` or `onHand`).
2. Type the new value and press `Enter`.
3. Click the **Save Data Changes** icon (`F6`) to commit.

### 4. Remove a Row (Delete)
1. Click the row number header on the far left to highlight the entire row.
2. Click the **Delete selected row(s)** icon (trash can) on the top toolbar or press `Delete`.
3. Click the **Save Data Changes** icon (`F6`) to execute the deletion.

---

## 10. Summary Verification Matrix

| Table | Primary Key | Foreign Key References | Safe Deletion Rule |
| :--- | :--- | :--- | :--- |
| **`roles`** | `id` (UUID) | None | Do not delete roles with assigned `user_roles`. |
| **`users`** | `id` (UUID) | `shopId` $\to$ `shops.id` | Set `status = 'disabled'` (never hard delete if staff has sales). |
| **`categories`**| `id` (UUID) | `shopId` $\to$ `shops.id` | Reassign child products to fallback before deleting. |
| **`suppliers`** | `id` (UUID) | `shopId` $\to$ `shops.id` | Check for active `purchase_orders` first. |
| **`customers`** | `id` (UUID) | `shopId` $\to$ `shops.id` | Safe if 0 sales records exist. |
| **`products`**  | `id` (UUID) | `categoryId` $\to$ `categories.id` | Follow Dual-Path: Path A if 0 sales/movements; Path B if history exists. |
