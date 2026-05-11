#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  HomeMatch — One-click startup script for macOS
#  Double-click this file (or run: bash start.sh) to launch.
# ─────────────────────────────────────────────────────────────

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
RESET="\033[0m"
BOLD="\033[1m"

echo ""
echo -e "${BLUE}${BOLD}  🏠 HomeMatch — Starting up...${RESET}"
echo -e "${BLUE}  ─────────────────────────────────────${RESET}"
echo ""

# ── 1. Check Node.js ──────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}  ✗ Node.js not found.${RESET}"
  echo "    Install it from: https://nodejs.org  (LTS version)"
  echo ""
  read -p "  Press any key to exit..." -n1
  exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}  ✓ Node.js${RESET} $NODE_VER"

# ── 2. Check npm ──────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  echo -e "${RED}  ✗ npm not found. Install Node.js from https://nodejs.org${RESET}"
  read -p "  Press any key to exit..." -n1
  exit 1
fi

echo -e "${GREEN}  ✓ npm${RESET} $(npm -v)"

# ── 3. Install dependencies if needed ─────────────────────────
if [ ! -d "node_modules" ]; then
  echo ""
  echo -e "${YELLOW}  ⏳ Installing dependencies (first run only)...${RESET}"
  npm install --silent
  echo -e "${GREEN}  ✓ Dependencies installed${RESET}"
else
  echo -e "${GREEN}  ✓ Dependencies ready${RESET}"
fi

# ── 4. Check / create .env ────────────────────────────────────
if [ ! -f ".env" ]; then
  echo ""
  echo -e "${YELLOW}  ⚠  No .env file found — creating from .env.example${RESET}"
  cp .env.example .env
  echo -e "     Edit ${BOLD}.env${RESET} to add your database URL and API keys."
fi

# Load DATABASE_URL from .env
export $(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null || true

# ── 5. Check PostgreSQL ───────────────────────────────────────
echo ""
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}  ✗ DATABASE_URL is not set in .env${RESET}"
  echo "    Example: DATABASE_URL=postgresql://localhost/homematch"
  echo ""
  read -p "  Press any key to exit..." -n1
  exit 1
fi

# Try to ping the database
if command -v psql &>/dev/null; then
  if psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null 2>&1; then
    echo -e "${GREEN}  ✓ PostgreSQL connected${RESET}"
  else
    echo -e "${RED}  ✗ Cannot connect to PostgreSQL at:${RESET}"
    echo "    $DATABASE_URL"
    echo ""
    echo "  Make sure PostgreSQL is running:"
    echo -e "    ${BOLD}brew services start postgresql@15${RESET}  (if using Homebrew)"
    echo -e "    ${BOLD}pg_ctl start${RESET}  (if using pg_ctl)"
    echo ""
    read -p "  Press any key to exit..." -n1
    exit 1
  fi
else
  echo -e "${YELLOW}  ⚠  psql not in PATH — skipping DB check${RESET}"
fi

# ── 6. Push schema (safe, idempotent) ─────────────────────────
echo ""
echo -e "${YELLOW}  ⏳ Applying database schema...${RESET}"
npm run db:push -- --accept-data-loss 2>/dev/null &
DB_PID=$!

# Give drizzle 12 seconds then kill if still waiting for input
sleep 12 && kill $DB_PID 2>/dev/null || true
wait $DB_PID 2>/dev/null || true
echo -e "${GREEN}  ✓ Schema ready${RESET}"

# ── 7. Start the dev server ───────────────────────────────────
PORT="${PORT:-3001}"

echo ""
echo -e "${BLUE}${BOLD}  🚀 Starting HomeMatch on http://localhost:${PORT}${RESET}"
echo -e "${BLUE}  ─────────────────────────────────────${RESET}"
echo ""
echo -e "  ${BOLD}Web App:${RESET}        http://localhost:${PORT}"
echo -e "  ${BOLD}Agent Portal:${RESET}   http://localhost:${PORT}/agent-portal"
echo -e "  ${BOLD}Agent Register:${RESET} http://localhost:${PORT}/agent-register"
echo -e "  ${BOLD}Admin Panel:${RESET}    http://localhost:${PORT}/admin"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop${RESET}"
echo ""

# Open browser after 3 seconds
(sleep 3 && open "http://localhost:${PORT}") &

# Start the server
npm run dev
