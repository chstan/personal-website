# Project Milestones & Cleanup

This document tracks the remaining tasks for modernizing and refining the personal website codebase.

## 1. ESLint Warning Reduction
The current `pnpm lint` command reports about 90 warnings.
- [ ] Fix `any` types in `src/Marriage.tsx` and other legacy components.
- [ ] Address remaining unused variables (e.g. `BibCite` in `src/Marriage.tsx`).
- [x] Add missing `key` props in iterators across the project.
- [ ] Refactor `DynamicMarkdown` and other components to remove `any` usage.

## 2. CSS Refinement
Modernize the styling and address build-time warnings.
- [x] Fix CSS comment syntax (replaced `//` with `/* */`) to resolve Vite/esbuild warnings.
- [ ] Consolidate legacy Less files that were converted to CSS.
- [ ] Ensure consistent use of CSS variables for theming.

## 3. Docker Optimization
Ensure the containerized environment is efficient and secure.
- [x] Optimize multi-stage build in `Dockerfile` for smaller image size.
- [x] Verify non-root user permissions for the `serve` process.
- [x] Add health checks to the Docker configuration.

## 4. Content & Testing
- [ ] Populate or consolidate "WORK IN PROGRESS" markdown files (`flex_motion.md`, `daquiri.md`).
- [x] Maintain 100% visual regression coverage for all routes.