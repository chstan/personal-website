# Project Milestones & Cleanup

This document tracks the remaining tasks for modernizing and refining the personal website codebase.

## 1. ESLint Warning Reduction
The current `pnpm lint` command reports over 100 warnings. The goal is to reduce this to zero to ensure that future linting errors are clearly visible.
- [ ] Fix `any` types in `src/Marriage.tsx` and other legacy components.
- [ ] Address unused variables (e.g. `ReadingPage` in `src/App.tsx`).
- [ ] Add missing `key` props in iterators across `src/staticPages.tsx`, `src/Papers.tsx`, etc.
- [ ] Refactor `DynamicMarkdown` and other components to remove `any` usage.

## 2. CSS Refinement
Modernize the styling and address build-time warnings.
- [ ] Fix CSS comment syntax (replace `//` with `/* */`) to resolve Vite/esbuild warnings.
- [ ] Consolidate legacy Less files that were converted to CSS.
- [ ] Ensure consistent use of CSS variables for theming.

## 3. Docker Optimization
Ensure the containerized environment is efficient and secure.
- [ ] Optimize multi-stage build in `Dockerfile` for smaller image size.
- [ ] Verify non-root user permissions for the `serve` process.
- [ ] Add health checks to the Docker configuration.

## 4. Content & Testing
- [ ] Populate or consolidate "WORK IN PROGRESS" markdown files (`flex_motion.md`, `daquiri.md`).
- [ ] Maintain 100% visual regression coverage for all new routes.
