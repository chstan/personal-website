# Deploying to Railway

This site is built to deploy on Railway out of the box via the
existing `Dockerfile`. The repo also ships `railway.toml`, which
Railway picks up automatically and uses to wire the build, start
command, and healthcheck.

## One-time setup

1. Create a new Railway project (or open the existing one).
2. Connect it to the GitHub repo `chstan/personal-website`.
3. In the service settings:
   - **Builder**: Dockerfile (Railway will detect this from `railway.toml`).
   - **Region**: pick the one closest to most traffic.
   - **Networking → Generate domain**: gives you a `*.up.railway.app`
     subdomain. Use this for verification before flipping the apex.
4. There are no required environment variables. `PORT` is injected
   by Railway and the Dockerfile honors it (defaults to 8001 locally).

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
