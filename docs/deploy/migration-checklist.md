# Linode → Railway migration checklist

Companion to `docs/deploy/railway.md`. This file is the **operational checklist** for the actual cutover, plus the discovery I need from Conrad before I can drive most of it. Fill in the inline `<TODO>` blocks and check off the steps as we go.

---

## Part 1 — Information I need from you

These are blockers. Without them I can't generate the right `railway.toml` overrides, write a safe DNS plan, or know what's safe to tear down on the Linode box.

### 1.1 Identity & accounts

- [ ] **Production domain(s).** What hostnames must answer after cutover?
  - Apex: `<TODO: e.g. conradstansbury.com>`
  - `www` subdomain in scope? `<TODO: yes/no>`
  - Any other subdomains served from the same Linode (e.g. `historical.conradstansbury.com`, `notes.…`, `pdf.…`)? List them.
- [ ] **Domain registrar.** Where is the domain registered? `<TODO: Namecheap / Google Domains / Cloudflare Registrar / …>`
- [ ] **Authoritative DNS provider** (often the same as the registrar but not always). `<TODO: Cloudflare DNS / Route 53 / Linode DNS Manager / Namecheap BasicDNS / …>`
  - This matters because **apex CNAMEs are not standard DNS**; Railway's preferred path is a CNAME, which only works at the apex if the provider supports CNAME flattening / ALIAS / ANAME. Cloudflare, Route 53, DNSimple, and Hetzner do; Namecheap BasicDNS and GoDaddy don't.
- [ ] **Railway account.** Account email + whether you want this in the existing project (the one for your other service) or a fresh project. `<TODO>`
- [ ] **Railway region preference.** Default is `us-west2`; pick whatever's closest to the bulk of your traffic. `<TODO>`

### 1.2 Linode current state

- [ ] **IPv4 / IPv6** of the Linode VM. `<TODO>`
- [ ] **SSH access**: do I have credentials, or do you want to run the inspection commands yourself? `<TODO>`
- [ ] **What else runs on this box besides the website?** The two big risk categories:
  - Mail (Postfix, Dovecot, anything listening on 25/465/587/993).
  - Anything serving other domains (reverse proxy for a side project, a VPN, monitoring, jump host, etc.).
  - `<TODO: list services or "nothing else">`
- [ ] **TLS certificates.** Let's Encrypt via certbot? Cloudflare Origin Certs? Something else? Railway issues its own certs once the domain is verified, so the Linode certbot can be retired — but only if nothing else on the box needs it.
- [ ] **Web server config.** Path to the nginx/apache config currently serving the site. I want to check for redirects / rewrites that exist outside the React app:
  - Hard redirects (e.g. `historical.conradstansbury.com` → archive)?
  - HTTP-to-HTTPS upgrades?
  - Custom error pages?
  - Any path-based rewrites that the SPA fallback in `public/serve.json` might not cover?
- [ ] **Static assets not in the repo.** Anything in `/var/www/...` that the site links to but that isn't checked in? PDFs, large media, generated bundles?
- [ ] **Cron jobs** (`crontab -l` for relevant users) and **systemd timers** (`systemctl list-timers`).

### 1.3 DNS zone snapshot

Before touching anything, I want a **complete** export of the current zone so we can diff before/after. Either:

- Export from the DNS provider's UI (BIND zone file or CSV), commit it under `docs/deploy/dns-snapshot-<date>.txt` (it's not secret), **or**
- Run `dig +noall +answer @<authoritative-ns> <domain> ANY` and `dig +noall +answer @<authoritative-ns> <domain> AAAA / MX / TXT / NS / CAA` and paste the output.

Records that **must not change** during the migration:

- `MX`, `SPF (TXT)`, `DKIM (TXT)`, `DMARC (TXT)` — touching these breaks email.
- `NS` — only change if you're moving DNS providers, which we're not.
- `CAA` — must allow Railway's certificate issuer (Let's Encrypt, `letsencrypt.org`).

`<TODO: paste zone export or attach the file path>`

### 1.4 Decisions I need

- [ ] **Cutover window.** Day + hour. I'd suggest a low-traffic window with at least 2 hours of buffer.
- [ ] **Acceptable downtime.** Target is zero (DNS-only flip; the old VM stays up); the realistic worst case is a few minutes for resolvers with stale caches. OK?
- [ ] **www handling.** If `www.<domain>` is in scope, do you want it to (a) serve the same site, or (b) 301 to the apex? (b) is the modern default.
- [ ] **Analytics.** Stay deleted (current state)? Add Plausible or GA4 later? `<TODO>`
- [ ] **Uptime monitoring.** Want me to wire UptimeRobot / BetterStack against the Railway URL? `<TODO>`
- [ ] **Linode shutdown.** Confirm I can recommend destroying the VM after the 72-hour soak. (If the box also runs mail or other services, the answer is "no, just stop nginx".)

---

## Part 2 — Pre-flight (T minus 1 week)

These are independent of the cutover and can happen any time before. I can do everything that doesn't require a credential.

- [ ] Railway project exists with the GitHub repo connected and a successful build from `master`. (Needs your Railway login.)
- [ ] Railway-provided URL (`https://<service>.up.railway.app`) returns 200 on `/`.
- [ ] Run the full Playwright suite against the Railway URL:
  ```bash
  PLAYWRIGHT_BASE_URL=https://<service>.up.railway.app pnpm exec playwright test
  ```
  This is already plumbed through `playwright.config.ts`. Snapshots are pixel-tolerant, so small font-rendering differences against the Linode baseline won't fail.
- [ ] Capture and commit the DNS zone snapshot (Part 1.3).
- [ ] Inspect the Linode box and write down what's there (Part 1.2). I'll generate a "what gets retired vs what stays" table from your answers.
- [ ] Decide on a cutover window.

## Part 3 — T minus 24 hours

- [ ] Lower the TTL on the records that will change. **Only the records that will change** — leave email and unrelated records alone.
  - Apex `A`/`AAAA`: drop to **300 seconds**.
  - `www` `CNAME` (or `A`): drop to **300 seconds**.
  - This bounds the propagation window during cutover.
- [ ] Confirm the lowered TTL has propagated:
  ```bash
  dig +noall +answer <domain> | awk '{print $2, $4}'
  # Expected: 300 A/AAAA
  ```
- [ ] Final Playwright run against the Railway preview URL (same command as pre-flight).
- [ ] Last `git push` of any pending content. Anything merged after this point ships in the next deploy cycle, not this one.
- [ ] Confirm Conrad is reachable during the cutover window (rollback decisions need a human).

## Part 4 — Cutover (T = 0)

Estimated wall time: 15–30 minutes including verification.

1. [ ] **In Railway**, add the apex domain to the service. Railway will display either a CNAME target (e.g. `<service>.up.railway.app`) or an A record (e.g. `66.33.x.x`). Note which.
2. [ ] **In your DNS provider**:
   - **Apex**: replace the existing `A`/`AAAA` records that point at the Linode IP with whatever Railway gave you. If Railway gave a CNAME and your DNS provider supports CNAME flattening / ALIAS / ANAME at the apex, use that. Otherwise use the A record.
   - **www** (if in scope and option (a) above): `CNAME www → <service>.up.railway.app`.
   - **www** (if option (b), 301 to apex): handled at Railway's edge — add `www.<domain>` as an additional domain on the same Railway service and configure the redirect there. (Railway has a per-service "Redirect to" toggle.)
   - **Do not touch** `MX`, `TXT`, `NS`, `CAA`, or any record that doesn't point at the Linode IP.
3. [ ] Verify DNS has flipped from a clean cache:
   ```bash
   # 1.1.1.1 and 8.8.8.8 are independent resolvers
   dig @1.1.1.1 +short <domain>
   dig @8.8.8.8 +short <domain>
   dig @1.1.1.1 +short www.<domain>
   ```
4. [ ] Verify TLS issued correctly. Railway provisions Let's Encrypt automatically; this can take 1–5 minutes after DNS resolves.
   ```bash
   curl -I https://<domain>/
   # Expected: HTTP/2 200
   ```
5. [ ] Smoke-test in a browser: home, /writing, one blog post, /resume, the Marriage page (the JS-heavy one).
6. [ ] **Run the production-targeted Playwright suite**:
   ```bash
   PLAYWRIGHT_BASE_URL=https://<domain> pnpm exec playwright test
   ```
7. [ ] Verify `MX` / `TXT` are unchanged:
   ```bash
   dig +short MX <domain>
   dig +short TXT <domain>
   # These should be byte-identical to the pre-flight snapshot.
   ```

If any of steps 3–7 fail beyond a quick fix, **roll back immediately** (Part 6) — the Linode VM is still running.

## Part 5 — T plus 24h / 72h

- [ ] **+24h**: check Railway request metrics, error logs, and any uptime monitor for anomalies.
- [ ] **+24h**: restore TTL on the apex / www records to a normal value (e.g. 3600s).
- [ ] **+72h**: assuming everything is green:
  - Snapshot the Linode VM (in case we want anything off it later).
  - Stop services on the box: `sudo systemctl stop nginx` (and anything else web-facing).
  - **Hold off on destroying the VM** until Conrad explicitly confirms. Once destroyed, the snapshot is the only path back.
- [ ] **+1 week**: if still green, destroy the VM and cancel the Linode subscription.

## Part 6 — Rollback

If we discover a problem in steps 3–7 of cutover:

1. In your DNS provider, restore the previous `A`/`AAAA` records pointing at the Linode IP. (Worth keeping these noted in a scratchpad before step 2 of cutover so the restore is copy-paste.)
2. Wait for propagation (~5 minutes given the lowered TTL).
3. Verify with `dig @1.1.1.1 +short <domain>`.
4. File the failure mode under "what to fix in the Railway config before retrying".

If the discovery is later (24h+), Railway also supports per-deploy rollback within the service's Deployments tab — but DNS rollback is the real safety net.

---

## Part 7 — What I can do without you

Once you fill in Part 1, here's what I can drive end-to-end:

- ✅ Generate any required Railway config (env vars, build args, additional services).
- ✅ Pre-cutover Playwright runs against the Railway preview URL — if you give me the URL.
- ✅ Write the exact `dig` / `curl` verification commands for your specific domain.
- ✅ Diff the DNS zone before/after and flag any unexpected drift.
- ✅ Inspect the Linode box (with SSH access) and produce the "what's safe to retire" table.
- ✅ Wire up uptime monitoring / analytics post-cutover, given the credentials.

What I **can't** do without you in the loop:

- ❌ Log into Railway, create the project, attach domains.
- ❌ Edit DNS records at your registrar / DNS provider.
- ❌ SSH into the Linode VM (unless you provision a key for me).
- ❌ Cancel the Linode subscription.
