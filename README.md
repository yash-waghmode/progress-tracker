# Progress

A minimal, responsive project progress tracker. Create projects, add tasks, and watch completion update automatically as tasks are checked off.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (normally `http://localhost:5173`).

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

Projects and tasks are stored in the browser's `localStorage` under a versioned key. Data is restored on the next visit, malformed entries are ignored safely, and clearing all projects stays cleared. If storage is unavailable, the current session continues to work and displays a non-blocking warning.
