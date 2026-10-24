# Nasir Amme Electronics

## Backend & Database Architectural Specification

**Document status:** Design specification — not an implementation  
**Version:** 1.0  
**Prepared:** 15 October 2026  
**Business context:** Single-shop electronics retailer in Dire Dawa, Ethiopia  
**Currency:** Ethiopian birr (ETB)  
**Proposed stack:** Next.js App Router + TypeScript, PostgreSQL, Prisma ORM  
**Scope boundary:** No application backend code, Prisma schema, SQL DDL, migrations, or deployment configuration are created by this document.

---

## 1. Executive Summary

This document defines the proposed production architecture behind the existing Nasir Amme Electronics frontend. It bridges the validated user-interface workflows to a relational data model and a transaction-safe service layer.

The application is a single-shop, single-stockroom retail POS and inventory system. It needs to manage a product catalogue, categories, suppliers, customers, purchase orders and receiving, point-of-sale transactions, payments, returns, stock counts, inventory movements, staff permissions, settings, and operational reports.

The central architectural rule is:

> **The server is authoritative.** The browser may display estimates and validate input for usability, but the server and PostgreSQL must revalidate every security-sensitive and inventory-affecting operation.

The design prioritizes:
- PostgreSQL as the durable source of truth.
- Prisma ORM for typed data access, with explicit SQL where locking, constraints, or specialized queries are required.
- Server-side authorization on every protected operation.
- ACID transactions for posting sales, receiving stock, returns, and stock adjustments.
- An append-only stock movement ledger, with corrections represented by new movements rather than rewriting history.
- Moving weighted-average cost (AVCO/MAC), with historical cost of goods sold (COGS) frozen on each posted sale item.
- Audit events for consequential actions.
- Idempotency protection against retry and duplicate submission.
- Explicit state transitions and business rules.
- A phased implementation with tests and acceptance criteria.

This is a design proposal, not proof that the future implementation is correct. Every invariant must be encoded in service logic, database constraints where appropriate, and automated tests.

---

## 2. Scope and Assumptions

### 2.1 In Scope
- One shop and one stockroom in the initial release.
- Product and category management.
- Suppliers and customers.
- Purchase-order creation, approval if required, and goods receiving.
- POS checkout, receipts, payment records, sales history, and void/reversal workflows.
- Returns and refunds, including restock versus quarantine decisions.
- Inventory movements, stock counts, and adjustments.
- Staff accounts, sessions, roles, and permissions.
- Shop/POS settings.
- Reports for sales, stock valuation, and gross profit.
- Audit history.
- API contracts and operational acceptance criteria.

### 2.2 Assumptions Requiring Confirmation
1. **Single Branch:** The first release has one shop and one stockroom; a multi-branch architecture is not required immediately.
2. **Currency:** ETB is the reporting and transaction currency. Whether any supplier purchase is denominated in another currency remains undecided.
3. **Unit Quantities:** Quantities for ordinary retail products are whole units. If products such as cable sold by length are introduced, quantity precision must be changed deliberately.
4. **Stable Identity:** Products have a stable internal ID and unique SKU. Barcode is optional but unique when present.
5. **Record Preservation:** Posted sales, receipts, receiving records, and stock movements are historical business records and must not be silently deleted.
6. **Payment Scope:** Payment integrations (Telebirr, CBE Birr, card, or bank APIs) are not part of the first backend milestone unless separately approved. The frontend's payment-method choices are currently simulations.
7. **Client Ephemerality:** The frontend currently uses in-memory mock state; it does not provide durable persistence or cross-device consistency.
8. **Sample Data Disclaimer:** Any names, TINs, addresses, supplier records, customer records, prices, or other sample data in the frontend are unverified demo data until confirmed by the business owner.
9. **Single-Till Connectivity:** The system is initially intended for use by authorized staff at one shop. Internet reliability, offline POS requirements, backup connectivity, and simultaneous tills require explicit operational decisions.
10. **Regulatory Advice:** The shop's tax, invoice, record-retention, and privacy obligations must be verified with a qualified local accountant/legal adviser. This document does not claim regulatory certification.

### 2.3 Out of Scope
- Writing backend code or migrations.
- Implementing Prisma models.
- Deploying infrastructure.
- Real payment-provider integrations.
- Multi-warehouse transfers or multi-branch consolidation.
- Full accounting/general ledger, payroll, e-commerce, loyalty programme, or tax filing unless approved as later scope.
- Guaranteeing regulatory compliance without local professional review.

---

## 3. Current Frontend Workflow Baseline

The frontend stabilization audit verified these 14 primary routes:

| Route | Interface Responsibility | Proposed Backend Capability |
|---|---|---|
| `/` | Dashboard and quick actions | Aggregated dashboard metrics |
| `/products` | Search, filters, product details, add/edit, CSV export | Product CRUD, catalogue search, pricing and stock summary |
| `/categories` | Category management and product counts | Category CRUD and catalogue relationships |
| `/suppliers` | Supplier directory and forms | Supplier CRUD and supplier history |
| `/customers` | Customer records and credit/account views | Customer CRUD, sale history, optional credit ledger |
| `/purchases` | Purchase orders, receiving | PO lifecycle, receipt posting, stock and cost updates |
| `/sales/checkout` | POS cart, payment simulation, receipt | Quote/checkout, atomic sale posting, payment record |
| `/sales` | Sales history and receipt preview | Searchable sale history and authorized receipt retrieval |
| `/returns` | Return submission, quantity validation, restock/quarantine | Return eligibility, approval if required, refund and stock posting |
| `/inventory` | Stock movement ledger | Read-only movement history and reconciliation |
| `/inventory/stock-counts` | Physical count and variance preview | Count sessions, review, posted adjustments |
| `/reports` | Sales, valuation, and analytics | Authorized report queries and exports |
| `/users` | Staff and role matrix | User administration and permission enforcement |
| `/settings` | Shop profile and POS preferences | Validated shop configuration |

---

## 4. Target Architecture

### 4.1 Logical Request Path
1. Browser renders the existing Next.js interface.
2. A server-side route handler or server action receives the request.
3. The request is authenticated and authorized.
4. Input is parsed and validated at the boundary.
5. A domain/service function executes the business operation.
6. Prisma performs database access; specialized SQL is used for row locks or database features when needed.
7. PostgreSQL constraints and transaction semantics protect durable state.
8. A successful mutation writes business records, stock movements, and audit events in the same transaction where possible.
9. The server returns a typed response; the UI refreshes affected data.

### 4.2 Application Layers
- **Presentation:** existing pages, components, forms, and client-side state.
- **Transport:** Next.js Route Handlers for JSON endpoints; Server Actions for tightly coupled forms.
- **Authentication:** session creation, rotation, expiry, revocation, and identity resolution.
- **Authorization:** centralized permission checks, scoped to the current user and shop.
- **Validation:** request schemas (Zod), domain constraints, and response types.
- **Domain Services:** product, purchase, sales, return, inventory, reporting, and user-management workflows.
- **Persistence:** Prisma repositories and narrowly scoped raw SQL where needed.
- **Database:** PostgreSQL tables, constraints, indexes, and transaction guarantees.
- **Operations:** structured logs, backups, health checks, secrets management, and monitoring.

### 4.3 Technology Choices
- **PostgreSQL:** Relational constraints, transactional consistency, row-level locking (`SELECT ... FOR UPDATE`), JSONB audit snapshots, and indexed reporting queries.
- **Prisma ORM:** Typed data access, migration management, and relational operations. Parameterized raw SQL for concurrency locks.
- **Next.js App Router:** Server-only operations; zero Prisma or credential leaks to client components.

---

## 5. Relational Data Model

### 5.1 Modeling Principles
- Use UUID primary keys (`gen_random_uuid()` or UUIDv7).
- Store timestamps as `timestamptz` in UTC. Display in local time (East Africa Time, UTC+3).
- Store monetary values as `numeric(14,2)` fixed-precision, never binary floating point.
- Use integer quantities for unit-count accessories.
- Foreign keys for relational integrity; unique constraints for business identifiers.
- Restrict/soft deactivation for referenced records; no cascading delete of posted historical records.
- Transactionally synchronized cached balances on products (`on_hand`).

### 5.2 Key Entity Schemas

#### A. `shops`
- `id`: UUID (PK)
- `name`: String
- `address_text`, `city`, `country_code`
- `currency_code`: String, Default `'ETB'`
- `time_zone`: String, Default `'Africa/Addis_Ababa'`
- `phone`, `email`, `tin_number`, `receipt_footer`
- `created_at`, `updated_at`

#### B. `users` & `sessions`
- `users`: `id`, `shop_id`, `full_name`, `email` (unique), `password_hash`, `status` (`active`, `invited`, `suspended`, `disabled`), `last_login_at`, timestamps.
- `sessions`: `id`, `user_id`, `token_hash` (unique), `created_at`, `expires_at`, `last_seen_at`, `revoked_at`, `ip_address`, `user_agent`.

#### C. `roles` & `permissions`
- `roles`: `id`, `code`, `display_name`, `description`.
- `permissions`: `id`, `code` (e.g. `sales.checkout`, `inventory.adjust`), `description`.
- `user_roles`: `(user_id, role_id)` unique pair.
- `role_permissions`: `(role_id, permission_id)` unique pair.

#### D. `products` & `categories`
- `categories`: `id`, `shop_id`, `name`, `slug` (unique within shop), `description`, `status`, timestamps.
- `products`: `id`, `shop_id`, `category_id`, `sku` (unique), `barcode` (unique nullable), `name`, `brand`, `selling_price`, `average_cost`, `on_hand`, `reorder_level`, `status`, timestamps.

#### E. `suppliers` & `customers`
- `suppliers`: `id`, `shop_id`, `code` (unique), `name`, `contact_name`, `phone`, `email`, `address_text`, `payment_terms`, `status`, timestamps.
- `customers`: `id`, `shop_id`, `display_name`, `phone`, `email`, `customer_type` (`retail`, `wholesale`), `credit_balance`, `total_spent`, `loyalty_points`, timestamps.

#### F. `purchase_orders`, `purchase_order_items`, `goods_receipts`
- `purchase_orders`: `id`, `shop_id`, `supplier_id`, `po_number` (unique), `status` (`draft`, `ordered`, `partially_received`, `received`, `cancelled`), `ordered_at`, `expected_at`, `received_at`, `subtotal`, `grand_total`, timestamps.
- `purchase_order_items`: `id`, `purchase_order_id`, `product_id`, `ordered_quantity`, `received_quantity`, `unit_cost`.
- `goods_receipts`: `id`, `shop_id`, `purchase_order_id`, `receipt_number`, `received_at`, `received_by`, `idempotency_key`.

#### G. `sales` & `sale_items`
- `sales`: `id`, `shop_id`, `receipt_number` (unique), `customer_id` (nullable), `status` (`posted`, `partially_returned`, `returned`, `voided`), `sold_at`, `subtotal`, `discount_total`, `tax_total`, `grand_total`, `cashier_id`, `idempotency_key`, timestamps.
- `sale_items`: `id`, `sale_id`, `product_id`, `sku_snapshot`, `name_snapshot`, `quantity`, `unit_price`, `discount_amount`, `unit_cost_snapshot`, `line_subtotal`, `line_total`, `line_cogs`, `line_gross_profit`.

#### H. `payments`
- `payments`: `id`, `shop_id`, `sale_id`, `method` (`cash`, `telebirr`, `cbe_birr`, `bank_transfer`, `credit`), `status` (`pending`, `succeeded`, `failed`, `refunded`, `partially_refunded`), `amount`, `currency_code`, `provider_reference`, `received_at`, `recorded_by`.

#### I. `sale_returns` & `sale_return_items`
- `sale_returns`: `id`, `shop_id`, `sale_id`, `return_number` (unique), `status` (`requested`, `approved`, `rejected`, `posted`, `reversed`), `reason`, `requested_by`, `posted_by`, `total_refund_etb`, `idempotency_key`, timestamps.
- `sale_return_items`: `id`, `sale_return_id`, `sale_item_id`, `product_id`, `quantity`, `unit_refund_amount`, `disposition` (`restock`, `quarantine`, `discard`), `stock_movement_id`.

#### J. `stock_movements` (Immutable Ledger)
- `id`: UUID (PK)
- `shop_id`, `product_id`
- `movement_type`: `opening_balance`, `purchase_receive`, `sale`, `return_restock`, `damage_loss`, `stock_count_adjustment`, `manual_correction`, `reversal`
- `quantity_delta`: Signed integer (+ for addition, - for reduction)
- `unit_cost_snapshot`: Numeric(14,2)
- `balance_after`: Integer
- `source_type`, `source_id`, `source_line_id`
- `reason`, `occurred_at`, `actor_id`, `idempotency_key`

#### K. `audit_logs`
- `id`: UUID (PK)
- `shop_id`, `actor_user_id`, `action`, `entity_type`, `entity_id`
- `old_values` (JSONB), `new_values` (JSONB)
- `request_id`, `ip_address`, `user_agent`, `occurred_at`

---

## 6. Transaction Boundaries & Concurrency

### 6.1 Transaction Principles
- Every inventory, financial, and state-modifying action is enclosed in a single database transaction.
- Products locked using deterministic ID ordering (`ORDER BY id ASC`) to avoid deadlocks.
- Server revalidates authoritative prices, active statuses, and stock balances inside the transaction.

### 6.2 Key Transaction Workflows
1. **POS Sale Posting:**
   - Lock products $\rightarrow$ Validate stock and prices $\rightarrow$ Insert `sales` & `sale_items` (freezing `unit_cost_snapshot`) $\rightarrow$ Decrement `products.on_hand` $\rightarrow$ Insert negative `stock_movements` $\rightarrow$ Insert `payments` $\rightarrow$ Update customer stats $\rightarrow$ Write `audit_logs` $\rightarrow$ Commit.
2. **Goods Receiving:**
   - Lock PO & products $\rightarrow$ Validate remaining unreceived quantity $\rightarrow$ Recompute Moving Weighted-Average Cost $\rightarrow$ Increment `products.on_hand` $\rightarrow$ Update `products.average_cost` $\rightarrow$ Insert positive `stock_movements` $\rightarrow$ Update PO status $\rightarrow$ Write `audit_logs` $\rightarrow$ Commit.
3. **Returns Processing:**
   - Lock sale items & products $\rightarrow$ Compute cumulative prior returns $\rightarrow$ Enforce $\text{returnQty} \le \text{remainingReturnableQty}$ $\rightarrow$ Create `sale_returns` & `sale_return_items` $\rightarrow$ If disposition is `'restock'`, increment shelf stock and write positive movement; if `'quarantine'`, shelf stock untouched $\rightarrow$ Update sale status to `'refunded'` or `'partially_refunded'` $\rightarrow$ Write `audit_logs` $\rightarrow$ Commit.

---

## 7. Moving Weighted-Average Cost (AVCO/MAC)

### 7.1 Recomputation on Goods Receipt
$$\text{New Average Cost} = \frac{(Q_{\text{old}} \times C_{\text{old}}) + (Q_{\text{received}} \times C_{\text{received}})}{Q_{\text{old}} + Q_{\text{received}}}$$

- **Zero-Stock Edge Case:** If $Q_{\text{old}} = 0$, $\text{New Average Cost} = C_{\text{received}}$.
- **Frozen COGS Snapshot:** On sale checkout, `sale_items.unit_cost_snapshot` is locked to the current `average_cost`. Historical Gross Profit (`Revenue - COGS`) is permanently protected from future price or cost fluctuations.

---

## 8. Role-Based Access Control (RBAC)

| Capability | Admin | Manager | Cashier | Stock Keeper |
|---|---|---|---|---|
| View Dashboard | Full | Full | Scoped/Limited | Stock-focused |
| View Catalog | Yes | Yes | Yes | Yes |
| Create/Edit Products & Prices | Yes | Policy-limited | No | No |
| Manage Categories & Suppliers | Yes | Yes | No | Read-only |
| Manage Customers | Yes | Yes | POS-scoped | No |
| Create / Approve POs | Yes | Yes | No | Draft only (optional) |
| Receive Goods into Stock | Yes | Yes | No | Yes |
| POS Checkout & Sale Posting | Yes | Optional | Yes | No |
| Reprint Receipts | Yes | Yes | Authorized sales | No |
| Submit / Approve Returns | Yes | Yes | Submit only | No |
| Conduct Stock Counts | Yes | Yes | No | Yes |
| Approve Count Variances | Yes | Yes | No | No |
| Post Manual Stock Corrections | Yes | Restricted/Approved | No | No |
| View Financial/Margin Reports | Yes | Scoped | No | No |
| Manage Users & Settings | Yes | No | No | No |
| View Audit Logs | Full | Scoped | Own actions | Stock-related |

---

## 9. State Transitions

### 9.1 Purchase Order Lifecycle
```text
Draft -> Ordered -> Partially Received -> Received
  |         |              |
  v         v              v
Cancelled  Cancelled   Cancel remaining quantity
```

### 9.2 Sale Lifecycle
```text
Draft Cart -> Posted
                |
                +-> Partially Returned
                |       |
                |       +-> Returned (100% items refunded)
                |
                +-> Voided/Reversed (Privileged audit action)
```

### 9.3 Return Lifecycle
```text
Requested -> Approved -> Posted (Stock & Refund applied)
    |           |
    v           v
 Rejected    Rejected
```

---

## 10. Decision Log: 20 Unresolved Business Decisions

| ID | Decision Required | Recommended Baseline | Impact / Rationale |
|---|---|---|---|
| **D-01** | Single shop vs multi-branch | Include `shop_id` in schema; operate 1 shop | Avoids costly schema refactoring later |
| **D-02** | Whole units vs fractional quantities | Integer units initially | Simplifies quantity precision for electronics accessories |
| **D-03** | Purchase order approval requirements | Manager approval required above threshold | Enforces internal procurement control |
| **D-04** | Partial deliveries support | Support multiple receipts per PO | Reflects regional electronics delivery realities |
| **D-05** | Below-cost sales permission | Permit with warning/manager override | Allows clearance promotions without database lockouts |
| **D-06** | Costs included in moving average | Purchase cost + directly attributable freight | Standard inventory valuation accounting |
| **D-07** | Discount allocation across lines | Proportional discount distribution | Maintains accurate line-item COGS and gross margins |
| **D-08** | Applicable tax regime | Obtain formal guidance from ERCA / accountant | Prevents inventing unverified fiscal compliance |
| **D-09** | Customer credit / ledger support | Model core tables; defer credit sales initially | Avoids uncollateralized receivables exposure |
| **D-10** | Loyalty point tracking | Defer until formal scheme rules are defined | Points require an immutable ledger |
| **D-11** | Return dispositions permitted | `restock`, `quarantine`, `discard` | Protects shelf inventory from defective stock |
| **D-12** | Sale void / reversal policy | Privileged reversal with compensating movements | Eliminates silent deletion of financial records |
| **D-13** | Payment provider integration scope | Manual method recording initially | API integrations (Telebirr/CBE) belong to milestone 2 |
| **D-14** | Receipt numbering format | Server-generated `REC-YYYY-XXXX` | Guarantees uniqueness and auditability |
| **D-15** | Offline POS operation requirements | Online-only initially | Offline operation requires conflict resolution engine |
| **D-16** | Session timeout and password policy | 8-hour shift timeout, Argon2id hashing | Balances cashier till usability and security |
| **D-17** | Stock correction approval thresholds | Admin approval for adjustments > 5,000 ETB | Prevents unauthorized inventory shrinkage write-offs |
| **D-18** | RPO / RTO backup targets | Daily automated backup, RPO $\le$ 24h, RTO $\le$ 2h | Establishes operational disaster recovery standards |
| **D-19** | Foreign currency purchasing (USD/AED) | Record in ETB at conversion time initially | Multi-currency accounting requires FX gain/loss engine |
| **D-20** | Verified business registration info | Use verified legal entity information | Replaces simulated demo TIN and placeholder addresses |

---

## 11. Appendix: Scope Confirmation

This document contains architectural decisions, logical data definitions, proposed API contracts, state-transition rules, and an implementation roadmap only.

It does **not** create or execute:
- Backend application source code
- Prisma schema files
- SQL table DDL
- Database migrations
- Live API endpoints
- Authentication services
- Production infrastructure changes

*All backend implementation deliverables remain strictly subject to formal business decision log resolution and authorization.*
