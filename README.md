# 3100_CSPN_Project

#Styles to follow:

Prettier for formatting https://prettier.io/docs/configuration
ESLint for code quality https://eslint.org/docs/latest/use/

## Setup

Run npm install, then before pushing,
npm run lint
npm run format

## Supabase

This repository uses React, Vite, and TypeScript. Run `npm run dev` to start
the frontend. Create a local `.env` file, then set the Vite-prefixed Supabase
project URL and publishable key from the shared Supabase Dashboard:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Each contributor should create their own `.env` file. Do not commit it or
share credentials in GitHub issues or pull requests.

The typed Supabase client is in `src/lib/supabase.ts`. It is created lazily
with `getSupabaseClient()`:

```ts
import { getSupabaseClient } from './lib/supabase.js';

const supabase = getSupabaseClient();
const { data, error } = await supabase.from('your_table').select('*');
```

Run `npm run typecheck` to verify the TypeScript connection layer. Do not put a
Supabase secret/service-role key in client-facing code; add a separate
server-only client if privileged operations are needed.

## MLB 2026 importer

The server-side importer loads 2026 regular-season games and postseason games
(`F`, `D`, `L`, and `W`). It stores schedules and finalized team/player box
score stats, but does not persist Statcast or pitch-level data.

Apply `supabase/migrations/20261007000000_create_mlb_tables.sql` through the
Supabase SQL editor or Supabase CLI before running the importer. Then set the
server-only credentials in the shell where the importer runs:

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SECRET_KEY=your-server-only-secret-key
```

Older Supabase projects can use `SUPABASE_SERVICE_ROLE_KEY` instead. Do not
use the publishable key for the importer.

Run the complete backfill with:

```bash
npm run ingest:mlb -- --mode backfill
```

Run a subsequent sync with a seven-day regular-season lookback and a refresh
of all 2026 postseason games:

```bash
npm run ingest:mlb -- --mode sync --days 7
```

Use `--dry-run` to discover games without writing to Supabase. The importer is
safe to rerun: games and stats are upserted by MLB IDs, requests retry on
transient failures, and each run is recorded in `mlb_ingest_runs`.

## For IDE setup:

Install Prettier https://prettier.io/docs/install and ESLint https://eslint.org/docs/latest/use/getting-started

## UI Prototype / Figma Link

https://www.figma.com/design/f7ZhdeWsFpY5vW2Xm0LFuE/CSPN-Prototype?node-id=0-1&t=IHOb7gwBKmcrmydc-1
