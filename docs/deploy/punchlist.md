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
- [x] AI: Commit as separate infra/docs commits; `railway config apply` (plan now clean); push to `master` (`0388de9`).
- [x] AI: Railway deploy `0388de9` SUCCESS; preview URL returns 200 on `/`, `/writing`, `/resume`, `/marriage`.
- [x] AI: Playwright DOM tests (`tests/blog.spec.ts`) pass against the preview URL (`PLAYWRIGHT_BASE_URL=https://personal-website-production-6b37.up.railway.app`).
- [ ] AI: Visual tests can't be compared on Linux: only `chromium-darwin` baselines are committed, so a Linux run just writes new baselines. Either compare on macOS, or commit Linux baselines generated from a known-good build (CI on Ubuntu has the same gap).

## Phase 2 — DNS to Cloudflare (no visible change)

- [x] C: Create Cloudflare account, add `conradstansbury.com` (Free). Nameservers switched at Namecheap and the Linode zone disabled (2026-09-28). Registry delegates to `huxley`/`tiffany.ns.cloudflare.com`; imported records are unproxied at TTL 300; historical/memory absent.
- [x] C: Create an API token (Zone:DNS:Edit + Zone:Zone:Read, this zone only) and save it to `~/.config/cloudflare/token` (mode 600). Verified active (`cfut_…`).
- [x] ~~AI: `pnpm capture:linode` for a fresh baseline~~ Skipped: the NS switch already happened; the May snapshot plus `pnpm check:dns` output cover it.
- [x] AI: Clean up the imported zone: delete `A`/`AAAA mail`, `MX @`, `A staging` (not in the May snapshot, HTTP timed out); add `CAA @ 0 issue "letsencrypt.org"`. Done as part of the cutover batch below.
- [x] C: Switch nameservers at Namecheap to the two Cloudflare NS values.
- [x] AI: Confirm `dig NS` shows Cloudflare and the site still resolves to Linode.

## Phase 3 — Cutover

- [x] ~~Lower TTL on `@`/`www` to 300s; wait 24h~~ Already auto (300s) since the Cloudflare import.
- [x] AI: Add `conradstansbury.com` + `www` as custom domains in Railway (`railway domain … --port 8001`; not expressible in IaC). Targets: `@` → `j4277x5e.up.railway.app`, `www` → `m6n9aeus.up.railway.app`.
- [x] AI: Cutover DNS batch applied 2026-09-28 ~22:47 PT via a one-off script (approved by C): `_railway-verify` TXTs, CAA, `@`/`www` A+AAAA → CNAMEs (proxy off), and the Phase 2 cleanup (mail, MX, staging deleted).
- [x] AI: Railway verified both domains; Let's Encrypt certs issued (apex YE2, www YR1, expire 2026-12-28, auto-renew).
- [x] AI: `https://conradstansbury.com/{,writing,resume,marriage}` and `https://www.conradstansbury.com/` return 200 with valid TLS; `http://` 301s to `https://`. Public resolvers 1.1.1.1, 8.8.8.8, 9.9.9.9 and OpenDNS all return Railway (`69.46.46.126`). Conrad's local resolver held the old Linode answer for up to ~2h after the cutover (leftover from Linode's 86400 TTL).
- [ ] C: Browser smoke test (`/`, `/writing`, a post, `/marriage`, `/resume`).

## Phase 4 — Soak & decommission

- [ ] AI: +24h: check Railway logs/metrics, and re-run `CUSTOM_DOMAIN=conradstansbury.com pnpm check:railway` once local DNS has refreshed. TTL can stay auto (300s): Cloudflare serves it cheaply and it keeps rollback fast.
- [ ] C: **Archive the old site off the VM before destroy**: tarball `~/deploy/historical_website` (incl. `config/`, `res/`) and `~/src/{Chess-Engine,SchemeREPL,wobsite}`, then download it. A downloaded tarball beats a Linode snapshot, which bills monthly.
- [ ] C: +1 week green: destroy the Linode VM and cancel the account.

## Phase 5 — Cleanup & ops

- [x] AI: Add the `site-ops` project skill (`.claude/skills/site-ops/SKILL.md`) and the read-only `pnpm check:dns` (`scripts/cf-dns.sh`). Generic Railway ops are deferred to the official `use-railway` skill.
- [x] AI: Fix stale claims in `migration-checklist.md` (old-site source and Wayback captures exist).
- [ ] AI: Update `railway.md`, `AGENTS.md` "Active initiatives", and the RFC status once done.
- [ ] Optional: static `/historical` archive from Wayback captures (option B, 3–6h).
