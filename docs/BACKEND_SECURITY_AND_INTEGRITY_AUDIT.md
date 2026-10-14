# Nasir Amme Electronics — Backend Security & Integrity Audit Report

**Document version:** 1.0  
**Audit date:** 15 October 2026  
**Target system:** Nasir Amme Electronics Backend Services & PostgreSQL Database (Dire Dawa, Ethiopia)  
**Evaluator:** Independent Senior Security & Systems Architect  
**Deployment verdict:** **BLOCKED**

---

## 1. Executive Summary & Verification Scope

An independent security, transactional concurrency, financial, and data-integrity audit of the Nasir Amme Electronics backend implementation was conducted. The codebase consists of Next.js App Router (16.4.1), TypeScript 5, Prisma ORM 6.19.3, and Neon Lakebase Postgres (AWS US West 2 Oregon).

The audit covered:
- **Authentication & Authorization:** All 15 API routes, session management, password handling, and RBAC enforcement.
- **Secrets & Deployment Configuration:** Git tracking status, browser bundles, client components, and connection strings.
- **Inventory Concurrency & Transaction Integrity:** Checkout, receiving, returns, manual corrections, row locking, race conditions, and idempotency.
- **Financial Correctness:** Moving weighted-average cost (AVCO), COGS snapshot freezing, return accounting, tax classification, and profitability reporting.
- **Returns & Procurement:** Cumulative return limits, restock vs quarantine segregation, refund payments, and purchase order lifecycles.
- **Auditability & Data Integrity:** Immutable movement ledger, audit logs, cascading delete behaviors, and foreign key constraints.

### Verdict Summary: **BLOCKED**
The system is **BLOCKED** from production deployment. While core mathematical calculations (AVCO, cumulative return limits) and the double-entry movement ledger architecture are sound, critical security and transactional concurrency vulnerabilities must be remediated prior to launch:
1. **Zero Authentication/Authorization Enforcement:** All 15 API routes are completely public and unauthenticated, allowing arbitrary users to adjust stock, alter legal settings, process uncollateralized refunds, and create administrator accounts.
2. **Missing Pessimistic Row Locking (`SELECT ... FOR UPDATE`):** Concurrent checkouts for the final on-hand unit can oversell inventory due to lack of row-level locking.
3. **No Database `CHECK (on_hand >= 0)` Constraint:** The relational schema lacks a database-enforced non-negative constraint.
4. **Cascading Deletes on Financial Records:** Deleting a `Sale` cascades and permanently deletes all `SaleItem` and `Payment` records from PostgreSQL.
5. **Omission of Cash Refund Records:** Customer returns do not insert compensating refund entries into the `payments` table, breaking cashier till reconciliation.
6. **Financial Gross Profit Reporting Defect:** Reports fail to adjust COGS and net revenue for returned items, and misclassify tax liability as gross sales revenue.

---

## 2. Findings Matrix

| Finding ID | Severity | Category | Title | Affected Files |
|---|---|---|---|---|
| **SEC-01** | **CRITICAL** | Auth & Access | All API routes lack server-side authentication and session validation | `src/app/api/**` |
| **SEC-02** | **CRITICAL** | Auth & Access | Missing login/session service; unhashed password placeholders in database | `src/services/`, `prisma/schema.prisma` |
| **SEC-03** | **HIGH** | Auth & Access | Arbitrary privilege escalation via unauthenticated user creation | `src/app/api/users/route.ts` |
| **CON-01** | **HIGH** | Concurrency | Concurrency race condition: lack of `FOR UPDATE` row locking during checkout | `src/services/posService.ts` |
| **CON-02** | **HIGH** | Concurrency | Absence of database-level `CHECK (on_hand >= 0)` constraint | `prisma/schema.prisma`, `migration.sql` |
| **CON-03** | **MEDIUM** | Concurrency | Race condition in sequential receipt, PO, and return number generation | `src/services/posService.ts`, `purchaseService.ts` |
| **CON-04** | **MEDIUM** | Concurrency | Non-atomic idempotency record claiming permits concurrent duplicate executions | `src/lib/idempotency.ts` |
| **FIN-01** | **HIGH** | Financial | Gross profit report fails to deduct refunds and over-deducts COGS for returned goods | `src/services/reportService.ts` |
| **FIN-02** | **HIGH** | Financial | Tax liability is misclassified as sales revenue in report summaries | `src/services/reportService.ts` |
| **FIN-03** | **HIGH** | Financial | Returns process refunds without creating compensating `Payment` outflow records | `src/services/returnService.ts` |
| **FIN-04** | **MEDIUM** | Financial | Customer spend and loyalty points are not reversed on returns | `src/services/returnService.ts` |
| **FIN-05** | **LOW** | Financial | PO shipping/freight costs (`additionalCostTotal`) ignored during AVCO recalculation | `src/services/purchaseService.ts` |
| **DAT-01** | **HIGH** | Data Integrity | `ON DELETE CASCADE` on `sales` cascades to `sale_items` and `payments` | `prisma/schema.prisma`, `migration.sql` |
| **DAT-02** | **MEDIUM** | Data Integrity | Hardcoded store identity (`DEFAULT_SHOP_ID`) bypasses multi-tenant isolation | `src/lib/apiHelper.ts` |
| **DAT-03** | **LOW** | Data Integrity | Absence of database-level immutable append-only triggers on `audit_logs` | `prisma/schema.prisma` |
| **OPR-01** | **LOW** | Operations | Goods receiving permitted against unapproved `draft` purchase orders | `src/services/purchaseService.ts` |

---

## 3. Detailed Findings & Evidence

### A. Authentication and Authorization

#### SEC-01: All API routes lack server-side authentication and session validation
- **Severity:** CRITICAL
- **Location:** All route handlers in [src/app/api/](file:///home/nasir/Nasir_Amme_Electronics/src/app/api)
- **Evidence:** Inspection of route handlers confirms that zero session cookies, Bearer tokens, or API keys are validated. For example, in `src/app/api/settings/route.ts` (lines 21–60), any unauthenticated HTTP PUT request can update the legal name, tax rate, and tax configuration of the retail store without authorization.
- **Impact:** Complete exposure of all operational, financial, and catalog endpoints to unauthorized network actors.

#### SEC-02: Missing login/session service; unhashed password placeholders
- **Severity:** CRITICAL
- **Location:** [src/app/api/users/route.ts](file:///home/nasir/Nasir_Amme_Electronics/src/app/api/users/route.ts#L54-L85), [prisma/schema.prisma](file:///home/nasir/Nasir_Amme_Electronics/prisma/schema.prisma#L130-L145)
- **Evidence:** Although the Prisma schema includes a `Session` model, no authentication service, login endpoint, password-verification routine, or cookie-setting logic exists in the codebase. Password hashes in `prisma/seed.ts` and `src/app/api/users/route.ts` use static placeholder strings (e.g. `$argon2id$v=19$m=65536,t=3,p=4$default_placeholder`) rather than real cryptographic hashes generated by an algorithm such as Argon2id.
- **Impact:** Staff accounts cannot securely authenticate; session tokens cannot be issued or revoked.

#### SEC-03: Arbitrary privilege escalation via unauthenticated user creation
- **Severity:** HIGH
- **Location:** [src/app/api/users/route.ts](file:///home/nasir/Nasir_Amme_Electronics/src/app/api/users/route.ts#L54-L85)
- **Evidence:** An unauthenticated caller can send a POST request to `/api/users` with `{ "fullName": "Attacker", "email": "attacker@test.com", "roleCode": "admin" }`. The handler creates the user and assigns the `admin` role without requiring administrator credentials.
- **Impact:** Total administrative compromise by external or unprivileged actors.

---

### B. Inventory Concurrency and Transaction Integrity

#### CON-01: Concurrency race condition: lack of `FOR UPDATE` row locking during checkout
- **Severity:** HIGH
- **Location:** [src/services/posService.ts](file:///home/nasir/Nasir_Amme_Electronics/src/services/posService.ts#L115-L125), [src/services/inventoryService.ts](file:///home/nasir/Nasir_Amme_Electronics/src/services/inventoryService.ts#L63-L85)
- **Evidence:** In `posService.ts`, products are loaded via:
  ```typescript
  const products = await tx.product.findMany({
    where: { id: { in: sortedProductIds }, shopId },
  });
  ```
  Prisma's standard `findMany` issues a non-locking `SELECT *`. In `inventoryService.ts`, stock is decremented via an application-level calculation:
  ```typescript
  const previousStock = product.onHand;
  const balanceAfter = previousStock + quantityDelta;
  await tx.product.update({ where: { id: productId }, data: { onHand: balanceAfter } });
  ```
  Under PostgreSQL's default Read Committed isolation level, two concurrent checkout requests for a product with `onHand = 1` will both read `previousStock = 1`, both compute `balanceAfter = 0`, and both update the database. 
- **Impact:** Two units are sold when only one physically existed, resulting in inventory desynchronization and overselling.

#### CON-02: Absence of database-level `CHECK (on_hand >= 0)` constraint
- **Severity:** HIGH
- **Location:** [prisma/schema.prisma](file:///home/nasir/Nasir_Amme_Electronics/prisma/schema.prisma#L169-L201), [prisma/migrations/0_init/migration.sql](file:///home/nasir/Nasir_Amme_Electronics/prisma/migrations/0_init/migration.sql)
- **Evidence:** Inspection of table creation DDL for `products` reveals that `onHand` is defined simply as `"onHand" INTEGER NOT NULL DEFAULT 0` with no check constraint (`CHECK ("onHand" >= 0)`).
- **Impact:** If an application concurrency race or miscalculation occurs, the database engine will permit negative inventory on shelf stock rather than aborting the transaction.

#### CON-03: Race condition in sequential document number generation
- **Severity:** MEDIUM
- **Location:** [src/services/posService.ts](file:///home/nasir/Nasir_Amme_Electronics/src/services/posService.ts#L42-L74), [src/services/purchaseService.ts](file:///home/nasir/Nasir_Amme_Electronics/src/services/purchaseService.ts#L46-L78)
- **Evidence:** `generateReceiptNumber` queries the last receipt using `findFirst` with `orderBy: { receiptNumber: 'desc' }` and parses the string integer. Two concurrent checkout transactions will read the same last receipt number, compute the identical sequence, and one will crash with a unique constraint violation on `@@unique([shopId, receiptNumber])`.
- **Impact:** POS checkout failures during concurrent cashier operations.

#### CON-04: Non-atomic idempotency record claiming permits concurrent duplicate executions
- **Severity:** MEDIUM
- **Location:** [src/lib/idempotency.ts](file:///home/nasir/Nasir_Amme_Electronics/src/lib/idempotency.ts#L36-L79)
- **Evidence:** The idempotency executor first calls `findUnique`, and if null, calls `upsert`. Two simultaneous requests with the identical idempotency key both execute `findUnique` simultaneously, find no existing record, and both proceed to execute `operationFn()`.
- **Impact:** A duplicate network retry sent in parallel can result in duplicate transactions.

---

### C. Financial Correctness

#### FIN-01: Gross profit report fails to deduct refunds and over-deducts COGS for returned goods
- **Severity:** HIGH
- **Location:** [src/services/reportService.ts](file:///home/nasir/Nasir_Amme_Electronics/src/services/reportService.ts#L99-L108)
- **Evidence:** Lines 104–106 compute profit as:
  ```typescript
  const netRevenue = netSales.sub(returnsRefunded);
  const grossProfit = netSales.sub(totalCogs);
  ```
  1. `grossProfit` uses `netSales` without subtracting `returnsRefunded`.
  2. `totalCogs` sums all historical sale item costs, including those for items that were returned and restocked.
- **Impact:** Financial reports display inaccurate gross margins and false profitability metrics whenever customer returns occur.

#### FIN-02: Tax liability is misclassified as sales revenue in report summaries
- **Severity:** HIGH
- **Location:** [src/services/reportService.ts](file:///home/nasir/Nasir_Amme_Electronics/src/services/reportService.ts#L79)
- **Evidence:** Line 79 calculates:
  ```typescript
  const netSales = grossSales.sub(discountsTotal).add(taxesTotal);
  ```
  Sales taxes collected (such as VAT or TOT) represent a fiduciary liability owed to the tax authorities (ERCA/Ministry of Revenues), not operating revenue belonging to the store.
- **Impact:** Artificially inflates net sales and gross profit by the tax percentage.

#### FIN-03: Returns process refunds without creating compensating `Payment` outflow records
- **Severity:** HIGH
- **Location:** [src/services/returnService.ts](file:///home/nasir/Nasir_Amme_Electronics/src/services/returnService.ts#L190-L215)
- **Evidence:** When `ReturnService.processReturn` executes, it creates a `SaleReturn` record and restocks inventory, but inserts **no payment row** in `payments`.
- **Impact:** End-of-shift till cash reconciliations (aggregating `payments` where `method = 'cash'`) will be out of balance by the exact amount of cash refunds handed to customers.

#### FIN-04: Customer spend and loyalty points are not reversed on returns
- **Severity:** MEDIUM
- **Location:** [src/services/returnService.ts](file:///home/nasir/Nasir_Amme_Electronics/src/services/returnService.ts#L216-L230)
- **Evidence:** When sales are posted in `posService.ts`, `customer.totalSpent` is incremented and loyalty points are awarded. In `returnService.ts`, no corresponding deduction is made to `totalSpent` or `loyaltyPoints`.
- **Impact:** Exploitation vector where customers can make large purchases, collect loyalty points, return the merchandise for a full refund, and retain the loyalty points.

#### FIN-05: PO shipping/freight costs ignored during AVCO recalculation
- **Severity:** LOW
- **Location:** [src/services/purchaseService.ts](file:///home/nasir/Nasir_Amme_Electronics/src/services/purchaseService.ts#L272-L280)
- **Evidence:** Decision D-06 in the specification requires landed freight costs to be included in moving weighted-average costs. `receiveGoods` only accounts for item `unitCost`, leaving `allocatedExtraCost` at 0.00.
- **Impact:** Product unit valuation understates true landed acquisition costs for imported electronics.

---

### D. Data Integrity & Operations

#### DAT-01: `ON DELETE CASCADE` on `sales` cascades to `sale_items` and `payments`
- **Severity:** HIGH
- **Location:** [prisma/schema.prisma](file:///home/nasir/Nasir_Amme_Electronics/prisma/schema.prisma#L390-L417), [prisma/migrations/0_init/migration.sql](file:///home/nasir/Nasir_Amme_Electronics/prisma/migrations/0_init/migration.sql#L598-L608)
- **Evidence:**
  ```sql
  ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ```
  If any process or user deletes a row in `sales`, PostgreSQL silently cascades and deletes all associated line items and financial payment records.
- **Impact:** Severe financial audit trail destruction. Sales and payment records must be strictly immutable with `ON DELETE RESTRICT`.

#### DAT-02: Hardcoded store identity (`DEFAULT_SHOP_ID`)
- **Severity:** MEDIUM
- **Location:** [src/lib/apiHelper.ts](file:///home/nasir/Nasir_Amme_Electronics/src/lib/apiHelper.ts#L36)
- **Evidence:** All route handlers rely on `DEFAULT_SHOP_ID = 'shop-dire-dawa-01'`.
- **Impact:** Hardcoded identifier prevents tenant scoping and fails to link transactions dynamically to verified store contexts.

#### OPR-01: Goods receiving permitted against unapproved `draft` purchase orders
- **Severity:** LOW
- **Location:** [src/services/purchaseService.ts](file:///home/nasir/Nasir_Amme_Electronics/src/services/purchaseService.ts#L233-L235)
- **Evidence:** `receiveGoods` verifies only `po.status === 'received' || po.status === 'cancelled'`. A PO in `draft` status (which has not been approved or issued to a vendor) can have goods received against it.
- **Impact:** Bypasses internal procurement approval controls.

---

## 4. Actual Tests Executed & Recorded Results

| Test Description | Execution Command / Script | Result | Notes |
|---|---|---|---|
| **Moving Average Cost Math (AVCO)** | `npx tsx scripts/verify-backend.ts` | **PASSED** (6/6 checks) | Proportional weighting, zero-stock edge cases, and rounding verified. |
| **Historical COGS Freezing** | `npx tsx scripts/verify-backend.ts` | **PASSED** | Snapshot unit cost immutability verified. |
| **Cumulative Return Limit Logic** | `npx tsx scripts/verify-backend.ts` | **PASSED** (3/3 checks) | Rejects returns exceeding original sold quantities. |
| **Disposition Stock Isolation** | `npx tsx scripts/verify-backend.ts` | **PASSED** (2/2 checks) | Quarantined goods do not increment active shelf stock. |
| **Prisma Schema & DDL Check** | `npx prisma validate` | **PASSED** | Relational consistency validated. |
| **Database Migration Integrity** | `npx prisma migrate status` | **PASSED** | Database schema matches migration `0_init`. |
| **Stock Ledger Reconciliation** | `npx tsx scripts/reconcile-ledger.ts` | **PASSED** (20/20 products) | 100% of product `onHand` values match ledger sum. |
| **TypeScript Strict Compilation** | `npx tsc --noEmit` | **PASSED** | 0 type errors across codebase. |
| **ESLint Quality Gate** | `npm run lint` | **PASSED** | 0 errors, 0 warnings. |
| **Next.js Production Build** | `npm run build` | **PASSED** | All 29 routes (14 UI + 15 API) compiled. |

---

## 5. Tests Not Executed & Justification

1. **Destructive Concurrency Load Testing against Production Neon DB:**
   - *Reason:* Strict rule #4 and #5 prohibit running destructive race-condition load scripts or generating fake stress-test transactions on the live production branch.
   - *Requirement:* A dedicated branch (e.g. `neon checkout test-concurrency`) must be provisioned for concurrency and deadlock verification.
2. **Real Authentication Session Lifetime / CSRF Attacks:**
   - *Reason:* Authentication and session cookies are not yet implemented in the application layer.
3. **Database Recovery / Point-In-Time Restore:**
   - *Reason:* Strict rule #7 and #10 prohibit executing recovery operations on production data.

---

## 6. Prioritized Remediation Plan

### Phase 1: Authentication & Authorization Hardening (Pre-deployment Blocker)
1. Implement real authentication service using **Managed Better Auth** (via `@neondatabase/auth` or server-side Argon2id sessions).
2. Create login endpoint (`/api/auth/login`) issuing secure, `HttpOnly`, `SameSite=Lax`, `Secure` session cookies.
3. Introduce Next.js server-side authorization middleware / route guard enforcing permissions on all 15 API routes.
4. Protect `/api/users` so that only authenticated users with the `users.manage` permission can create or modify accounts.

### Phase 2: Transaction Concurrency & Database Constraint Hardening (Pre-deployment Blocker)
1. Add a PostgreSQL database migration enforcing non-negative inventory:
   ```sql
   ALTER TABLE "products" ADD CONSTRAINT "products_on_hand_non_negative" CHECK ("onHand" >= 0);
   ```
2. Replace `tx.product.findMany` in `posService.ts` and `inventoryService.ts` with explicit raw locking:
   ```sql
   SELECT * FROM "products" WHERE "id" IN (...) AND "shopId" = $1 ORDER BY "id" ASC FOR UPDATE;
   ```
3. Change foreign key deletion rule on `sale_items` and `payments` from `ON DELETE CASCADE` to `ON DELETE RESTRICT`.
4. Replace string-based receipt and PO sequence queries with PostgreSQL atomic sequence generators (`CREATE SEQUENCE receipt_number_seq`).

### Phase 3: Financial & Reporting Reconciliation
1. Fix `reportService.ts`:
   - Compute `Adjusted COGS = Total COGS - COGS of returned restocked items`.
   - Exclude sales taxes (`taxesTotal`) from operating revenue.
   - Base `Gross Profit` on `Net Revenue - Adjusted COGS`.
2. Update `returnService.ts` to insert compensating negative refund records in `payments` for cash drawer accuracy.
3. Deduct refunded amounts from `customer.totalSpent` and subtract proportional loyalty points upon return posting.

---

## 7. Business Decisions Required

1. **Authentication Architecture Choice:**
   - *Option A:* Neon Managed Better Auth (`auth: true` in `neon.ts`).
   - *Option B:* Custom session cookies with Argon2id password hashing backed by the existing `users` and `sessions` Prisma models.
2. **Sales Reversal Policy (Voids):**
   - Confirm whether cashiers can void a sale within 5 minutes of checkout, or if manager override is strictly required.
3. **Tax Accounting Treatment:**
   - Confirm with local Dire Dawa accountant whether displayed retail prices are VAT-inclusive (15%) or if TOT (Turnover Tax, 2%) applies to electronics sales.
4. **Freight Landed Cost Allocation:**
   - Decide whether supplier freight costs should be allocated to incoming items by weight, item value, or uniform unit count.

---

## 8. Deployment Verdict

```
+-------------------------------------------------------------+
|                     VERDICT: BLOCKED                        |
+-------------------------------------------------------------+
| The application cannot be deployed to production in its     |
| current state. The absence of server-side authentication,   |
| lack of pessimistic row locking against overselling, and    |
| cascading deletes on financial records must be resolved     |
| before handling live retail transactions.                   |
+-------------------------------------------------------------+
```
