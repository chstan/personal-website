# AGENTS.md

Shared guidance for AI coding agents (Claude Code, Gemini, Codex, Cursor, etc.) working in this repo. Tool-specific entry points (`CLAUDE.md`, `GEMINI.md`) include this file by reference, so update guidance here.

## Commands

Package manager is **pnpm**.

| Command | What it does |
| --- | --- |
| `pnpm start` | Vite dev server on **port 3000** (auto-opens browser). |
| `pnpm build` | Production build into `build/` (Vite's `outDir` is overridden from the default `dist`). |
| `pnpm serve` | Serve `build/` on **port 8001** via `serve` (matches Docker). |
| `pnpm type-check` | `tsc --noEmit`. |
| `pnpm lint` | ESLint flat config (`eslint.config.js`). Warnings are errors. |
| `pnpm test` | Vitest in watch mode (jsdom + React Testing Library). Discovers `src/**/*.{test,spec}.{ts,tsx}`. |
| `pnpm test:run` | Vitest single-shot (CI mode). |
| `pnpm precheck` | Runs the full strict gate: build + lint + type-check + vitest + verify-docker + Playwright. |
| `pnpm verify-docker` | `scripts/verify_docker.sh`: builds the image, runs it, curls `:8001` until 200 (max 30s). |
| `pnpm exec playwright test` | Visual + content suite. Spawns its *own* `pnpm serve` on 8001 with `reuseExistingServer: false`, so kill any local server first. Browsers cache under `./.playwright`. |
| `pnpm exec playwright test --update-snapshots` | Refresh baselines in `tests/visual.spec.ts-snapshots/`. |
| `pnpm exec playwright test tests/blog.spec.ts -g "load individual"` | Run a single spec / single test. |

### Pre-commit (Husky)

`.husky/pre-commit` is intentionally fast: it runs `lint-staged` (eslint with autofix on changed files) and `pnpm test:run` (Vitest). Heavier checks live in CI and behind `pnpm precheck`.

- ESLint is configured with `@typescript-eslint/no-explicit-any: 'error'` and `no-unused-vars: 'error'` (with `^_` ignore). Introducing `any` blocks the commit.
- For the strict local gate (build + lint + type-check + vitest + Docker probe + Playwright visuals), run `pnpm precheck`.
- Visual snapshot diffs are caught in CI; regenerate intentionally with `pnpm exec playwright test --update-snapshots` and review the PNG diff before committing.

## Architecture

SPA built with React 17 + TypeScript + Vite, served as static files by `serve` inside a multi-stage Docker image. No backend; all content is bundled at build time.

### Routing & navigation (`src/App.tsx`)

A single declarative `links` array drives **both** the sidebar `<Navbar>` and the `<Routes>` table. Entries are a tagged union:

- `link` — `[path, [Component, label]]`
- `separator` — visual divider in the nav
- `navgroup` — collapsible section with nested links (e.g., `Quicklinks`, `Open-source`)

`flatLinks` strips out `http(s)` entries (those are external) and feeds the React Router `<Routes>`. **To add a page: add one entry to `links`.** The router and nav stay in sync automatically.

`NavGroup` extends `Expandable` (a small generic class component in `src/common.tsx`) for the open/close state.

### Content pipeline

- **Structured data:** `src/json/*.json` (`writing.json`, `talks.json`, `projects.json`, `papers.json`, `reading.json`).
- **Typed re-exports:** `src/data.ts` is the single source of truth for `BOOKS`, `TALKS`, `WRITING`, `PROJECTS`, `PAPERS`, plus enums (`PapersKind`, `TalkKind`, `ResumeRowKind`) and the hardcoded `RESUME_INFO`. Some JSON files are loosely typed and cast through `unknown`.
- **Long-form posts:** Markdown in `src/md/` rendered via `DynamicMarkdown` in `src/common.tsx`. The pipeline wires `react-markdown` with `remark-math`, `rehype-katex`, `rehype-raw`, and `react-syntax-highlighter`.
- **Adding a blog post requires both:**
  1. A `.md` file in `src/md/`.
  2. An entry in `src/json/writing.json` whose `label` matches the filename stem.

  Items with `released: false` are hidden by `Blog.tsx`. Entries with `externalUrl` link out instead of resolving to a local route.

### Styling

Plain CSS with per-page `.css` files imported directly, plus CSS Variables defined in `src/css/variables.css`. The Less stylesheets and the Clojure/ClojureScript backend from prior incarnations have been fully removed (see README "History").

### Vite specifics (`vite.config.ts`)

- `assetsInclude: ['**/*.md']` — Markdown imported as URL assets.
- `build.outDir = 'build'` — required so the Dockerfile's `COPY --from=builder /app/build` works.
- Dev server on port 3000.

### Production serving

- **Dockerfile:** two-stage (Node 22-slim build → Node 22-slim runtime). Runtime installs `serve` globally and runs `serve build -l 8001` as the `node` user. Curl `HEALTHCHECK` hits `/`.
- **SPA fallback:** `public/serve.json` rewrites `/**` → `/index.html` so client-side routes resolve on hard refresh.

### Playwright (`playwright.config.ts`)

- Pins `PLAYWRIGHT_BROWSERS_PATH` to `./.playwright` (in-repo cache).
- Spawns its own `pnpm serve` on 8001; `reuseExistingServer: false` means a stale local server will collide.
- Two suites: `tests/visual.spec.ts` (snapshot regression for every static route + every released non-external blog post) and `tests/blog.spec.ts` (DOM-level checks of the writing list and a single post).
- Unit/component tests live alongside source as `src/**/*.test.{ts,tsx}` and run under Vitest with jsdom. `vitest.config.ts` keeps the discovery glob scoped to `src/` so Playwright specs aren't picked up.

## Source-file index

The `src/` tree is flat; non-obvious entry points:

- `src/App.tsx` — routing, nav, page registry.
- `src/index.tsx` — bootstraps React + ReactGA (`UA-55955707-3`).
- `src/common.tsx` — shared primitives: `WrapLink`, `Expandable`, `DynamicMarkdown`, `LabeledInputGroup`, `SimpleButton`, syntax-highlight helpers.
- `src/data.ts` — typed data exports + résumé content.
- `src/staticPages.tsx` — `WelcomePage`, `ContactPage`, `Resume`, `GoPage`, `UnmigratedTalksPage`.
- `src/Marriage.tsx` — large interactive tax/heatmap page using `@vx/vx` and d3.
- `src/lib/Baduk.jsx` — the only `.jsx` file in `src/`; backs `GoPage`.
- `src/types/{globals,vendor}.d.ts` — module shims (e.g., `*.md`, `@vx/vx`).

## Change philosophy

- **Minimize blast radius.** Keep changes tightly scoped to the specific task. Avoid making non-functional changes (refactoring, linting, formatting) that are unrelated to the primary objective.
- **Atomic commits.** Prefer many small, focused commits over large ones that change several things simultaneously.
- **Separation of concerns.** NEVER mix functional changes (website content, features) with infrastructure or development-harness changes (`Dockerfile`, pre-commit hooks, testing methodology) in the same commit. Handle them as separate, independent units of work.

## Active initiatives

- **Hosted-platform migration.** The site is moving off self-hosted Linode toward Railway. The Dockerfile honors `$PORT`, `railway.toml` configures the service, and `docs/deploy/railway.md` covers DNS cutover. See `docs/rfcs/0001-cleanup-devx-and-hosted-migration.md` for the broader plan.
