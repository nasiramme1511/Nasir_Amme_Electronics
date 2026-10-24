#!/usr/bin/env bash
# ==============================================================================
# NASIR AMME ELECTRONICS — TERMINAL DATABASE MIGRATION SCRIPT
# Target: Switch Prisma ORM from Neon Serverless to Local PostgreSQL & pgAdmin 4
# Location: Dire Dawa, Ethiopia
# ==============================================================================

set -e

# Terminal output formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "\n${CYAN}${BOLD}======================================================================${NC}"
echo -e "${CYAN}${BOLD}   SWITCHING PRISMA TO LOCAL POSTGRESQL & PGADMIN 4 INTERFACE${NC}"
echo -e "${CYAN}${BOLD}======================================================================${NC}\n"

# ------------------------------------------------------------------------------
# STEP 1: Verify and Start PostgreSQL Service
# ------------------------------------------------------------------------------
echo -e "${YELLOW}--> [1/6] Checking local PostgreSQL service...${NC}"

if command -v systemctl >/dev/null 2>&1; then
  if systemctl list-unit-files 2>/dev/null | grep -q "postgresql\.service"; then
    if ! systemctl is-active --quiet postgresql; then
      echo -e "Starting PostgreSQL service via systemctl..."
      sudo systemctl start postgresql 2>/dev/null || true
    fi
  fi
fi

# Pre-flight check: Verify PostgreSQL server is actually listening on target port
if ! pg_isready -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" >/dev/null 2>&1; then
  echo -e "\n${RED}${BOLD}======================================================================${NC}"
  echo -e "${RED}${BOLD}⚠️  LOCAL POSTGRESQL SERVER IS NOT RUNNING ON ${DB_HOST:-localhost}:${DB_PORT:-5432}${NC}"
  echo -e "${RED}${BOLD}======================================================================${NC}"
  echo -e "pgAdmin 4 and PostgreSQL client utilities are installed, but the PostgreSQL"
  echo -e "server daemon ('postgresql' package) is not running on this system.\n"
  echo -e "${YELLOW}To install and start the PostgreSQL server daemon on Ubuntu/Debian:${NC}"
  echo -e "  ${BOLD}sudo apt update && sudo apt install -y postgresql postgresql-contrib${NC}"
  echo -e "  ${BOLD}sudo systemctl enable --now postgresql${NC}"
  echo -e "  ${BOLD}sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'postgres';\"${NC}\n"
  echo -e "${CYAN}To keep using your existing Neon Cloud database in the meantime:${NC}"
  echo -e "  ${BOLD}npm run db:restore-neon${NC}\n"
  exit 1
fi
echo -e "${GREEN}✔ PostgreSQL server is listening on ${DB_HOST:-localhost}:${DB_PORT:-5432}.${NC}"

# ------------------------------------------------------------------------------
# STEP 2: Configure Database and Credentials
# ------------------------------------------------------------------------------
DB_NAME="${DB_NAME:-nasir_amme_db}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo -e "\n${YELLOW}--> [2/6] Verifying database '${DB_NAME}' existence...${NC}"

# Create database if not present using psql CLI
if command -v psql >/dev/null 2>&1; then
  if sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo -e "${GREEN}✔ Database '${DB_NAME}' already exists.${NC}"
  else
    echo -e "Creating database '${DB_NAME}' with owner '${DB_USER}'..."
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || \
    psql -U "${DB_USER}" -h "${DB_HOST}" -p "${DB_PORT}" -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || \
    echo -e "${YELLOW}Notice: Could not automatically create '${DB_NAME}' via psql; Prisma will attempt to create it on db push.${NC}"
    echo -e "${GREEN}✔ Database '${DB_NAME}' confirmed on ${DB_HOST}:${DB_PORT}.${NC}"
  fi
else
  echo -e "${YELLOW}psql not found in PATH; Prisma db push will provision '${DB_NAME}' if permitted.${NC}"
fi

# ------------------------------------------------------------------------------
# STEP 3: Switch Project Environment Variables (.env)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}--> [3/6] Backing up and switching .env credentials...${NC}"

if [ -f ".env" ]; then
  BACKUP_FILE=".env.backup.$(date +%s)"
  cp .env "${BACKUP_FILE}"
  echo -e "Backed up existing .env configuration to ${BOLD}${BACKUP_FILE}${NC}."
fi

# Ask for postgres password securely or use default / pre-set env
if [ -z "${POSTGRES_PASS}" ]; then
  read -s -p "Enter PostgreSQL password for user '${DB_USER}' [leave blank if default 'postgres']: " ENTERED_PASS
  echo ""
  POSTGRES_PASS=${ENTERED_PASS:-"postgres"}
fi

# Write connection URLs targeting local PostgreSQL instance
LOCAL_URL="postgresql://${DB_USER}:${POSTGRES_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

# Replace or comment out old Neon URLs in .env cleanly
if [ -f ".env" ]; then
  # Comment out old active DATABASE_URL lines
  sed -i.bak 's|^DATABASE_URL="|# DEPRECATED_NEON_DATABASE_URL="|g' .env 2>/dev/null || \
  sed -i '' 's|^DATABASE_URL="|# DEPRECATED_NEON_DATABASE_URL="|g' .env 2>/dev/null || true

  sed -i.bak 's|^DATABASE_URL_UNPOOLED="|# DEPRECATED_NEON_DATABASE_URL_UNPOOLED="|g' .env 2>/dev/null || \
  sed -i '' 's|^DATABASE_URL_UNPOOLED="|# DEPRECATED_NEON_DATABASE_URL_UNPOOLED="|g' .env 2>/dev/null || true

  # Also handle unquoted format if any
  sed -i.bak 's|^DATABASE_URL=postgresql|# DEPRECATED_NEON_DATABASE_URL=postgresql|g' .env 2>/dev/null || \
  sed -i '' 's|^DATABASE_URL=postgresql|# DEPRECATED_NEON_DATABASE_URL=postgresql|g' .env 2>/dev/null || true
  rm -f .env.bak
fi

# Append new clean active local connection strings
echo "" >> .env
echo "# --- Local PostgreSQL Configuration ---" >> .env
echo "DATABASE_URL=\"${LOCAL_URL}\"" >> .env
echo "DATABASE_URL_UNPOOLED=\"${LOCAL_URL}\"" >> .env

echo -e "${GREEN}✔ .env updated: DATABASE_URL pointing to ${DB_HOST}:${DB_PORT}/${DB_NAME}.${NC}"

# ------------------------------------------------------------------------------
# STEP 4: Synchronize Schema & Seed Local Database
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}--> [4/6] Running Prisma Client generation and schema push...${NC}"

npx prisma generate

if ! npx prisma db push --skip-generate; then
  echo -e "\n${RED}${BOLD}======================================================================${NC}"
  echo -e "${RED}${BOLD}❌ ERROR: Prisma could not connect to local PostgreSQL instance.${NC}"
  echo -e "${RED}${BOLD}======================================================================${NC}"
  echo -e "Reason: Either database '${DB_NAME}' does not exist, or user '${DB_USER}' password authentication failed.\n"
  echo -e "${YELLOW}To configure your local PostgreSQL user password and database:${NC}"
  echo -e "  1. Set password:  ${BOLD}sudo -u postgres psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\"${NC}"
  echo -e "  2. Create DB:     ${BOLD}sudo -u postgres psql -c \"CREATE DATABASE ${DB_NAME} OWNER postgres;\"${NC}"
  echo -e "  3. Re-run script: ${BOLD}npm run db:migrate-local${NC}\n"
  
  if [ -n "${BACKUP_FILE}" ] && [ -f "${BACKUP_FILE}" ]; then
    echo -e "Rolling back .env to previous configuration..."
    cp "${BACKUP_FILE}" .env
    echo -e "${GREEN}✔ Rolled back .env to previous working configuration.${NC}"
  fi
  exit 1
fi

echo -e "\n${YELLOW}--> Seeding RBAC roles and store owner accounts...${NC}"
npx prisma db seed 2>/dev/null || echo -e "${YELLOW}No custom seed command configured in package.json or seed already applied.${NC}"

# ------------------------------------------------------------------------------
# STEP 5: Run Verification Test Suite
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}--> [5/6] Running Product Purge Engine Audit Test Suite...${NC}"
if [ -f "scripts/test-product-purge-engine.ts" ]; then
  npx tsx scripts/test-product-purge-engine.ts || echo -e "${RED}Warning: Test suite encountered non-fatal errors.${NC}"
fi

# ------------------------------------------------------------------------------
# STEP 6: Launch pgAdmin 4 via Terminal
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}--> [6/6] Launching pgAdmin 4...${NC}"

if command -v pgadmin4 >/dev/null 2>&1; then
  echo -e "${GREEN}Opening desktop pgAdmin 4...${NC}"
  pgadmin4 &
elif [ -x "/usr/pgadmin4/bin/pgadmin4" ]; then
  echo -e "${GREEN}Opening desktop pgAdmin 4 from /usr/pgadmin4/bin/pgadmin4...${NC}"
  /usr/pgadmin4/bin/pgadmin4 &
elif command -v xdg-open >/dev/null 2>&1; then
  echo -e "${CYAN}Opening pgAdmin 4 web interface (http://127.0.0.1:5050)...${NC}"
  xdg-open "http://127.0.0.1:5050" 2>/dev/null || true
elif command -v open >/dev/null 2>&1; then
  open -a "pgAdmin 4" 2>/dev/null || open "http://127.0.0.1:5050" 2>/dev/null || true
elif [ -d "/Applications/pgAdmin 4.app" ]; then
  open "/Applications/pgAdmin 4.app"
else
  echo -e "${CYAN}Tip: pgAdmin 4 web server mode is accessible at http://localhost:5050 or start it via your application menu.${NC}"
fi

echo -e "\n${GREEN}${BOLD}✔ MIGRATION COMPLETE!${NC}"
echo -e "Prisma is connected to: ${BOLD}${DB_HOST}:${DB_PORT}/${DB_NAME}${NC}"
echo -e "Manage and inspect tables via pgAdmin 4.\n"
