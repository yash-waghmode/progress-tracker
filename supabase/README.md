# Supabase setup

The migrations in `migrations/` create the cloud tables, Row Level Security
policies, and project tracking modes for Stepmark.

## Apply through the dashboard

1. Create a Supabase project.
2. Open **SQL Editor** and create a new query.
3. For a new database, paste each migration into a separate query in filename
   order. For an existing Stepmark database, use only migrations that have not
   already been applied.
4. Select **Run** once for each pending migration. Number goals require
   `20260909144417_add_counter_projects.sql`.

Do not run a migration a second time after it succeeds.

## Application settings

Open the project's **Connect** dialog and copy its project URL and publishable
key. Copy `.env.example` to `.env.local`, then replace both placeholders. Never
put a secret key in a `VITE_` variable; browser code must use only the
publishable key.
