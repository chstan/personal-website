# Linode → Railway migration checklist

Companion to `docs/deploy/railway.md`. Operational checklist for the cutover, populated with concrete answers from discovery on 2026-05-01.

---

## Discovery summary

**Site / DNS state on 2026-05-01:**

| Item | Finding |
|---|---|
| Production domain | `conradstansbury.com` (apex + `www`) |
| Registrar | Namecheap |
| Authoritative DNS | **Linode DNS Manager** (`ns{1..5}.linode.com`). Namecheap just delegates to Linode. |
| Linode VM | `198.74.51.35` / `2600:3c01::f03c:91ff:fe56:6e8b` |
| TLS cert | Let's Encrypt R12, **expired 2026-03-28**. HTTPS has been broken for ~5 weeks. |
| Apex + www | Serving a stale React build (older than current `master`). |
| `historical.conradstansbury.com` | Haskell server + C++ binaries. **Already 502** — backend is dead. No Wayback snapshots. |
| `memory.conradstansbury.com` | In TLS SAN list, no DNS record, also 502 if reached via host header. |
| `mail.conradstansbury.com` | A record + MX record exist but backend is 502; Conrad confirmed no actual mail. |
| Other DNS | No TXT, SPF, DKIM, DMARC, or CAA. Zero email-deliverability records to preserve. |
| Railway project | `serene-laughter` (`ee87e6b5-…`), region `us-west2`, GitHub source connected. |
| Railway preview URL | `https://personal-website-production-6b37.up.railway.app` (currently 502 — see Open Items §1). |

A frozen snapshot of the zone is at `docs/deploy/dns-snapshot-2026-05-01.txt`.

**Implications that reshape the plan:**

1. **DNS lives on Linode**, not Namecheap. Destroying the Linode account also destroys DNS. So the migration sequence must be **(1) move DNS off Linode → (2) flip site to Railway → (3) destroy Linode**. This wasn't true in the previous draft.
2. **Recommended DNS provider: Cloudflare DNS** (free, 5-minute setup). It supports apex `CNAME` flattening, which Namecheap's BasicDNS does not. So pointing the apex at Railway is trivial there. Linode DNS technically supports A/AAAA at apex too, but it's bundled with the VM we want to kill.
3. **historical / memory backends are already gone.** No salvage required from the running box. If Conrad has the source somewhere, fine. Otherwise: write off, redirect at Railway, or 410 Gone.
4. **Cert expiry means migration is a fix**, not just a move. Railway issues and renews Let's Encrypt certs automatically. The "Let's Encrypt is unreliable" pain goes away.
5. **TTL is currently 86400 (24h)** on every record. Drop to 300 before cutover.

---

## Decisions taken (from chat 2026-05-01)

- ✅ **www in scope**, serves the same site (no apex redirect requested).
- ✅ **historical.conradstansbury.com**: deprecate, do not dockerize. (See "What to do with historical" below for redirect options.)
- ✅ **No mail server**, MX is vestigial. Drop it during the DNS move.
- ✅ **Outage acceptable.** No need for a hot-swap; we can run the new site on the Railway URL, do DNS in our own time, and accept brief propagation gaps.
- ✅ **Verify on Railway preview URL** before any DNS change.

## What to do with `historical.conradstansbury.com`

Pick one. The first is the default unless you say otherwise:

- **A. Drop it.** Don't create the subdomain on the new DNS. After cutover the name simply doesn't resolve. Anyone hitting an old link gets `NXDOMAIN`.
- **B. Redirect to apex.** Point the subdomain at Railway and add a Railway "Redirect to" pointing at `https://conradstansbury.com/`. Old links still 301 somewhere reasonable.
- **C. Dockerize and revive.** Possible but probably not worth it: the Haskell binary + C++ tooling means a custom Dockerfile, a separate Railway service, and ongoing maintenance for content the React site doesn't link to. If there's content you actually want to keep, the cheapest thing is to extract the static HTML output from your local Haskell build and serve it from the existing Railway service under `/historical/*`.

`memory.conradstansbury.com` and `mail.conradstansbury.com` get the same treatment as historical — i.e. dropped — unless you say otherwise.

---

## Open items (need your input)

1. **Railway preview is 502.** Container logs show `Accepting connections at http://localhost:8001` but the edge can't reach it. The deployed code is commit `060e8549` (pre-Dockerfile-`$PORT` work on this branch). I tentatively set `PORT=8001` and triggered a redeploy; the edge still 502s. The most likely fix is one of:
   - Push the worktree branch's Dockerfile changes to `master` so the new commit redeploys.
   - Set the service's HTTP target port to 8001 explicitly via the dashboard (Settings → Networking → Public Networking → target port).
   Confirm which path you want; I should not keep poking at the live Railway service without explicit go-ahead.
2. **DNS provider for the new home.** Default recommendation: Cloudflare DNS (free, fast, supports apex CNAME flattening). Alternative: stay on Linode DNS for now and only move the website (DNS migration as a separate later step) — slower path but valid if you'd rather not touch DNS plumbing.
3. **`historical` decision** — A / B / C above.
4. **Old C++ binaries** that historical exposed — anything you want pulled off the box before it dies? Without SSH I can't pull them. If yes, you'll need to copy them locally yourself or grant me a key.

---

## Step 1 — Push the cleanup branch (no production impact)

These commits are sitting on `worktree-make_it_compile` and need to land on `master` for Railway's auto-deploy to pick them up.

- [ ] `git push origin worktree-make_it_compile`
- [ ] Open a PR. CI runs `lint + type-check + vitest + build + Playwright + verify-docker`. Merge once green.
- [ ] Railway auto-deploys the new commit. Verify the preview URL returns 200.

## Step 2 — Move DNS to Cloudflare (no production impact yet)

This is the safest decoupling step: it changes who answers DNS but keeps every record value pointing at the Linode VM. No user-visible change.

- [ ] Create a free Cloudflare account.
- [ ] Add `conradstansbury.com` as a site. Cloudflare scans existing records; review the import.
- [ ] **Critical**: turn the orange-cloud proxy **off** for the apex / www records during migration. We want Cloudflare doing DNS only, not proxying through their edge yet. (You can turn the proxy back on later if you want CDN benefits.)
- [ ] Verify the Cloudflare-imported zone matches `docs/deploy/dns-snapshot-2026-05-01.txt`. Drop the `mail.*` A/AAAA and the apex `MX` record now (no mail anyway). Drop `historical.*` and `memory.*` per the decision above.
- [ ] Add a `CAA` record allowing `letsencrypt.org` (so Railway can issue certs without retries):
  ```
  conradstansbury.com.  CAA  0 issue "letsencrypt.org"
  ```
- [ ] In **Namecheap**, change the nameservers from Linode's (`ns{1..5}.linode.com`) to Cloudflare's (Cloudflare gives you two assigned NS values like `kara.ns.cloudflare.com` and `nick.ns.cloudflare.com` when you add the site).
- [ ] Wait for nameserver propagation. Cloudflare emails when the change takes effect (usually under an hour, can take up to 48h for full propagation).
- [ ] Verify:
  ```bash
  dig +short NS conradstansbury.com
  # Expected: the Cloudflare nameservers, not Linode
  dig +short conradstansbury.com
  # Expected: still 198.74.51.35 (no site change yet)
  ```

After this step the site still serves from the Linode VM via Cloudflare DNS — no user-visible change, but we've decoupled DNS from the doomed VM.

## Step 3 — T-24h: drop TTL on records about to change

- [ ] In Cloudflare, set TTL to **300s** on `conradstansbury.com` (apex `A`/`AAAA`) and `www.conradstansbury.com`. Leave everything else alone.
- [ ] 30 minutes later: `dig +noall +answer @1.1.1.1 conradstansbury.com | awk '{print $2}'` — expect `300`.

## Step 4 — Cutover (estimated 15–30 min wall time)

1. [ ] In **Railway** (project `serene-laughter`, service `personal-website`):
   - Settings → Domains → "Custom Domain" → enter `conradstansbury.com`. Railway will display either a CNAME target or an A/AAAA record. Note which it gave you.
   - Repeat for `www.conradstansbury.com`.
2. [ ] In **Cloudflare DNS** for `conradstansbury.com`:
   - **Apex (`@`)**: replace the `A` (`198.74.51.35`) and `AAAA` records with whatever Railway gave you. For an apex CNAME, Cloudflare flattens it automatically — just create a `CNAME @ <service>.up.railway.app` and Cloudflare publishes A records to resolvers transparently. Proxy: **off** until Railway has issued the cert.
   - **`www`**: same — `CNAME www <service>.up.railway.app`, proxy off.
3. [ ] Verify resolution from clean caches (a few minutes after the change):
   ```bash
   dig @1.1.1.1 +short conradstansbury.com
   dig @8.8.8.8 +short conradstansbury.com
   dig @1.1.1.1 +short www.conradstansbury.com
   ```
4. [ ] Railway issues the Let's Encrypt cert automatically once it sees DNS pointing at it (1–5 min). Verify:
   ```bash
   curl -I https://conradstansbury.com/
   # Expected: HTTP/2 200, served by Railway (not nginx)
   curl -I https://www.conradstansbury.com/
   ```
5. [ ] Smoke-test in a browser: `/`, `/writing`, one blog post, `/marriage`, `/resume`.
6. [ ] Run the Playwright suite against production:
   ```bash
   PLAYWRIGHT_BASE_URL=https://conradstansbury.com pnpm exec playwright test
   ```
   Visual snapshots have a small `maxDiffPixelRatio` tolerance; sub-pixel font drift won't fail. Note: snapshots were captured against the *new* Vite build, so they should match Railway, not the stale Linode build.
7. [ ] (Optional) After 24h of green, turn on Cloudflare's orange-cloud proxy for apex / www if you want the CDN. Test again — proxying changes the request path slightly.

If any of steps 3–6 fail beyond a quick fix → **Rollback** (Step 6).

## Step 5 — Soak (T+24h, T+72h, T+1 week)

- [ ] **+24h**: review Railway request logs and metrics for anomalies.
- [ ] **+24h**: restore TTL on apex / www to 3600s in Cloudflare.
- [ ] **+72h**: in Railway, confirm cert renewal is scheduled (Let's Encrypt renews ~30 days before expiry, automatic).
- [ ] **+1 week**: assuming all green, destroy the Linode VM. **Once destroyed, the Haskell server / C++ binaries / nginx config are gone permanently.** If you want any of it for a backup, snapshot the VM in the Linode dashboard *before* destroying.

## Step 6 — Rollback

If we discover a problem during Step 4 cutover and need to revert:

1. In Cloudflare DNS: restore `A 198.74.51.35` and `AAAA 2600:3c01::f03c:91ff:fe56:6e8b` on `@` and `www`. (Worth keeping these noted in a scratch doc before Step 4.2 so the restore is copy-paste.)
2. Wait ~5 min for the lowered TTL to expire from resolvers.
3. Verify `dig @1.1.1.1 +short conradstansbury.com` returns the Linode IP again.
4. **Note**: HTTPS will go back to its broken-cert state. Browsers will warn. This is the existing behavior of the last 5 weeks, not a new problem.

If the discovery is later (>24h post-cutover), Railway's per-deploy rollback in the Deployments tab is faster than DNS rollback.

---

## Tooling

Two scripts back this checklist; both are read-only and safe to run any time:

- `pnpm check:railway` — asserts the Railway project/service/deployment is healthy. With `CUSTOM_DOMAIN=conradstansbury.com` it also checks the apex DNS, HTTP 200, and TLS days-to-expiry. Use this before and after each major step (cutover gate, post-soak verification).
- `pnpm capture:linode` — writes a DNS + HTTP + TLS snapshot of the current live site to `docs/deploy/dns-snapshot-<YYYY-MM-DD>.txt`. Run it before Step 2 (DNS provider move) so we have a frozen baseline to diff against during cutover and rollback.

## What I can do without further input from you

- ✅ Inspect Railway state (`pnpm check:railway`) and report.
- ✅ Snapshot the current live site (`pnpm capture:linode`) on demand.
- ✅ Generate the exact `dig` and `curl` commands for any verification.
- ✅ Pre-cutover Playwright runs against the Railway preview URL once it returns 200.
- ✅ Diff a fresh `dns-snapshot-…` against the saved baseline and flag drift.
- ✅ Land the worktree branch on `master` once you say go (push + open PR).

## What I can't do without you

- ❌ Add custom domains in Railway (UI step + may require billing-tier confirmation).
- ❌ Create the Cloudflare account or change nameservers at Namecheap.
- ❌ Edit DNS records (need Cloudflare access — can be done via API token if you'd rather delegate).
- ❌ SSH the Linode box (you said no SSH; that's fine, the box is a write-off).
- ❌ Cancel the Linode subscription.
