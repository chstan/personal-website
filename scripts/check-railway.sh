#!/usr/bin/env bash
#
# Migration-readiness check for the Railway deployment of personal-website.
#
# Asserts:
#   - Railway CLI present and authenticated.
#   - Project + service exist and match the IDs we expect.
#   - Latest deployment status is SUCCESS.
#   - Latest deployed commit hash is on the local master branch (i.e. the
#     code Railway is running is something we can reproduce locally).
#   - Service domain returns HTTP 200.
#   - (If $CUSTOM_DOMAIN is set) custom domain resolves, returns 200, and
#     the TLS cert is valid for at least 14 more days.
#
# Usage:
#   scripts/check-railway.sh
#   CUSTOM_DOMAIN=conradstansbury.com scripts/check-railway.sh
#
# Env overrides:
#   RAILWAY_PROJECT_ID  - default ee87e6b5-6f09-4c55-85f7-e6b91899ca75
#   RAILWAY_SERVICE     - default personal-website
#   CUSTOM_DOMAIN       - optional, e.g. conradstansbury.com
#
# Exit code is the count of failed checks (0 = ready).

set -uo pipefail

PROJECT_ID="${RAILWAY_PROJECT_ID:-ee87e6b5-6f09-4c55-85f7-e6b91899ca75}"
SERVICE_NAME="${RAILWAY_SERVICE:-personal-website}"
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-}"

PASS=0
FAIL=0

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
bad()  { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }
info() { printf "  \033[34mi\033[0m %s\n" "$1"; }

section() { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }

# 1. CLI + auth
section "Railway CLI"
if ! command -v railway >/dev/null 2>&1; then
  bad "railway CLI not installed (brew install railway)"
  exit $FAIL
fi
ok "railway $(railway --version | awk '{print $2}') installed"

if ! railway whoami --json >/dev/null 2>&1; then
  bad "not authenticated (run: railway login)"
  exit $FAIL
fi
WHOAMI=$(railway whoami --json)
ok "authenticated as $(echo "$WHOAMI" | jq -r .email)"

# 2. Project + service. railway list --json elides serviceName / domains, so
# we use `railway status --json` which returns the full graph for the linked
# project. If the linked project doesn't match, fail with a clear hint.
section "Project context"
STATUS_JSON=$(railway status --json 2>/dev/null || true)
if [[ -z "$STATUS_JSON" ]]; then
  bad "no project linked in this directory (run: railway link --project $PROJECT_ID)"
  exit $FAIL
fi

LINKED_ID=$(echo "$STATUS_JSON" | jq -r '.id // empty')
if [[ "$LINKED_ID" != "$PROJECT_ID" ]]; then
  bad "linked project is $LINKED_ID; expected $PROJECT_ID"
  bad "fix: railway link --project $PROJECT_ID"
  exit $FAIL
fi
PROJECT_NAME=$(echo "$STATUS_JSON" | jq -r .name)
ok "project '$PROJECT_NAME' ($PROJECT_ID) linked"

ENV_NODE=$(echo "$STATUS_JSON" | jq -c '.environments.edges[] | select(.node.name == "production") | .node')
if [[ -z "$ENV_NODE" ]]; then
  bad "no 'production' environment in project"
  exit $FAIL
fi
ok "environment 'production' found"

SERVICE_INSTANCE=$(echo "$ENV_NODE" \
  | jq -c --arg svc "$SERVICE_NAME" \
    '.serviceInstances.edges[] | select(.node.serviceName == $svc) | .node')
if [[ -z "$SERVICE_INSTANCE" ]]; then
  bad "service '$SERVICE_NAME' not found in production"
  exit $FAIL
fi
ok "service '$SERVICE_NAME' found"

# 3. Latest deployment
section "Latest deployment"
LATEST=$(echo "$SERVICE_INSTANCE" | jq -c '.latestDeployment // empty')
if [[ -z "$LATEST" ]]; then
  bad "no latestDeployment on the service"
else
  STATUS=$(echo "$LATEST" | jq -r '.status // "UNKNOWN"')
  COMMIT=$(echo "$LATEST" | jq -r '.meta.commitHash // "unknown"' | cut -c1-8)
  case "$STATUS" in
    SUCCESS) ok "deployment status SUCCESS (commit $COMMIT)";;
    *)       bad "deployment status $STATUS (commit $COMMIT)";;
  esac

  # Check the deployed commit is reachable from local master.
  if [[ "$COMMIT" != "unknown" ]]; then
    if git merge-base --is-ancestor "$COMMIT" master 2>/dev/null; then
      ok "deployed commit $COMMIT is on local master"
    else
      bad "deployed commit $COMMIT is NOT on local master (drift)"
    fi
  fi
fi

# 4. Service domain
section "Service domain"
SD=$(echo "$SERVICE_INSTANCE" | jq -c '.domains.serviceDomains[0] // empty')
if [[ -z "$SD" ]]; then
  bad "no Railway service domain configured (run: railway domain)"
else
  SERVICE_DOMAIN=$(echo "$SD" | jq -r '.domain')
  TARGET_PORT=$(echo "$SD" | jq -r '.targetPort // "auto"')
  info "service domain: https://$SERVICE_DOMAIN (target port: $TARGET_PORT)"
  if [[ "$TARGET_PORT" == "auto" ]]; then
    info "  (Railway is auto-detecting; if the service 502s, set targetPort explicitly via the dashboard)"
  fi
  HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" -m 10 "https://$SERVICE_DOMAIN/" || echo "000")
  case "$HTTP_CODE" in
    200) ok "GET / returned 200";;
    *)   bad "GET / returned $HTTP_CODE";;
  esac
fi

# 5. Custom domain (optional)
if [[ -n "$CUSTOM_DOMAIN" ]]; then
  section "Custom domain ($CUSTOM_DOMAIN)"

  CUSTOMS=$(echo "$SERVICE_INSTANCE" | jq -r '.domains.customDomains[].domain' | tr '\n' ' ')
  if echo "$CUSTOMS" | grep -qw "$CUSTOM_DOMAIN"; then
    ok "$CUSTOM_DOMAIN attached to the Railway service"
  else
    bad "$CUSTOM_DOMAIN is NOT attached on Railway (current: ${CUSTOMS:-none})"
  fi

  RESOLVED=$(dig +short @1.1.1.1 "$CUSTOM_DOMAIN" | head -1)
  if [[ -z "$RESOLVED" ]]; then
    bad "$CUSTOM_DOMAIN does not resolve via 1.1.1.1"
  else
    ok "$CUSTOM_DOMAIN resolves to $RESOLVED"
  fi

  HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" -m 10 "https://$CUSTOM_DOMAIN/" || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    ok "https://$CUSTOM_DOMAIN/ returned 200"
  else
    bad "https://$CUSTOM_DOMAIN/ returned $HTTP_CODE"
  fi

  EXPIRY=$(echo | openssl s_client -servername "$CUSTOM_DOMAIN" -connect "$CUSTOM_DOMAIN:443" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | sed 's/notAfter=//')
  if [[ -z "$EXPIRY" ]]; then
    bad "could not read TLS cert"
  else
    EXPIRY_TS=$(date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null \
      || date -d "$EXPIRY" +%s 2>/dev/null \
      || echo 0)
    NOW_TS=$(date +%s)
    DAYS=$(( (EXPIRY_TS - NOW_TS) / 86400 ))
    if [[ $DAYS -ge 14 ]]; then
      ok "TLS cert valid for $DAYS more days (until $EXPIRY)"
    else
      bad "TLS cert expires in $DAYS days ($EXPIRY) — too soon"
    fi
  fi
fi

# Summary
section "Summary"
echo "  $PASS passed, $FAIL failed"
exit $FAIL
