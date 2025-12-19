# Personal Website

This is the personal website of Conrad Stansbury.

## Architecture

*   **Stack:** React, TypeScript, CSS (Modules/Variables).
*   **Build System:** Vite.
*   **Routing:** React Router.
*   **Deployment:** Dockerized static site served via `serve`.

## Developing

**Prerequisites:** Node.js (v18+) and pnpm.

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Start development server:**
    ```bash
    pnpm start
    ```
    The site will be available at `http://localhost:5173` (Vite's default).

3.  **Build for production:**
    ```bash
    pnpm build
    ```
    Output will be in `dist/` (or `build/` depending on vite config, currently `build/`).

## Docker

The site is deployed via Docker. You can emulate the production environment locally:

*   **Build image:**
    ```bash
    pnpm docker:build
    ```

*   **Run container:**
    ```bash
    pnpm docker:run
    ```
    This runs the container on the host network.

*   **Verify Container:**
    ```bash
    pnpm verify-docker
    ```
    This builds the image, starts a container, and probes the endpoint to ensure it's serving traffic.

## Adding Content

### Blog Posts

1.  Add a Markdown file to `src/md/` (e.g., `my-new-post.md`).
2.  Add an entry to `src/json/writing.json` with the metadata:
    ```json
    {
      "title": "My New Post",
      "label": "my-new-post",
      "short": "A short description...",
      "released": true,
      "date": "2025-01-01"
    }
    ```
    The `label` must match the filename (without extension).

### Other Lists

Update the corresponding JSON files in `src/json/`:
*   **Talks:** `talks.json`
*   **Projects:** `projects.json`
*   **Reading:** `reading.json`

## History

The original version of this website was written in Haskell. It later migrated to Clojure (backend) and ClojureScript (frontend). Around 2018, the frontend was migrated to React. In 2025, the project was modernized to a standard React/Vite stack, removing the legacy Clojure backend and Less stylesheets.
