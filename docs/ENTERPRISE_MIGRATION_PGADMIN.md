# Enterprise Migration Guide: Switching Prisma from Neon to Local/Self-Hosted PostgreSQL & pgAdmin 4
**Nasir Amme Electronics — Dire Dawa, Ethiopia**

---

## 1. Architectural Clarification

- **Neon Cloud Postgres**: A serverless PostgreSQL provider utilizing pooled connections (PgBouncer) via endpoints like `ep-round-wildflower-akpnnaj7-pooler.c-3.us-west-2.aws.neon.tech` with `?sslmode=require`.
- **pgAdmin 4**: A graphical client interface used to administer, query, and monitor PostgreSQL database instances.
- **The Target Architecture**: Your Next.js Prisma ORM client connects directly to an underlying PostgreSQL server instance (running locally on `localhost:5432`, in Docker, or on a private on-premise server) managed through pgAdmin 4.

---

## 2. Step 1: Create Database & User in pgAdmin 4

1. Open **pgAdmin 4** on your management workstation or server.
2. In the left navigation tree, expand your active PostgreSQL server (e.g., `Servers > PostgreSQL 16`).
3. Right-click **Databases** > **Create** > **Database...**
   - **Database**: `nasir_amme_db`
   - **Owner**: `postgres` (or your dedicated operational role).
   - Click **Save**.
4. *(Recommended Production Practice)* Create a dedicated role:
   - Right-click **Login/Group Roles** > **Create** > **Login/Group Role...**
   - **Name**: `nasir_admin`
   - Under the **Definition** tab: Set a strong password (e.g., `SecureAmmePass2026!`).
   - Under the **Privileges** tab: Check **Can login?** = `Yes` and **Create databases** = `Yes`.

---

## 3. Step 2: Configure Environment Variables (`.env`)

Replace the Neon cloud connection string in your `.env` file with your standard PostgreSQL connection string:

### Local / Self-Hosted PostgreSQL Configuration (`.env`)
```bash
# Standard PostgreSQL URI Format:
# postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

DATABASE_URL="postgresql://postgres:YourPostgresPassword@localhost:5432/nasir_amme_db?schema=public"

# If using a custom user created in pgAdmin:
# DATABASE_URL="postgresql://nasir_admin:SecureAmmePass2026!@localhost:5432/nasir_amme_db?schema=public"

# Direct URL is identical for local non-pooled PostgreSQL:
DATABASE_URL_UNPOOLED="postgresql://postgres:YourPostgresPassword@localhost:5432/nasir_amme_db?schema=public"
```

> **Note on Special Characters**: If your PostgreSQL password contains special characters (`@`, `#`, `:`, `/`, or `%`), you must URL-encode them (e.g., `#` becomes `%23`).

---

## 4. Step 3: Prisma Schema Configuration (`prisma/schema.prisma`)

Neon setups utilize `directUrl` for shadow databases and migrations due to PgBouncer connection limits. For standard PostgreSQL running with pgAdmin 4:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED") // Can point to the same direct connection string
}

generator client {
  provider = "prisma-client-js"
}
```

---

## 5. Step 4: Run Migrations or Push Schema

Open your terminal in the root of the project (`/home/nasir/Nasir_Amme_Electronics`) and run:

### A. Generate Prisma Client
```bash
npx prisma generate
```

### B. Apply Schema to the New Database
Choose one of the following strategies depending on environment requirements:

- **Option 1: Direct Schema Sync (Recommended for rapid development & local dev)**:
  ```bash
  npx prisma db push
  ```
- **Option 2: Formal Migration History (Recommended for production & audit integrity)**:
  ```bash
  npx prisma migrate dev --name init_local_pgadmin
  ```

### C. Seed Initial System Roles & Store Administrator
Execute the seed script to populate required RBAC records, categories, and initial admin profile:
```bash
npx prisma db seed
```

---

## 6. Step 5: Verify Data in pgAdmin 4

1. Switch back to **pgAdmin 4**.
2. Refresh your database tree:
   - `Servers > PostgreSQL > Databases > nasir_amme_db > Schemas > public > Tables`.
3. Verify that all enterprise tables are generated:
   - `products`
   - `roles`
   - `users`
   - `sales`
   - `sale_items`
   - `stock_movements`
   - `audit_logs`
   - `categories`
   - `_prisma_migrations` (if using `migrate dev`)
4. Right-click the `products` or `users` table > **View/Edit Data** > **First 100 Rows** to confirm data accessibility.

---

## 7. Troubleshooting Common Local Connection Issues

| Error | Root Cause | Solution |
| :--- | :--- | :--- |
| **`P1001: Can't reach database server at localhost:5432`** | PostgreSQL service is stopped or port 5432 is blocked. | Verify service is running via `sudo systemctl status postgresql` (Linux) or Windows Services. Check firewall rules. |
| **`P1000: Authentication failed against database server`** | Incorrect username or password in `DATABASE_URL`. | Test credentials in pgAdmin 4 query tool or run `psql -U postgres -h localhost`. |
| **`P1003: Database nasir_amme_db does not exist`** | Database was not created prior to migration. | Create the database manually in pgAdmin 4 or run `npx prisma db push`, which offers to create it automatically. |
| **`pg_hba.conf rejects connection`** | PostgreSQL client authentication restriction. | In `pg_hba.conf`, configure local IPv4 connections (`127.0.0.1/32`) to `scram-sha-256` or `md5` and reload PostgreSQL (`sudo systemctl reload postgresql`). |
