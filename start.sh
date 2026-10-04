#!/usr/bin/env bash

# ==============================================================================
# HireMe — Unified Development Starter Script
# ==============================================================================
# Sets up Python virtualenv, installs dependencies, launches the FastAPI
# backend (port 8000), and starts the Next.js frontend (port 3000).
# ==============================================================================

set -eo pipefail

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$ROOT_DIR/.venv"

echo -e "${PURPLE}${BOLD}"
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                          HIREME DEV ENVIRONMENT                           ║"
echo "║             Personalized Job Aggregator & Scraping Pipeline               ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Clean Stale Processes on Target Ports ──────────────────────────────────

free_port() {
    local port=$1
    if command -v lsof &>/dev/null; then
        local pids
        pids=$(lsof -ti :"$port" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo -e "${YELLOW}⚡ Port $port is already in use by PID(s): $pids. Cleaning up...${NC}"
            echo "$pids" | xargs -r kill -9 2>/dev/null || true
            sleep 0.5
        fi
    fi
}

free_port 8000
free_port 3000

# ── 2. Virtual Environment ─────────────────────────────────────────────────────

if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}⚡ Virtual environment not found. Creating at $VENV_DIR ...${NC}"
    python3 -m venv "$VENV_DIR"
fi

echo -e "${CYAN}🔧 Sourcing Python virtual environment...${NC}"
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# ── 3. Backend Dependencies ───────────────────────────────────────────────────

echo -e "${CYAN}📦 Verifying backend Python requirements...${NC}"
pip install -q -r "$BACKEND_DIR/requirements.txt"
echo -e "${GREEN}✓ Backend dependencies ready.${NC}"

# ── 4. Frontend Dependencies ──────────────────────────────────────────────────

if command -v pnpm &> /dev/null; then
    PACKAGE_MGR="pnpm"
elif command -v npm &> /dev/null; then
    PACKAGE_MGR="npm"
else
    echo -e "${RED}❌ Neither pnpm nor npm found on PATH. Please install Node.js/pnpm.${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}⚡ Frontend node_modules missing. Installing via $PACKAGE_MGR...${NC}"
    (cd "$FRONTEND_DIR" && $PACKAGE_MGR install)
fi

# ── 5. Process Cleanup Handler ────────────────────────────────────────────────

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down HireMe services...${NC}"
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo -e "${CYAN}  Stopping Frontend (PID $FRONTEND_PID)...${NC}"
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${CYAN}  Stopping Backend (PID $BACKEND_PID)...${NC}"
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    # Also clean up ports if any orphaned child remained
    free_port 8000
    free_port 3000
    echo -e "${GREEN}✓ All services stopped. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ── 6. Launch Backend (FastAPI on port 8000) ──────────────────────────────────

echo -e "\n${CYAN}🚀 Starting FastAPI backend on http://localhost:8000 ...${NC}"
(
    cd "$BACKEND_DIR"
    exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

# Wait for backend to respond to health check
echo -ne "${YELLOW}⏳ Waiting for backend to warm up...${NC}"
for i in {1..20}; do
    if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
        echo -e " ${GREEN}✓ Backend is healthy!${NC}"
        break
    fi
    sleep 0.5
done

# ── 7. Launch Frontend (Next.js on port 3000) ─────────────────────────────────

echo -e "${CYAN}🚀 Starting Next.js frontend on http://localhost:3000 ...${NC}"
(
    cd "$FRONTEND_DIR"
    exec $PACKAGE_MGR dev
) &
FRONTEND_PID=$!

echo -e "\n${GREEN}${BOLD}==========================================================================="
echo -e "  HireMe is now running!"
echo -e "  🌐 Frontend Dashboard: ${CYAN}http://localhost:3000/dashboard${GREEN}"
echo -e "  🔌 Backend API Docs:   ${CYAN}http://localhost:8000/docs${GREEN}"
echo -e "  🩺 Health Telemetry:   ${CYAN}http://localhost:8000/api/health${GREEN}"
echo -e "===========================================================================${NC}"
echo -e "${YELLOW}Press [Ctrl+C] anytime to stop both servers cleanly.${NC}\n"

# Wait on background processes
wait "$BACKEND_PID" "$FRONTEND_PID"
