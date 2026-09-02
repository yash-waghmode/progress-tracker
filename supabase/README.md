# Supabase setup

The migration in `migrations/` creates the cloud tables and Row Level Security
policies for Progress Tracker.

## Apply through the dashboard

1. Create a Supabase project.
2. Open **SQL Editor** and create a new query.
3. Paste the complete contents of
   `migrations/20260902113000_initial_schema.sql` into the query.
4. Select **Run** once.

The migration is intended for a new project. Do not run it a second time after
it succeeds.

## Application settings

Open the project's **Connect** dialog and copy its project URL and publishable
key. Copy `.env.example` to `.env.local`, then replace both placeholders. Never
put a secret key in a `VITE_` variable; browser code must use only the
publishable key.
