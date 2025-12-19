# Project Context: Personal Website

## Overview
The personal website of Conrad Stansbury. This is a Single Page Application (SPA) built with **React**, **TypeScript**, and **Vite**. It is designed to be a modern, static-friendly site served via a lightweight Node.js server (`serve`) inside a Docker container.

## Architecture
- **Frontend:** React 17+, TypeScript, React Router 6.
- **Styling:** Standard CSS using CSS Modules and Variables (migrated from Less).
- **Build System:** Vite.
- **Content Management:** 
  - Metadata is stored in `src/json/`.
  - Long-form content is written in Markdown (`src/md/`) and rendered dynamically using `react-markdown` via the `DynamicMarkdown` component.
- **Infrastructure:**
  - Containerized with a **multi-stage Docker build**.
  - Serves static assets from the `build/` directory using the `serve` package.
  - Client-side routing is handled by `public/serve.json`.

## Key Directories
- `src/`: Main source code.
  - `src/md/`: Markdown source for blog posts and pages.
  - `src/json/`: Data driving lists (talks, projects, writing).
  - `src/css/`: Source stylesheets.
- `public/`: Static assets and configuration (e.g., `serve.json`).
- `tests/`: Visual regression tests using **Playwright**.
- `scripts/`: Utility scripts for automation and verification.

## Building and Running

### Development
```bash
# Install dependencies
pnpm install

# Start Vite development server (HMR)
pnpm start
```

### Production Build
```bash
# Compile the React application
pnpm build

# Serve the production build locally
pnpm serve
```

### Testing
```bash
# Run visual regression tests
pnpm exec playwright test

# Update snapshots if visual changes are intentional
pnpm exec playwright test --update-snapshots
```

### Docker
```bash
# Build the production image
pnpm docker:build

# Run the container locally
pnpm docker:run

# Build and verify the container serves traffic correctly
pnpm verify-docker
```

## Development Conventions
- **Quality Assurance:** A Husky pre-commit hook runs `type-check`, `build`, `verify-docker`, and `playwright test` in parallel to ensure stability.
- **Type Safety:** Rigorous use of TypeScript (`tsc --noEmit`).
- **CSS:** Use CSS Variables defined in `src/css/variables.css`.
- **Content:** Adding a blog post involves creating a `.md` file in `src/md/` and adding an entry to `src/json/writing.json`.
