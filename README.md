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

The JSON parsing functions remain in `scripts/mlb/import-2026.mjs`.
`extractGames`/`gameRow` handle schedule responses (`dates[].games[]` or
`games[]`), while `parseBoxscore` handles `teams.home` and `teams.away`,
preserving batting, pitching, and fielding stats as JSON.
Raw MLB objects are retained in the `source_json` columns so fields can be
added later without losing the original response.

The on-demand read layer is `src/lib/mlbStats.ts`. Each call reads finalized
regular-season player-game rows from Supabase, then `scripts/mlb/aggregator.mjs`
adds counting stats and recalculates rates such as AVG, OBP, OPS, ERA, and WHIP
in memory. No aggregate split rows are stored. Its default query is regular
season, last 7 games:

```ts
import { getMlbPlayerStats } from './lib/mlbStats.js';

const defaultStats = await getMlbPlayerStats();
const seasonStats = await getMlbPlayerStats({ split: 'season' });
```

Hitter output includes at-bats, runs, hits, home runs, RBI, stolen bases,
batting average, OBP, and OPS. Pitcher output includes wins, losses, ERA,
games, games started, saves, innings pitched, strikeouts, and WHIP.

Run the parser/aggregation tests with:

```bash
npm run test:mlb
```

This parser covers MLB Stats API schedule and boxscore JSON. Statcast or
pitch-level responses should use a separate parser and tables because they
have a different grain: one row per pitch rather than one row per game or
player-game.

## Team logos and player headshots

Images are uploaded to Cloudinary once and the delivery URL is stored on the
Supabase row, so the frontend shows images without any Cloudinary credentials.

Apply `supabase/migrations/20261019000000_add_image_columns.sql` through the
Supabase SQL editor or Supabase CLI before running the sync. It adds
`logo_url`/`logo_public_id` to `mlb_teams` and `image_url`/`image_public_id` to
`mlb_players`. Then add the server-only credentials to your local `.env`. The
three Cloudinary values are on the Cloudinary dashboard:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-server-only-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

`npm run sync:mlb-images` loads `.env` automatically, so no `export` is needed.
Do not give these a `VITE_` prefix, because Vite inlines those into the browser
bundle, and do not commit `.env`.

Upload the team logos, then the much larger player set:

```bash
npm run sync:mlb-images -- --target teams
npm run sync:mlb-images -- --target players
```

Use `--limit 1` first to check one image end to end before spending Cloudinary
credits on the rest. The sync is safe to rerun: it only reads rows whose image
column is still null, so it never re-uploads and resumes where it stopped. A
missing source image stops the run, so rerun it to continue past the images
that already succeeded. The source URLs are the `source` fields in the
`TARGETS` object in `scripts/mlb/sync-images.mjs`, where `{id}` is the MLB ID.

The read layer is `src/lib/mlbImages.ts`. `getMlbTeamLogos()` returns the
stored URLs, and `transformedImageUrl(url, width)` inserts `f_auto,q_auto,w_*`
so Cloudinary optimizes and resizes on delivery:

```tsx
<img src={transformedImageUrl(team.logoUrl, 128)} alt="" />
```

`src/pages/TeamListPage.tsx` uses both.

## For IDE setup:

Install Prettier https://prettier.io/docs/install and ESLint https://eslint.org/docs/latest/use/getting-started

## UI Prototype / Figma Link

https://www.figma.com/design/f7ZhdeWsFpY5vW2Xm0LFuE/CSPN-Prototype?node-id=0-1&t=IHOb7gwBKmcrmydc-1
