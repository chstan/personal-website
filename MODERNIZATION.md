# Modernization Roadmap

This document outlines an opinionated plan to upgrade the personal website to 2025 web standards. The strategy prioritizes low-invasiveness refactoring first (hygiene and standards), followed by tooling upgrades, and finally architectural shifts.

## Phase 1: Standardization & Cleanup (Immediate)

These tasks reduce complexity and remove non-standard "glue" scripts without changing the fundamental application architecture.

### 1. Migrate Styling: Less → Modern CSS
**Objective:** Remove the `Less` preprocessor and the fragile `less-watch-compiler` sidecar process.
**Rationale:** Modern CSS now natively supports features that previously required Less (Variables, Nesting, Calc).
**Steps:**
*   [x] Audit `front/src/less/vars.less` and convert all variables to CSS Custom Properties (e.g., `@primary-color` → `--primary-color`).
*   [x] Convert nested selectors in `.less` files to standard CSS (or rely on PostCSS nesting).
*   [x] Rename all `.less` files to `.css`.
*   [x] Update imports in `App.tsx` and other components.
*   [x] Uninstall `less`, `less-watch-compiler`.

### 2. Dependency Hygiene: Localize Global Tools
**Objective:** Make the project self-contained and reproducible.
**Rationale:** The current `scripts/bootstrap.sh` relies on `npm install --global`. This corrupts the user's environment and breaks in strictly sandboxed CI/CD.
**Steps:**
*   [x] Add `serve` as a local dependency in `package.json` (or `front/package.json`).
*   [x] Update `scripts/run_continuously.sh` to use `npx serve` or `yarn serve`.
*   [x] Delete `scripts/bootstrap.sh`.

### 3. Remove Dead Code: The Clojure Backend
**Objective:** Reduce cognitive load by removing the vestigial backend.
**Rationale:** The site is deployed as a static frontend. The `src/clj` and `project.clj` files are "ghosts" that complicate the repository.
**Steps:**
*   [x] Delete `src/clj/`, `test/clj/`, `dev/`.
*   [x] Delete `project.clj`.
*   [x] Clean up root `Dockerfile` to remove Leiningen/Clojure steps.

### 4. Flatten Project Structure
**Objective:** Simplify the repository by moving the frontend to the root.
**Rationale:** Since the backend is gone, there's no reason to have a nested `front/` directory.
**Steps:**
*   [x] Move `front/src`, `front/public`, `front/tsconfig.json` to root.
*   [x] Merge `package.json` and `.gitignore`.
*   [x] Update `Dockerfile` and deployment scripts.
*   [x] Delete `front/` directory.

---

## Phase 2: Build Tooling (High Impact)

Replacing the deprecated Create React App (CRA) harness with modern tooling.

### 4. Migrate Build System: CRA → Vite
**Objective:** drastically improve startup time and build performance.
**Rationale:** `react-scripts` (CRA) is deprecated and relies on heavy Webpack configurations. Vite is the industry standard for SPA development in 2025.
**Steps:**
*   [ ] Remove `react-scripts`.
*   [ ] Install `vite` and `@vitejs/plugin-react`.
*   [ ] Move `front/public/index.html` to `front/index.html`.
*   [ ] Update entry point references.
*   [ ] Verify environment variable handling (`REACT_APP_` → `VITE_`).

---

## Phase 3: Architectural Modernization (Long Term)

Changing *how* the site works to improve performance and SEO.

### 5. Content Delivery: Client-side Fetch → Static Generation (SSG)
**Objective:** Improve Initial Content Paint (ICP) and SEO.
**Rationale:** Currently, the browser downloads the app, *then* fetches Markdown. This causes a layout shift/loading state.
**Proposal:** Migrate to **Next.js** (or use Vite SSG plugins).
**Steps:**
*   [ ] Move routing to file-system based routing (optional, but standard).
*   [ ] Refactor `DynamicMarkdown` component to read files at build time using `getStaticProps` (Next.js) or similar build-time data loaders.
*   [ ] Pre-render all blog posts and pages as HTML.
