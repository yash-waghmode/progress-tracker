# Progress

A minimal, responsive project progress tracker. Create projects, add tasks, and watch completion update automatically as tasks are checked off.

Projects stay compact for an at-a-glance overview and expand one at a time for
task editing. Overall progress is derived from all tasks; it is never stored as
separate data.

## Run locally

```bash
npm install
npm run dev
```

Always open `http://127.0.0.1:5173/`. The development server is configured to
use that host and port, and it will fail clearly if port 5173 is unavailable
instead of silently selecting a different origin.

## Quality checks

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

## Architecture

- React and strict TypeScript, built with Vite
- Small feature components for project cards and task rows
- Pure progress helpers and defensive, versioned persistence helpers
- CSS-only interaction and entrance animation, including reduced-motion support
- No backend, runtime configuration, or UI framework

## Persistence

Projects and tasks are stored in the browser's `localStorage` under the stable
key `progress-tracker:projects`. Data is restored on the next visit, older
supported data is migrated, malformed entries are ignored safely, and deleting
all projects stays deleted. If storage is unavailable, the current session
continues to work and displays a non-blocking warning.

Browser storage is specific to the exact origin and browser context. Always use
`http://127.0.0.1:5173/`; data does not automatically transfer to `localhost`,
another port, another browser profile, or a private-browsing session.

## Printing

The print layout expands every project, keeps task rows together, and removes
editing controls. For a clean PDF in Chrome, uncheck **Headers and footers** in
the print dialog; webpage CSS cannot disable Chrome's browser-generated date,
URL, title, or page-number headers.
