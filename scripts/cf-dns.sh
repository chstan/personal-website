#!/usr/bin/env bash
#
# Read-only view of the conradstansbury.com zone on Cloudflare.
#
# Lists every DNS record (type, name, content, TTL, proxied) and then
# resolves the apex and www against Cloudflare's authoritative servers
# and a public resolver, so API state and served state can be compared.
#
# Usage:
#   scripts/cf-dns.sh
#
# Env overrides:
#   CF_TOKEN_FILE  - default ~/.config/cloudflare/token (zone-scoped API token)
#   CF_ZONE_NAME   - default conradstansbury.com
#
# Never writes to Cloudflare. Record changes are made deliberately, one at a
# time, after review (see docs/deploy/migration-checklist.md).

set -euo pipefail

CF_TOKEN_FILE="${CF_TOKEN_FILE:-$HOME/.config/cloudflare/token}"
CF_ZONE_NAME="${CF_ZONE_NAME:-conradstansbury.com}"
API="https://api.cloudflare.com/client/v4"

if [[ ! -r "$CF_TOKEN_FILE" ]]; then
  echo "error: no token at $CF_TOKEN_FILE" >&2
  exit 1
fi
TOKEN="$(tr -d '[:space:]' < "$CF_TOKEN_FILE")"

cf_get() {
  curl -fsS -H "Authorization: Bearer $TOKEN" "$API$1"
}

ZONE_ID="$(cf_get "/zones?name=$CF_ZONE_NAME" | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"][0]["id"])')"

echo "== Cloudflare records ($CF_ZONE_NAME, zone $ZONE_ID) =="
cf_get "/zones/$ZONE_ID/dns_records?per_page=100" | python3 -c '
import sys, json
for r in sorted(json.load(sys.stdin)["result"], key=lambda r: (r["name"], r["type"])):
    ttl = "auto" if r["ttl"] == 1 else r["ttl"]
    typ, name, content, proxied = r["type"], r["name"], str(r["content"])[:60], r.get("proxied")
    print(f"  {typ:<6} {name:<40} {content:<60} ttl={ttl} proxied={proxied}")
'

echo
echo "== Delegation (registry) =="
dig +norec NS "$CF_ZONE_NAME" @a.gtld-servers.net | awk '/AUTHORITY SECTION/{f=1;next} f&&NF{print "  "$NF} !NF{f=0}'

AUTH_NS="$(dig +short NS "$CF_ZONE_NAME" @1.1.1.1 | head -1)"
for host in "$CF_ZONE_NAME" "www.$CF_ZONE_NAME"; do
  echo
  echo "== $host =="
  echo "  authoritative ($AUTH_NS): $(dig +short "$host" @"$AUTH_NS" | tr '\n' ' ')"
  echo "  public (1.1.1.1):         $(dig +short "$host" @1.1.1.1 | tr '\n' ' ')"
done
