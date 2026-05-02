# RFC 0001: Cleanup, DevX standardization, test coverage, and migration to a hosted platform

- **Status:** Draft
- **Author:** Claude (on behalf of Conrad Stansbury)
- **Created:** 2026-05-01
- **Target:** complete cleanup + tests before host swap; aim to migrate within ~2 working sessions after that.

## 1. Motivation

The site is currently self-hosted on Linode and maintained solo. Day-to-day toil is dominated by three things:

1. **Stack drift.** React 17 (EOL track), `react-ga` (deprecated, replaced by GA4 / `react-ga4`), `react-router-dom` v6 (v7 is current), `react-router`'s class-component idioms (`Expandable` → `NavGroup`), and a hand-rolled `Baduk.jsx` mixed into an otherwise-TS codebase.
2. **Slow, brittle pre-commit hook.** Every commit runs `build` + `lint` + `type-check` + a full Docker build + a full Playwright visual suite. On a clean machine that's minutes of wall time and requires a working Docker daemon. Visual snapshots are also OS/font-sensitive.
3. **No unit/component tests.** The only safety net is Playwright screenshots and a thin DOM check in `tests/blog.spec.ts`. Refactors are risky because nothing exercises pure functions, data shapes, or component logic in isolation.

We want to fix these *before* moving off Linode so the migration lands on a stable base, and so the new platform's CI integration has a fast, reliable test suite to run.

## 2. Goals / Non-goals

**Goals**

- Make the developer loop boringly standard: `pnpm install && pnpm dev && pnpm test` should Just Work on a fresh clone with no Docker required.
- Add a real unit/component test layer (Vitest + React Testing Library) and bring meaningful coverage to `data.ts`, `App.tsx` routing, `common.tsx` primitives, and the blog rendering path.
- Move slow checks (Docker build, Playwright visuals) out of the pre-commit path and into CI.
- Adopt a single hosted platform (target: Railway) with a reproducible deploy from `main`.
- Modernize a small, well-scoped set of dependencies (React 17 → 18, `react-ga` → `react-ga4`, drop `prop-types`, drop the `history` package which is unused at runtime).

**Non-goals**

- No visual redesign. The Playwright snapshots define the current visible behavior and should remain the contract through the migration.
- No content reorganization (URLs, slugs, blog labels stay stable).
- No move to Next.js / a meta-framework. Static-site Vite + a CDN is the right shape for this site.
- No CMS. Markdown + JSON in the repo is fine.

## 3. Current state (audit)

| Area | Observation |
| --- | --- |
| Framework | React **17.0.2**, `react-dom` 17. `ReactDOM.render` (legacy API) in `src/index.tsx`. |
| Router | `react-router-dom` 6.x, used correctly. |
| Analytics | `react-ga` (UA-…, Universal Analytics, **shut down by Google in 2023**). The current `ReactGA.pageview` call in `src/App.tsx` is dead code in prod. |
| State / classes | One class component (`NavGroup` extends `Expandable`). Could be a hook. |
| Styling | Plain CSS + variables. Healthy; no migration needed. |
| Build | Vite 7. `outDir: 'build'` (non-default; required by Dockerfile path). |
| Linting | ESLint 9 flat config. `no-explicit-any: error`, `no-unused-vars: error`. Good. |
| TS config | `target: es6` (could bump to `ES2022`), `jsx: "react"` (legacy; `react-jsx` enables automatic runtime and removes `import React` boilerplate). |
| Tests | Playwright only. No unit/component layer. `playwright.config.ts` uses `reuseExistingServer: false`, so a stray `pnpm serve` collides. |
| Pre-commit | Sequential build → parallel lint+type-check → docker verify → playwright. ~2-5 min on a warm cache; longer cold. Requires Docker. |
| Docker | Two-stage Node 22-slim, runs `serve build -l 8001` as non-root, healthcheck via curl. Solid. |
| Public assets | `public/` is **27 MB** (images, PDFs, video). Fine for static hosting; matters for any platform with bandwidth pricing. |
| Deps with smell | `@vx/vx` (alpha, the project rebranded to `@visx/visx` years ago), `prop-types` (unused with TS), `history` (imported in `App.tsx` but `createBrowserHistory()` result is never used after `BrowserRouter` was adopted), `@types/react-ga` / `@types/history` / `@types/react-router-dom` (all paired with packages whose v6+ ship their own types). |
| Memory of past work | Recent commits (`5ada72d0`, `cf28aa7c`, `7e25bf73`) already pushed in the cleanup direction (eslint warnings → errors, `any` removal, build-breaking type fixes). This RFC continues that arc. |

## 4. Proposed work, in order

Each section is sized to be a single PR. Order matters: the test layer lands before the dependency bumps so we have a real safety net.

### Phase A — DevX foundation (PRs A1–A4)

**A1. Add Vitest + React Testing Library + jsdom.**
- New `pnpm test` (watch) and `pnpm test:run` (CI mode).
- Set up `vitest.config.ts` sharing Vite's plugin pipeline.
- One smoke test (`render(<App />)` inside `MemoryRouter`) to prove wiring.

**A2. Move heavy checks out of pre-commit; add `lint-staged`.**
- Pre-commit shrinks to: `lint-staged` (eslint + tsc on changed files via `tsc --noEmit -p` on a small project, or just `eslint --fix` for staged files) + `pnpm test:run`.
- Drop `pnpm build`, `pnpm verify-docker`, and the full Playwright run from pre-commit.
- Add `pnpm precheck` that runs the **old** full sequence locally for anyone who wants the strict gate.

**A3. Add GitHub Actions CI.**
- Job 1: install + lint + type-check + `pnpm test:run` (fast, ~1 min).
- Job 2: `pnpm build` + Playwright (matrix: chromium only for now; cache `.playwright`).
- Job 3 (only on `main`): build Docker image, push to GHCR (or Railway registry, see Phase C).
- Required checks on PRs: jobs 1 and 2.

**A4. Tighten `playwright.config.ts` and snapshot policy.**
- Set `reuseExistingServer: !process.env.CI` so local iteration doesn't collide with a running `pnpm serve`.
- Pin `expect.toHaveScreenshot` `maxDiffPixelRatio` to a small non-zero value (e.g., `0.005`) to absorb font-rendering noise.
- Document the snapshot regeneration workflow in `CLAUDE.md`.

### Phase B — Code modernization (PRs B1–B5)

**B1. React 17 → 18.**
- `react`, `react-dom`, `@types/react`, `@types/react-dom` to 18.x.
- Switch `src/index.tsx` to `createRoot`.
- StrictMode on (catches the next set of bugs early; gate behind a flag if it surfaces double-effect issues with `Marriage.tsx`).

**B2. Replace `react-ga` with `react-ga4` (or just `gtag` directly).**
- UA shut down in 2023; current code is a no-op in prod. Either wire GA4 or delete the analytics integration entirely. Recommendation: delete (one fewer dep, one fewer thing tracking visitors on a personal site). Decision flag for Conrad.

**B3. Remove dead deps.**
- Drop `history` (unused after BrowserRouter), `prop-types`, `@types/react-ga`, `@types/history`, `@types/react-router-dom`, `@types/react-toggle` (verify each is unused first).
- Migrate `@vx/vx` → `@visx/visx` packages used in `Marriage.tsx`. This is a real code change; isolate it.

**B4. Convert `NavGroup` from class to function component.**
- Drop the `Expandable` base class if no other consumer remains.
- Convert `src/lib/Baduk.jsx` → `Baduk.tsx` (or leave as `.jsx` if the typing cost is high; the TS allowJs flag already permits it).

**B5. `tsconfig` polish.**
- `target: ES2022`, `jsx: "react-jsx"`, `verbatimModuleSyntax: true`.
- Remove now-unneeded `import React from 'react'` lines incrementally.

### Phase C — Hosted migration (PRs C1–C3)

**Recommendation: Railway.** Conrad already runs another project there; the existing Dockerfile is plug-and-play; preview environments per PR are first-class.

Alternatives considered:
- **Cloudflare Pages / Vercel / Netlify** — all excellent for a static SPA, free tier covers this site, faster global CDN than Railway. The downside is they want to own the build (`pnpm build` → publish `build/`), which means abandoning the Docker image as the deploy artifact. For a static-only site that's actually fine and arguably better. **If Conrad cares about CDN latency / global reach more than parity with the other Railway project, switch the recommendation to Cloudflare Pages.**
- **Fly.io** — closer to Railway in shape; no compelling advantage here.

**C1. Wire Railway service.**
- New Railway project, deploy from the Dockerfile in this repo.
- Healthcheck path `/`, port 8001 (already exposed).
- Environment: none needed at runtime today (analytics decision in B2 may add one).
- Custom domain: point `conradstansbury.com` (or whatever the production domain is) at Railway after a staging period on the Railway-provided subdomain.

**C2. DNS cutover plan.**
- Lower TTL on the existing Linode DNS records 24h ahead.
- Deploy to Railway, verify all routes via Playwright against the staging URL (one-shot CI run with `BASE_URL` overridden).
- Flip DNS, monitor, keep Linode hot for 72h as rollback.

**C3. Decommission Linode.**
- Snapshot the box, then destroy.
- Remove any Linode-specific scripts (none in repo today; check Conrad's local dotfiles).

### Phase D — Test coverage targets (parallel with B/C)

Aim for **~70% line coverage on `src/*.ts` and `src/common.tsx`, `src/Blog.tsx`, `src/App.tsx` routing**. Don't chase coverage on the visualization-heavy `Marriage.tsx` — Playwright is the right tool there.

Concrete unit/component tests to add:

- **`data.ts`** — assert each typed export has the expected shape; assert enums are exhaustive against the JSON; assert `WRITING` entries with `released: true` have a matching `src/md/<label>.md` file (catches the #1 most common content-add bug).
- **`App.tsx`** — render with `MemoryRouter` initialized at each path in `flatLinks`; assert the right component mounts. Assert nav rendering for `link` / `separator` / `navgroup` cases.
- **`common.tsx`** — `WrapLink` (internal vs external), `Expandable` toggle behavior, `DynamicMarkdown` renders fenced code, math, and raw HTML.
- **`Blog.tsx`** — list filters out `released: false`; external-URL items render `<a>` with the right href; `BlogItem` reads `:blogId` from params.
- **content sanity** — JSON-schema-style validation of `writing.json`, `talks.json`, `papers.json` (a tiny zod schema in `data.ts`, validated in a test).

## 5. Risks / open questions

- **Snapshot churn during React 18 upgrade.** StrictMode's double-render and any router internals change can shift pixels by a few. Plan: regenerate snapshots in the same PR, review the PNG diffs in the PR description.
- **`Marriage.tsx` + `@vx/vx` → `@visx/visx`.** API surface is mostly stable but not identical. Isolate this PR (B3) and lean on the existing visual snapshot as the regression check.
- **Analytics decision (B2).** Needs a yes/no from Conrad before the PR lands. Default in this RFC is "delete."
- **Docker as deploy artifact vs static publish.** If we move to Cloudflare Pages later, the Dockerfile becomes vestigial. Keeping it for Railway parity is fine; we shouldn't delete it speculatively.
- **Pre-commit relaxation.** Loosening the hook means relying on CI to catch type/visual regressions before merge. Acceptable on a solo repo with branch protection; flag if Conrad wants a stricter local gate.

## 6. Rollout summary

| Order | PR | Why now |
| --- | --- | --- |
| 1 | A1 Vitest scaffold | Need a unit test layer before we touch anything else. |
| 2 | A2 Pre-commit slim + lint-staged | Stops every commit costing minutes. |
| 3 | A3 GitHub Actions | Restores the safety net in CI. |
| 4 | A4 Playwright config tweaks | Cheap reliability win. |
| 5 | D unit tests (rolling) | Land alongside B/C; one PR per file/area. |
| 6 | B1 React 18 | Foundational; do before B3. |
| 7 | B2 Analytics decision | Independent; can land any time. |
| 8 | B3 Dep cleanup + visx migration | Riskiest of B; isolate. |
| 9 | B4–B5 Polish | Low risk, high signal. |
| 10 | C1–C3 Railway migration + DNS + Linode shutdown | Last, on top of a stable, tested, modern base. |

## 7. Decisions needed from Conrad

1. **Hosting target:** confirm Railway, or pivot to Cloudflare Pages for CDN + free static hosting?
2. **Analytics:** delete `react-ga`, or migrate to GA4? Default is delete.
3. **Pre-commit strictness:** OK to drop Docker + Playwright from local pre-commit (they move to CI), or keep a "strict" path opt-in?
4. **React 18 StrictMode:** opt in immediately, or land 18 first and StrictMode in a follow-up?
