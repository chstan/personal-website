# Project Context: Personal Website

## Overview
This is the personal website of Conrad Stansbury. It is a historical project that has evolved through several technology stacks (Haskell -> Clojure/ClojureScript -> Clojure/React). The current active iteration is a **Single Page Application (SPA)** built with **React and TypeScript**, styled with **Less**, and served primarily as static assets.

## Architecture

### Frontend (Active)
*   **Location:** `./front`
*   **Stack:** React, TypeScript, Less.
*   **Routing:** `react-router-dom` handles client-side routing.
*   **Content:**
    *   **Metadata:** JSON files in `front/src/json/` (e.g., `writing.json`, `talks.json`) drive lists of content.
    *   **Long-form:** Markdown files in `front/src/md/` are fetched dynamically and rendered using `react-markdown`.
*   **Styling:** Less files in `front/src/less/` are compiled to CSS in `front/src/css/`.

### Backend (Legacy/Alternative)
*   **Location:** `./src/clj`
*   **Stack:** Clojure (Ring/Compojure).
*   **Status:** While the README mentions using Clojure for the backend, the current Docker deployment strategy bypasses it in favor of a static Node.js server (`serve`). The Clojure backend is likely preserved for local development or specific legacy features not yet migrated.

### Deployment / Infrastructure
*   **Containerization:** The project is Dockerized (`Dockerfile`).
*   **Production Server:** The Docker container builds the frontend and uses `serve` (a static file server) to serve the `front/build` directory on port 8001.
*   **Configuration:** `serve.json` handles SPA rewrite rules (redirecting all traffic to `index.html`).

## Key Directories

*   `front/`: The main workspace for the React application.
    *   `src/`: Source code.
        *   `md/`: Markdown content files.
        *   `json/`: Data files defining lists of talks, papers, projects, etc.
        *   `less/`: Source stylesheets.
        *   `common.tsx`: Contains the `DynamicMarkdown` component responsible for fetching and rendering content.
*   `src/clj/`: Clojure backend source (legacy/dev).
*   `scripts/`: Utility scripts for bootstrapping and running the Docker container.

## Development Workflows

### Standard (Frontend Focus)
To work on the website content or UI:

1.  Navigate to the frontend directory:
    ```bash
    cd front
    ```
2.  Install dependencies (if needed):
    ```bash
    yarn install
    ```
3.  Start the development server:
    ```bash
    yarn start
    ```
    This runs `react-scripts start` and usually opens the site at `http://localhost:3000`.

### Docker (Full Environment)
To test the production-like build:

1.  From the root directory:
    ```bash
    yarn start
    ```
    (Note: This triggers `docker run ...` defined in the root `package.json`).

### Adding Content
1.  **Blog Posts:**
    *   Add a `.md` file to `front/src/md/`.
    *   Add an entry to `front/src/json/writing.json` referencing the file label.
2.  **Other Lists:** Update the corresponding JSON file in `front/src/json/`.

## Important Commands

| Command | Location | Description |
| :--- | :--- | :--- |
| `yarn start` | `front/` | Starts the React dev server (Hot Module Replacement). |
| `yarn build` | `front/` | Compiles the React app to `front/build/`. |
| `yarn watch-css` | `front/` | Watches and compiles Less files. |
| `yarn start` | Root | Runs the project inside a Docker container. |
| `yarn bootstrap` | Root | Installs global dependencies (`less`) via `scripts/bootstrap.sh`. |
