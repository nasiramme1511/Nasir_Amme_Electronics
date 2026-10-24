# Nasir Amme Electronics — Enterprise POS & Inventory Management System

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-336791?logo=postgresql)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Enterprise_Design-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Automated Tests](https://img.shields.io/badge/Tests-100%25_Passing-success)](#automated-verification-suite)

An enterprise-grade, point-of-sale (POS) and inventory management platform designed for high-throughput retail electronics operations in Dire Dawa, Ethiopia. Built with a focus on **strict data integrity, double-entry audit ledgers, role-based security, and deterministic business logic**.

---

## 🏗️ System Architecture

```
                                  [ Browser / Client ]
                                           │
                           (HTTPS / Next.js 16 App Router)
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 APPLICATION CORE                                       │
│                                                                                        │
│  ┌───────────────────────┐  ┌────────────────────────┐  ┌───────────────────────────┐  │
│  │   UI & Presentation   │  │   RBAC Guard & Auth    │  │   Domain Service Layer    │  │
│  │  - Neutral Enterprise │  │  - Argon2/HMAC Session  │  │  - POS & Multi-Rail Sale  │  │
│  │  - Dark / Light Theme │  │  - Role Middleware      │  │  - Cash Shifts & Z-Report │  │
│  │  - Thermal Slip Print │  │  - OTP Challenge System │  │  - Ledger Audit Engine    │  │
│  └───────────────────────┘  └────────────────────────┘  └───────────────────────────┘  │
│                                          │                                             │
│                                          ▼                                             │
│                             ┌──────────────────────────┐                               │
│                             │     Prisma ORM Layer     │                               │
│                             └──────────────────────────┘                               │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                           (Connection Pooling & SSL)
                                           │
                                           ▼
                            ┌──────────────────────────────┐
                            │    Neon Cloud PostgreSQL     │
                            │  - 3NF Relational Tables     │
                            │  - Atomic Transactions       │
                            │  - Immutable Audit Logs      │
                            └──────────────────────────────┘
```

---

## ⚡ Key Capabilities

### 1. Point of Sale & Multi-Rail Checkout
- **Instant Barcode Lookup:** Hardware scanner and camera-based SKU detection with sub-10ms catalog caching.
- **Multi-Rail Payments:** Split or single payments supporting **Cash (ETB)**, **Telebirr**, and **CBE Birr** with transaction reference tracking.
- **Receipt Engine:** Formats standard 80mm ESC/POS thermal receipts and on-screen printable transaction slips with branch tax/ID metadata.

### 2. Cashier Shifts & Reconciliation
- Strict shift lifecycles (`OPENING` &rarr; `ACTIVE` &rarr; `CLOSING` &rarr; `CLOSED`).
- Blind cash drops and automated discrepancy calculations (`Counted Cash` vs `System Calculated Drawer Balance`).
- Formal End-of-Day **Z-Reports** summarizing total sales, category breakdowns, and tax liabilities.

### 3. Inventory & Double-Entry Stock Ledger
- **No Floating Balances:** Every inventory change is backed by an immutable ledger row (`StockMovement`) recording `QUANTITY_CHANGE`, `PREVIOUS_STOCK`, `NEW_STOCK`, `REASON`, and `STAFF_ID`.
- Automated low-stock thresholds with real-time shortage alerts.
- Support for IMEI and unique serial number intake on phones, laptops, and chargers.

### 4. Enterprise RBAC (Role-Based Access Control)
Strict isolation across 4 distinct staff operational roles:

| Capability / Resource | Administrator | Store Manager | Cashier (Till) | Stock Keeper |
| :--- | :---: | :---: | :---: | :---: |
| POS Checkout & Receipts | ✅ | ✅ | ✅ | ❌ |
| Own Shift Management | ✅ | ✅ | ✅ | ❌ |
| View Financial Reports & COGS | ✅ | ✅ | ❌ (Redacted) | ❌ |
| Inventory Intake & Receiving | ✅ | ✅ | ❌ | ✅ |
| Staff Management & Role Edit | ✅ | ❌ | ❌ | ❌ |
| Audit Logs & Ledger Inspection| ✅ | ❌ | ❌ | ❌ |
| System Configuration & Taxes | ✅ | ❌ | ❌ | ❌ |

---

## 📊 Business Logic & Ledger Equations

The system enforces deterministic accounting standards:

$$\text{Net Revenue} = \text{Gross Sales} - \text{Returns} - \text{Discounts}$$

$$\text{Gross Profit} = \text{Net Revenue} - \text{Cost of Goods Sold (COGS)}$$

$$\text{Gross Margin \%} = \begin{cases} \left( \frac{\text{Gross Profit}}{\text{Net Revenue}} \right) \times 100, & \text{if Net Revenue} > 0 \\ \text{N/A}, & \text{if Net Revenue} \le 0 \end{cases}$$

---

## 🧪 Automated Verification Suite

The repository includes comprehensive automated test suites covering API security, edge cases, date boundaries, and inventory concurrency:

```bash
# 1. Verify Role-Based Access Control & Boundary Isolation (28 tests)
npm run test:rbac

# 2. Verify Analytics, Date Presets & Zero-Denominator Safety (51 tests)
npm run test:dashboard

# 3. Verify Product Inventory Concurrency & Stock Sync (27 tests)
npm run test:inventory-sync

# 4. Verify Double-Entry Valuation & Ledger Audit Integrity (25 tests)
npm run test:audit

# 5. Verify Soft-Delete & Historical Transaction Preservation (39 tests)
npm run test:purge

# 6. Verify Security Recovery & OTP Cryptographic Digests (55 tests)
npm run test:recovery
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** v18.17+ or v20+
- **PostgreSQL:** Neon Cloud Serverless instance or local PostgreSQL (v14+)
- **Package Manager:** `npm`

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nasiramme1511/Nasir_Amme_Electronics.git
   cd Nasir_Amme_Electronics
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to configure your `DATABASE_URL` and `SESSION_SECRET`.*

4. **Synchronize database schema & seed initial baseline:**
   ```bash
   npx prisma generate
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to access the staff portal.

---

## 🛡️ Security Implementation
- **Password Hashing:** PBKDF2 / Argon2 cryptographic password derivations with unique salts.
- **Tamper-Resistant Sessions:** Signed HTTP-only session tokens with strict expiration.
- **Data Scoping:** Cashier queries redact wholesale costs and profit margins at the API layer.
- **Audit Trails:** Administrative modifications, price edits, and inventory write-offs generate persistent audit events.

---

## 📄 License & Attribution
Developed by **Nasir Amme** &bull; Dire Dawa, Ethiopia &bull; Software Engineering, Dire Dawa University.
