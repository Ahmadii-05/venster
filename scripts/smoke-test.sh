#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Smoke Test — Workflow-Embedded Micro-Hubs
# Run after `docker compose up` to verify the full stack is alive.
# Usage: bash scripts/smoke-test.sh
# ──────────────────────────────────────────────────────────────

set -uo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:8082}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:4173}"
DB_CONTAINER="${DB_CONTAINER:-venster-db-1}"

PASS=0
FAIL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
gray()  { printf "\033[90m%s\033[0m\n" "$1"; }

ok()   { green "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { red   "  ❌ $1"; FAIL=$((FAIL + 1)); }

echo ""
gray "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
gray "  Smoke Test — Micro-Hubs Stack"
gray "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Backend health ────────────────────────────────────────
gray "1. Backend API"

HTTP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"smoke@test.com","password":"test"}' 2>/dev/null || echo "000")
if [[ "$HTTP" =~ ^[2-4][0-9][0-9]$ ]]; then
    ok "Backend responds (HTTP $HTTP)"
else
    fail "Backend not responding (HTTP $HTTP)"
fi

HTTP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null || echo "000")
if [[ "$HTTP" =~ ^[2-4][0-9][0-9]$ ]]; then
    ok "Login validates input (HTTP $HTTP, not 500)"
else
    fail "Login broken (HTTP $HTTP)"
fi

echo ""

# ── 2. Frontend availability ─────────────────────────────────
gray "2. Frontend (nginx)"

HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$FRONTEND_URL" 2>/dev/null || echo "000")
if [[ "$HTTP" == "200" ]]; then
    ok "Frontend serves on $FRONTEND_URL"
else
    fail "Frontend not responding (HTTP $HTTP)"
fi

BODY=$(curl -s "$FRONTEND_URL/login" 2>/dev/null || echo "")
if echo "$BODY" | grep -q "<!doctype html>"; then
    ok "SPA routing: /login returns HTML"
else
    fail "SPA routing: /login did not return HTML"
fi

BODY=$(curl -s "$FRONTEND_URL/register" 2>/dev/null || echo "")
if echo "$BODY" | grep -q "<!doctype html>"; then
    ok "SPA routing: /register returns HTML"
else
    fail "SPA routing: /register did not return HTML"
fi

HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$FRONTEND_URL/favicon.svg" 2>/dev/null || echo "000")
if [[ "$HTTP" =~ ^[2-4][0-9][0-9]$ ]]; then
    ok "Static assets served"
else
    fail "Static assets not found (HTTP $HTTP)"
fi

echo ""

# ── 3. Database connectivity ────────────────────────────────
gray "3. PostgreSQL + pgvector"

if docker inspect --format='{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null | grep -q "true"; then
    ok "DB container ($DB_CONTAINER) is running"
else
    fail "DB container ($DB_CONTAINER) is not running"
fi

VEC=$(docker exec "$DB_CONTAINER" psql -U microhubs -d microhubs -t -c \
    "SELECT 1 FROM pg_extension WHERE extname='vector'" 2>/dev/null || echo "")
if echo "$VEC" | grep -q "1"; then
    ok "pgvector extension loaded"
else
    fail "pgvector extension not found"
fi

TABLES=$(docker exec "$DB_CONTAINER" psql -U microhubs -d microhubs -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")
if [[ "$TABLES" -gt 5 ]]; then
    ok "Schema tables exist ($TABLES tables)"
else
    fail "Schema tables missing (found $TABLES)"
fi

REG_EMAIL="smoke-$(date +%s)@test.com"
HTTP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BACKEND_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Smoke Test\",\"email\":\"$REG_EMAIL\",\"password\":\"test1234\"}" 2>/dev/null || echo "000")
if [[ "$HTTP" == "200" ]]; then
    ok "Backend can query DB (registration succeeded)"
else
    fail "Backend DB query failed (HTTP $HTTP)"
fi

echo ""

# ── 4. API smoke ─────────────────────────────────────────────
gray "4. API Smoke"

API_EMAIL="smoke-api-$$@test.com"
RESP=$(curl -s -X POST "$BACKEND_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Smoke\",\"email\":\"API-$API_EMAIL\",\"password\":\"test1234\"}" 2>/dev/null || echo "")
TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    ok "Auth token obtained"

    HTTP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BACKEND_URL/api/workspaces" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"Smoke Workspace"}' 2>/dev/null || echo "000")
    if [[ "$HTTP" == "200" ]]; then
        ok "Workspace creation works"
    else
        fail "Workspace creation failed (HTTP $HTTP)"
    fi

    HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$BACKEND_URL/api/workspaces" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    if [[ "$HTTP" == "200" ]]; then
        ok "Workspace listing works"
    else
        fail "Workspace listing failed (HTTP $HTTP)"
    fi
else
    fail "Could not obtain auth token"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────
gray "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
    green "  All $TOTAL checks passed ✅"
else
    red   "  $FAIL of $TOTAL checks failed ❌"
fi
gray "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $FAIL
