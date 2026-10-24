# Nasir Amme Electronics — Staff Accounts & Login Guide

**Document Version:** 2.0.0  
**Implementation & Verification Date:** October 15, 2026  
**Status:** **OPERATIONAL & PRODUCTION-VERIFIED (100% Tests Passed)**  
**Target System:** Nasir Amme Electronics (Retail POS & Inventory Management System)  
**Database Host:** Neon Lakebase PostgreSQL (`ep-round-wildflower-akpnnaj7-pooler.c-3.us-west-2.aws.neon.tech`)  
**Primary Branch:** Dire Dawa Retail Branch (Shop ID: `shop-dire-dawa-01`, Kebele 02, Commercial District)  

---

## 1. Executive Summary & Authentication Status

Staff authentication, session management, role-based access control (RBAC), and route protections have been fully implemented, tested in an isolated Neon branch (`test-auth`), and deployed to the live production database.

### Verified System Highlights

1. **Working Staff Login Page:** Fully functional and operational at [`/login`](http://localhost:3000/login).
2. **Server-Side Session Authentication:** Cryptographically secure 64-character hex session tokens stored via SHA-256 hashes in PostgreSQL `sessions` table.
3. **Cookie Security:** Delivered via `HttpOnly`, `SameSite=Lax`, `Path=/` secure cookie (`nae_session`) with an 8-hour retail shift expiration.
4. **Authoritative API Guarding:** All 18 private API routes enforce `requireAuth` and granular `requirePermission` / `requireRole` boundaries. Requests without valid sessions return `401 Unauthorized`, and unauthorized role actions return `403 Forbidden`.
5. **Session Revocation & Sign-Out:** Interactive sign-out in the top navigation header instantly revokes active sessions in the database (`revokedAt = NOW()`) and purges client cookies.
6. **Isolated Database Branch Verification:** Prior to applying changes to the live database, all migrations, password provisioning, and RBAC boundary tests were executed against an isolated Neon database branch (`test-auth`) with 100% assertions passing.

---

## 2. Actual Staff Accounts Directory & Verified Login Credentials

All 5 staff accounts are registered under Shop `shop-dire-dawa-01`. Each account has been provisioned with a secure bcrypt-hashed temporary password.

| User ID | Full Name | Login Email | Assigned Role | Account Status | Verified Initial Password | Permissions Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `usr-01` | **Nasir Amme** | `nasir@amme-electronics.et` | `admin` | `active` | `AmmeAdmin#2026!` | 13/13 (Full System Admin) |
| `usr-02` | **Yonas Bekele** | `yonas@amme-electronics.et` | `manager` | `active` | `YonasManager#2026!` | 11/13 (Floor Operations) |
| `usr-03` | **Tigist Alem** | `tigist@amme-electronics.et` | `cashier` | `active` | `TigistCashier#2026!` | 2/13 (Till 1 Checkout/Returns) |
| `usr-04` | **Hamza Mohammed** | `hamza@amme-electronics.et` | `cashier` | `active` | `HamzaCashier#2026!` | 2/13 (Till 2 Checkout/Returns) |
| `usr-05` | **Abel Girma** | `abel@amme-electronics.et` | `stock_keeper` | `active` | `AbelStock#2026!` | 3/13 (Warehouse & Counts) |

> [!TIP]
> **Production Best Practice:**
> Upon logging in for the first shift, staff members should update their temporary password. Passwords are encrypted with bcrypt (12 salt rounds) and recorded in the store audit log.

---

## 3. Implemented Roles & Granular Permissions Matrix

The system enforces 4 system-managed roles (`isSystemManaged: true`) across 13 granular permissions:

### 3.1 Role Scope Summary

- **`admin` (Administrator):** Universal administrative authority over store catalog, users, settings, purchases, POS, reports, and audit logs. Master authorization bypass.
- **`manager` (Store Manager):** Supervise store floor, approve purchase orders, authorize returns and refunds, post inventory corrections, and view profit margins. Excluded only from user credential management (`users.manage`) and shop metadata configuration (`settings.manage`).
- **`cashier` (Cashier):** Front-counter retail operations. Permitted to process POS sales tenders (`sales.checkout`) and log customer returns (`returns.process`). Blocked from viewing COGS margins, inventory stock adjustments, receiving goods, or editing catalog.
- **`stock_keeper` (Stock Keeper):** Logistics and warehouse operations. Permitted to receive deliveries against POs (`purchases.receive`), enter physical cycle counts (`inventory.count`), and post shrinkage adjustments (`inventory.adjust`). Blocked from POS checkout, return refunds, financial reports, and user administration.

### 3.2 Granular Permissions Matrix

| Permission Code | Display Name | Functional Description | `admin` | `manager` | `cashier` | `stock_keeper` |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `sales.checkout` | Process Checkout | Create, tender, and finalize sales at retail POS | ✅ | ✅ | ✅ | ❌ (403) |
| `sales.void` | Void Sale | Authorize post-tender transaction reversals | ✅ | ✅ | ❌ (403) | ❌ (403) |
| `returns.process` | Process Returns | Initiate customer return requests against sales | ✅ | ✅ | ✅ | ❌ (403) |
| `returns.approve` | Approve Returns | Authorize refunds (cash/digital payout) | ✅ | ✅ | ❌ (403) | ❌ (403) |
| `purchases.create` | Create Purchase Orders | Draft purchase requisitions for suppliers | ✅ | ✅ | ❌ (403) | ❌ (403) |
| `purchases.approve` | Approve Purchases | Authorize vendor POs and commit budget | ✅ | ✅ | ❌ (403) | ❌ (403) |
| `purchases.receive` | Receive Goods | Log delivery of physical stock & update AVCO | ✅ | ✅ | ❌ (403) | ✅ |
| `inventory.count` | Conduct Stock Counts | Enter physical cycle count tallies | ✅ | ✅ | ❌ (403) | ✅ |
| `inventory.adjust` | Adjust Stock | Post manual inventory variance corrections | ✅ | ✅ | ❌ (403) | ✅ |
| `reports.view` | View Reports | Access margin analytics, profit & loss, COGS | ✅ | ✅ | ❌ (403) | ❌ (403) |
| `users.manage` | Manage Staff | Create, modify, and assign staff credentials | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| `settings.manage` | Manage Settings | Modify store tax rates, address, receipt text | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| `audit.view` | View Audit Logs | Inspect chronological system security events | ✅ | ✅ | ❌ (403) | ❌ (403) |

---

## 4. Protected API Route Catalog

Every private route in the Next.js App Router enforces authentication:

| Endpoint | Method | Required Permission / Role | Behavior for Unauthorized Calls |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public | Validates credentials, issues 8-hour session cookie |
| `/api/auth/logout` | `POST` | Authenticated | Revokes session in DB (`revokedAt = NOW()`), clears cookie |
| `/api/auth/me` | `GET` | Authenticated | Returns active staff profile, shop ID, roles, and permissions |
| `/api/sales` | `GET` | `sales.checkout` or `reports.view` | Rejects unauthenticated (401) or unauthorized roles (403) |
| `/api/sales` | `POST` | `sales.checkout` | Sets `cashierId` authoritatively to authenticated caller |
| `/api/sales/[id]` | `GET` | Authenticated | Returns sale details with items and payments |
| `/api/returns` | `GET`, `POST` | `returns.process` | Sets `postedBy` authoritatively to authenticated staff name |
| `/api/inventory/adjust` | `POST` | `inventory.adjust` | Sets `actorId` authoritatively to authenticated staff ID |
| `/api/inventory/movements`| `GET` | Authenticated | Returns immutable inventory ledger entries |
| `/api/purchases` | `GET` | Authenticated | Lists purchase orders and receiving status |
| `/api/purchases` | `POST` | `purchases.create` | Creates purchase order; sets `createdBy` to caller |
| `/api/purchases/[id]/receive` | `POST` | `purchases.receive` | Records goods intake and updates weighted average cost |
| `/api/reports/summary` | `GET` | `reports.view` | Computes revenue, COGS, and profit margin (Admin & Manager) |
| `/api/users` | `GET`, `POST` | `users.manage` | Staff administration and initial credential issuing (Admin only) |
| `/api/settings` | `GET` | Authenticated | Fetches shop contact, address, and receipt metadata |
| `/api/settings` | `PUT` | `settings.manage` | Updates shop parameters (Admin only) |
| `/api/products` | `GET` | Authenticated | Product catalog lookup |
| `/api/products` | `POST` | `admin` or `manager` | New SKU registration with opening stock ledger |
| `/api/products/[id]` | `PUT` | `admin` or `manager` | Product editing and audited stock overrides |
| `/api/products/[id]` | `DELETE` | `admin` | Soft-deactivates product (preserves historical ledger) |
| `/api/categories` | `GET`, `POST` | `requireAuth` (GET), `admin`/`manager` (POST) | Category management |
| `/api/customers` | `GET`, `POST` | Authenticated | Customer registry |
| `/api/suppliers` | `GET`, `POST` | `requireAuth` (GET), `admin`/`manager` (POST) | Vendor directory |

---

## 5. Staff Login Instructions

### Step-by-Step Login Walkthrough

1. Open your browser and navigate to:
   👉 **`http://localhost:3000/login`**
2. Enter your store email address (e.g., `nasir@amme-electronics.et` for Admin, or `tigist@amme-electronics.et` for Cashier).
3. Enter your verified password (see [Directory in § 2](#2-actual-staff-accounts-directory--verified-login-credentials)).
4. Click **Sign In to Terminal**.
5. Once verified:
   - The browser securely receives the `nae_session` cookie.
   - You are automatically redirected to the main store dashboard.
   - The top navigation bar displays your name, initials, and role badge (e.g., `Nasir Amme • Administrator Access` or `Tigist Alem • Cashier Access`).
   - Private actions throughout the POS and management menus are dynamically unlocked based on your role.

### Quick Testing Profiles on `/login`
For testing during store setup, the login card features **one-click testing profile buttons** for Nasir Amme (Admin), Yonas Bekele (Manager), Tigist Alem (Cashier), and Abel Girma (Stock Keeper) that automatically fill the email input.

### Sign-Out Procedure
1. Click your profile avatar / name in the upper-right corner of the navigation bar.
2. Click the red **Sign Out** button.
3. The server revokes your database session, destroys the browser cookie, and redirects you back to the `/login` screen.

---

## 6. Verification Test Suite & Administrator Commands

### 6.1 Automated Verification Suite
To re-run the 26 automated authentication and RBAC tests at any time:

```bash
# Run against the live production database
npx tsx scripts/verify-auth.ts
```

All 26 test assertions will execute:
- Negative invalid password & non-existent email rejection (401).
- Positive credential verification for all 4 roles.
- Granular RBAC boundary enforcement (Cashier blocked from `/users`, Stock Keeper blocked from POS checkout, Manager blocked from `/users`).
- Session revocation on logout and subsequent call rejection (401).
- Mass session revocation (`revokeAllUserSessions`).

### 6.2 Testing in an Isolated Neon Branch
To perform testing or migrations in an isolated branch without risking production data:

```bash
# 1. Create a copy-on-write branch from production
neon branches create --name test-staging --no-secrets

# 2. Run verification on the isolated branch using its connection string
DATABASE_URL="$(neon connection-string test-staging --prisma --pooled)" npx tsx scripts/verify-auth.ts

# 3. Clean up the branch after testing
neon branches delete test-staging
```

### 6.3 Safe Read-Only SQL Inspection
To inspect active staff sessions without exposing secrets:

```sql
SELECT 
    s.id AS session_id,
    u."fullName" AS staff_name,
    r.code AS role_code,
    s."createdAt" AS login_time,
    s."expiresAt" AS expires_at,
    s."lastSeenAt" AS last_active,
    CASE WHEN s."revokedAt" IS NULL THEN 'ACTIVE' ELSE 'REVOKED' END AS session_status
FROM sessions s
JOIN users u ON s."userId" = u.id
JOIN user_roles ur ON u.id = ur."userId"
JOIN roles r ON ur."roleId" = r.id
ORDER BY s."createdAt" DESC
LIMIT 20;
```
