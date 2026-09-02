# Progress

A minimal, responsive project progress tracker. Create projects, add tasks, and watch completion update automatically as tasks are checked off.

Projects stay compact for an at-a-glance overview and expand one at a time for
task editing. Overall progress is derived from all tasks; it is never stored as
separate data.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the Supabase project URL and publishable key before
starting the app. Never use a secret or service-role key in a `VITE_` variable.

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
- Supabase magic-link authentication, Postgres persistence, and Row Level
  Security that isolates every user's rows
- CSS-only interaction and entrance animation, including reduced-motion support
- No UI framework

## Cloud setup

The versioned database migration and setup instructions are in
[`supabase/`](supabase/README.md). After signing in, Supabase is the source of
truth for projects and tasks. An empty cloud account intentionally replaces any
old browser-only dummy data with a clean tracker.

## Persistence

Authenticated projects and tasks are loaded from and saved to Supabase, making
them available after signing in on another device. Writes are serialized so
rapid changes reach the cloud in order. The footer shows `Saving to cloud…`,
`Saved to cloud`, or a retry action when a network request fails.

The app also keeps a local safety cache under `progress-tracker:projects`. That
cache makes recent state recoverable in the same browser, but cloud data remains
authoritative after sign-in.

Use **Download backup** in the footer to save all projects and tasks as a JSON
file. **Restore backup** validates one of these files before replacing the cloud
data associated with the signed-in account.

## Printing

The print layout expands every project, keeps task rows together, and removes
editing controls. For a clean PDF in Chrome, uncheck **Headers and footers** in
the print dialog; webpage CSS cannot disable Chrome's browser-generated date,
URL, title, or page-number headers.
