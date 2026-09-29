# Linode → Railway punchlist

Running TODO list for the migration. Detailed procedures live in
`migration-checklist.md`; this file is just status. Owner: **C** = Conrad,
**AI** = Claude (asks before any change to live Railway / DNS).

Last updated: 2026-09-28

## Decisions (settled)

- DNS moves to **Cloudflare** (free), managed by Claude via a zone-scoped API token.
- `www` + apex both serve the site.
- `historical.*`, `memory.*`, `mail.*`, MX: dropped (stop resolving).
- Old Haskell site: archive only (option A below). Missing static assets are acceptable.

## Phase 0 — Tooling

- [x] AI: Install Railway CLI; C: `railway login`; link worktree to `serene-laughter`.
- [x] C: Install Docker.
- [x] AI: `railway setup agent`: official `use-railway` skill + Railway MCP installed (restart Claude Code to load).

## Phase 1 — Railway serving the site (no prod impact)

- [x] AI: Build + run the image locally with a non-default `PORT`; confirm 200.
- [x] AI: Diagnose May 2026 deploy failure. Root cause: `corepack prepare pnpm@latest` now pulls pnpm 12, which ignores `pnpm.overrides` in package.json, so `--frozen-lockfile` fails. Fixed by pinning `pnpm@10` (matches CI).
- [x] AI: Migrate `railway.toml` → `.railway/railway.ts` (old format stops working **2026-12-01**). The generated file omitted source/PORT (applying it would have disconnected GitHub); completed by hand and dropped `startCommand`. `railway config plan` is clean (0 destroy). Note: `migrate --apply` already cleared the live service's Config File setting, so healthcheck/restart policy are unset until `config apply`.
- [x] AI: Record dashboard-only settings (region, domain) in `railway.md`.
- [ ] AI: Commit on `worktree-dns` as separate infra commits (Dockerfile pin; IaC migration + `railway` devDep; docs/punchlist).
- [ ] C: OK `railway config apply` + deploy (merge/push to `master`).
- [ ] AI: Preview URL returns 200; Playwright passes with `PLAYWRIGHT_BASE_URL=https://personal-website-production-6b37.up.railway.app`.

## Phase 2 — DNS to Cloudflare (no visible change)

- [ ] C: Create Cloudflare account, add `conradstansbury.com` on the Free plan. **Don't change nameservers yet.**
- [ ] C: Create an API token (Zone:DNS:Edit + Zone:Zone:Read, this zone only) and save it to `~/.config/cloudflare/token` (mode 600).
- [ ] AI: `pnpm capture:linode` for a fresh baseline snapshot.
- [ ] AI: Clean up the imported zone: keep `@`/`www` → Linode IPs (proxy **off**), delete mail/MX/historical/memory, add `CAA 0 issue "letsencrypt.org"`. Show the diff to C first.
- [ ] C: Switch nameservers at Namecheap to the two Cloudflare NS values.
- [ ] AI: Confirm `dig NS` shows Cloudflare and the site still resolves to Linode.

## Phase 3 — Cutover

- [ ] AI: Lower TTL on `@`/`www` to 300s; wait 24h.
- [ ] AI/C: Add `conradstansbury.com` + `www` as custom domains in Railway (plus any `_railway-verify` TXT record).
- [ ] AI: Point `@`/`www` at the Railway targets (proxy off). Show the diff first.
- [ ] AI: `CUSTOM_DOMAIN=conradstansbury.com pnpm check:railway` is green (DNS, 200, TLS); Playwright passes against prod.
- [ ] C: Browser smoke test (`/`, `/writing`, a post, `/marriage`, `/resume`).

## Phase 4 — Soak & decommission

- [ ] AI: +24h: check Railway logs/metrics; restore TTL to 3600.
- [ ] C: **Archive the old site off the VM before destroy**: tarball `~/deploy/historical_website` (incl. `config/`, `res/`) and `~/src/{Chess-Engine,SchemeREPL,wobsite}`, then download it. A downloaded tarball beats a Linode snapshot, which bills monthly.
- [ ] C: +1 week green: destroy the Linode VM and cancel the account.

## Phase 5 — Cleanup & ops

- [ ] AI: Add a small project skill (`.claude/skills/`) for the site-specific parts: Cloudflare DNS ops, `pnpm check:railway`, cutover/rollback runbook. Defer generic Railway ops to the official skill.
- [ ] AI: Fix stale claims in `migration-checklist.md`. The old-site source *does* exist (`chstan/wobsite`, deployed via `chstan/dispossessed`), and Wayback *does* have captures (2015 main site, 2024–25 `historical.*` landing page).
- [ ] AI: Update `railway.md`, `AGENTS.md` "Active initiatives", and the RFC status once done.
- [ ] Optional: static `/historical` archive from Wayback captures (option B, 3–6h).
