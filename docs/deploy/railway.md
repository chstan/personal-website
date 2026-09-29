# Deploying to Railway

This site is built to deploy on Railway out of the box via the
existing `Dockerfile`. Service configuration (GitHub source, builder,
healthcheck, restart policy, `PORT`) is declared as Railway
Infrastructure as Code in `.railway/railway.ts`, which replaced the
deprecated `railway.toml` (Config as Code stops working 2026-12-01).

## Managing the config

`.railway/railway.ts` is applied explicitly from a machine logged in
with `railway login` and linked via `railway link --project serene-laughter`:

```bash
railway config plan    # preview the diff against the live project
railway config apply   # apply it
```

Both need Node 22.6+ (the CLI runs the file with
`--experimental-strip-types`) and the `railway` devDependency
installed. On an older Node: `npx -p node@22 -c 'railway config plan'`.
Always read the plan before applying; fields omitted from the file are
reset (e.g. dropping `source` would disconnect the GitHub repo).

## One-time setup

1. Create a new Railway project (or open the existing one).
2. Connect it to the GitHub repo `chstan/personal-website`.
3. Settings not (yet) in `.railway/railway.ts`:
   - **Region**: US West.
   - **Networking → Generate domain**: gives you a `*.up.railway.app`
     subdomain (currently `personal-website-production-6b37`). Use
     this for verification before flipping the apex.
4. `PORT=8001` is set in `.railway/railway.ts` so the public domain's
   target port is stable; the Dockerfile honors whatever `PORT` is.

## Verifying a deploy

After the first push to `master` triggers a deploy:

```bash
# Hits the Railway-provided URL
PLAYWRIGHT_BASE_URL=https://<service>.up.railway.app pnpm exec playwright test
```

`playwright.config.ts` skips spawning its own `pnpm serve` when
`PLAYWRIGHT_BASE_URL` is set, so the visual suite runs against the
deployed instance.

## DNS cutover (Linode → Railway)

> See `docs/deploy/migration-checklist.md` for the full operational
> checklist — this section is a high-level summary.


1. **24h before**: drop the TTL on the Linode A/AAAA records to 300s
   (Cloudflare DNS, or wherever the apex is managed). This bounds the
   propagation window during the flip.
2. **Day of**:
   - Confirm the Railway deploy is green and the visual suite passes
     against `*.up.railway.app`.
   - In Railway, add the apex domain (`conradstansbury.com`) to the
     service. Railway will provide CNAME / ALIAS targets.
   - Update DNS to point at the Railway target. Keep the Linode VM
     running.
   - Verify HTTPS issues correctly (Railway handles cert provisioning).
3. **+24h**: monitor Railway request metrics and Playwright drift.
4. **+72h**: snapshot the Linode box and destroy it. Restore the TTL
   on the DNS records to a normal value (e.g. 3600s).

## Rollback

Railway keeps prior deploys; rollback is a one-click revert in the
service's Deployments tab. If the entire host is failing (rare), point
DNS back at the still-running Linode IP — it's why we keep it for 72h.

## Notes for other hosts

The `Dockerfile` is host-agnostic and will work unchanged on Fly.io,
Render, or any container host. Cloudflare Pages / Vercel / Netlify
would skip the Dockerfile entirely and publish `build/` directly;
that path is documented as an alternative in `docs/rfcs/0001-...`.
