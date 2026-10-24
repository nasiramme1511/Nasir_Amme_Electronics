#!/usr/bin/env bash
# ==============================================================================
# NASIR AMME ELECTRONICS — RESTORE NEON CLOUD DATABASE SCRIPT
# ==============================================================================

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${CYAN}${BOLD}Switching Prisma back to Neon Cloud PostgreSQL...${NC}"

# Restore from .env.neon if available, or use environment variables
if [ -f ".env.neon" ]; then
  cp .env.neon .env
  echo -e "${GREEN}✔ Loaded credentials from .env.neon.${NC}"
else
  NEON_URL="${NEON_DATABASE_URL:-$1}"
  NEON_UNPOOLED="${NEON_DATABASE_URL_UNPOOLED:-$2}"

  if [ -z "$NEON_URL" ]; then
    echo -e "${YELLOW}Please provide NEON_DATABASE_URL environment variable or create .env.neon${NC}"
    exit 1
  fi

  cat << EOF > .env
# Nasir Amme Electronics — Environment Configuration
# Local & Production PostgreSQL Database URL (Neon Cloud Postgres)
DATABASE_URL="${NEON_URL}"
DATABASE_URL_UNPOOLED="${NEON_UNPOOLED:-$NEON_URL}"

# App & Server Configuration
NEXT_PUBLIC_APP_NAME="Nasir Amme Electronics"
NEXT_PUBLIC_SHOP_LOCATION="Dire Dawa, Ethiopia (Near B-Capital Hotel)"
NEXT_PUBLIC_DEFAULT_CURRENCY="ETB"

# Authentication Session Secret (Change in production)
SESSION_SECRET="nasir-amme-dev-secret-key-32-chars-long-minimum-random"
NODE_ENV="development"
EOF
fi

echo -e "${GREEN}✔ .env successfully restored to Neon Cloud Postgres.${NC}"
echo -e "${YELLOW}--> Regenerating Prisma client for Neon Cloud...${NC}"
npx prisma generate
echo -e "${GREEN}${BOLD}✔ Database connection restored! Start your app with: npm run dev${NC}\n"
