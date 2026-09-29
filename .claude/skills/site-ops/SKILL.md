---
name: site-ops
description: Operate conradstansbury.com's hosting - Railway service `personal-website` (project `serene-laughter`) and Cloudflare DNS for conradstansbury.com. Use for deploy status, domain/DNS/TLS checks, DNS record changes, cutover or rollback. Generic Railway operations (logs, redeploy, variables) belong to the `use-railway` skill.
---

# Site ops: Railway + Cloudflare DNS

## Topology

- **Registrar:** Namecheap. Only sets nameservers (`huxley` / `tiffany.ns.cloudflare.com`).
- **DNS:** Cloudflare, zone `conradstansbury.com` (id `d52f2ba1618bad1460a72b1806939556`, Free plan).
- **Hosting:** Railway project `serene-laughter`, service `personal-website`, region US West. It auto-deploys from `master` on `chstan/personal-website` using the `Dockerfile`.
- **Service config:** `.railway/railway.ts` (Railway IaC). Custom domains can't be declared there; they are managed with `railway domain`.
- **Custom domains:** `conradstansbury.com` → CNAME `j4277x5e.up.railway.app`; `www` → CNAME `m6n9aeus.up.railway.app`. Each needs a `_railway-verify[.www]` TXT record. Check with `railway domain list` / `railway domain status <id>`.
- **Preview URL:** https://personal-website-production-6b37.up.railway.app

## Read-only checks (safe any time)

| Command | What it tells you |
|---|---|
| `pnpm check:railway` | Railway deploy status, commit drift vs local master, preview URL 200 |
| `CUSTOM_DOMAIN=conradstansbury.com pnpm check:railway` | Adds apex DNS, HTTP 200 and TLS days-to-expiry |
| `pnpm check:dns` | Cloudflare records via API plus authoritative/public resolution of apex and www |
| `npx -p node@22 -c 'railway config plan --detailed-exit-code'` | Drift between `.railway/railway.ts` and live Railway (exit 0 = in sync). Needs Node 22.6+. |
| `railway domain list` | Custom domains, verification and cert status |

The Cloudflare token lives in `~/.config/cloudflare/token`. It is zone-scoped (`Zone:DNS:Edit`, `Zone:Zone:Read`). Never print it, never commit it, and never ask the user to paste it into chat.

## Changes (always confirm first)

- **Any Cloudflare record write, `railway config apply`, `railway domain` create/delete, or push to `master`** changes production. Show the exact diff and get an explicit OK from the user each time.
- Keep Railway-facing records **unproxied** (grey cloud). Proxying breaks Railway's cert issuance and hides the origin.
- After a DNS change, verify with `pnpm check:dns`, then `CUSTOM_DOMAIN=conradstansbury.com pnpm check:railway`.

## Rollback

- **Bad deploy:** in the Railway dashboard, open Deployments and redeploy the previous one. Or revert the commit on `master`.
- **Bad DNS:** restore the previous records. TTL is auto (300s), so recovery is roughly 5 minutes. After the Linode VM is destroyed there is no DNS rollback target other than Railway.

## References

- `docs/deploy/punchlist.md`: migration status
- `docs/deploy/migration-checklist.md`: cutover procedure
- `docs/deploy/railway.md`: IaC workflow
