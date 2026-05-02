#!/usr/bin/env bash
#
# Capture the live DNS + HTTP + TLS state of conradstansbury.com (or any
# domain passed as $1) into a timestamped report. Pure read-only against
# public DNS and HTTP — no SSH, no credentials.
#
# Usage:
#   scripts/capture-linode-state.sh                       # uses default domain
#   scripts/capture-linode-state.sh example.com           # custom domain
#   scripts/capture-linode-state.sh example.com a.ns.com  # custom authoritative NS
#
# Output:
#   docs/deploy/dns-snapshot-<YYYY-MM-DD>.txt
#   (overwrites if it already exists for the same day)

set -euo pipefail

DOMAIN="${1:-conradstansbury.com}"
NS="${2:-}"
SUBDOMAINS=(www historical memory mail blog notes)

if [[ -z "$NS" ]]; then
  NS=$(dig +short NS "$DOMAIN" | head -1 | sed 's/\.$//')
  if [[ -z "$NS" ]]; then
    echo "❌ Could not resolve NS records for $DOMAIN" >&2
    exit 1
  fi
fi

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
OUT_DIR="$REPO_ROOT/docs/deploy"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/dns-snapshot-$(date +%Y-%m-%d).txt"

dig_quiet() { dig +noall +answer "$@" 2>/dev/null | sort -u; }

{
  echo "# DNS / HTTP / TLS snapshot for $DOMAIN"
  echo "# Captured $(date -u +%Y-%m-%dT%H:%M:%SZ) by scripts/capture-linode-state.sh"
  echo "# Authoritative nameserver queried: $NS"
  echo

  echo "## Apex records"
  for rr in SOA NS A AAAA MX TXT CAA; do
    out=$(dig_quiet "@$NS" "$DOMAIN" "$rr")
    if [[ -n "$out" ]]; then
      echo "### $rr"
      echo "$out"
      echo
    fi
  done

  echo "## Subdomain probes"
  for sub in "${SUBDOMAINS[@]}"; do
    fqdn="$sub.$DOMAIN"
    a=$(dig_quiet "@$NS" "$fqdn" A)
    aaaa=$(dig_quiet "@$NS" "$fqdn" AAAA)
    cname=$(dig_quiet "@$NS" "$fqdn" CNAME)
    if [[ -n "$a$aaaa$cname" ]]; then
      echo "### $fqdn"
      [[ -n "$a" ]]     && echo "$a"
      [[ -n "$aaaa" ]]  && echo "$aaaa"
      [[ -n "$cname" ]] && echo "$cname"
      echo
    fi
  done

  echo "## HTTP probes (HEAD / via -k for cert-tolerance)"
  for host in "$DOMAIN" "${SUBDOMAINS[@]/%/.$DOMAIN}"; do
    code=$(curl -sk -o /dev/null -w "%{http_code} %{redirect_url}" -m 5 "https://$host/" || echo "TIMEOUT")
    echo "https://$host/  →  $code"
  done
  echo

  echo "## TLS certificate (apex)"
  raw_cert=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null || true)
  if [[ -z "$raw_cert" ]]; then
    echo "(connection failed)"
  else
    echo "$raw_cert" | openssl x509 -noout -dates -issuer 2>/dev/null || true
    san=$(echo "$raw_cert" | openssl x509 -noout -text 2>/dev/null \
      | awk '/Subject Alternative Name/{getline; print}' | sed 's/^ *//')
    [[ -n "$san" ]] && echo "subjectAltName: $san"

    # Days until expiry
    end=$(echo "$raw_cert" | openssl x509 -noout -enddate 2>/dev/null | sed 's/notAfter=//')
    if [[ -n "$end" ]]; then
      end_ts=$(date -j -f "%b %d %T %Y %Z" "$end" +%s 2>/dev/null \
        || date -d "$end" +%s 2>/dev/null \
        || echo 0)
      now_ts=$(date +%s)
      days=$(( (end_ts - now_ts) / 86400 ))
      echo "days until expiry: $days"
    fi
  fi
} > "$OUT"

echo "✅ Wrote $OUT"
echo
cat "$OUT"
