import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

// supabase returns at most 1000 rows per request
const PAGE_SIZE = 1000;

// each target names its table, the columns to fill, and where the source image lives
const TARGETS = {
  teams: {
    table: 'mlb_teams',
    idColumn: 'team_id',
    urlColumn: 'logo_url',
    publicIdColumn: 'logo_public_id',
    folder: 'cspn/teams',
    source: 'https://www.mlbstatic.com/team-logos/{id}.svg',
  },
  players: {
    table: 'mlb_players',
    idColumn: 'player_id',
    urlColumn: 'image_url',
    publicIdColumn: 'image_public_id',
    folder: 'cspn/players',
    source: 'https://midfield.mlbstatic.com/v1/people/{id}/spots/120',
  },
};

// reads one secret from .env, or stops before anything is uploaded
function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Set ${name} in .env before running the image sync.`);
  }

  return value;
}

// reads every row that has no image yet, one page at a time
async function fetchPendingIds(client, target) {
  const { table, idColumn, urlColumn } = target;
  const ids = [];
  let data;
  let from = 0;

  do {
    const page = await client
      .from(table)
      .select(idColumn)
      .is(urlColumn, null)
      .order(idColumn)
      .range(from, from + PAGE_SIZE - 1);

    if (page.error) {
      throw new Error(`Could not read ${table}: ${page.error.message}`);
    }

    data = page.data;
    from += PAGE_SIZE;

    for (const row of data) {
      ids.push(row[idColumn]);
    }
    // a short page means there is nothing left to read
  } while (data.length === PAGE_SIZE);

  return ids;
}

// uploads one image to cloudinary, then stores its delivery url on the row
async function uploadOne(client, target, id) {
  const { table, idColumn, urlColumn, publicIdColumn, folder, source } = target;

  // cloudinary fetches the source url
  const upload = await cloudinary.uploader.upload(source.replace('{id}', id), {
    folder,
    public_id: String(id),
    overwrite: false,
  });

  const newValues = {};
  newValues[urlColumn] = upload.secure_url;
  newValues[publicIdColumn] = upload.public_id;

  const { error } = await client.from(table).update(newValues).eq(idColumn, id);

  if (error) {
    throw new Error(error.message);
  }
}

// uploads every image the chosen table is still missing
async function main() {
  const { values } = parseArgs({
    options: {
      target: { type: 'string', default: 'teams' },
      limit: { type: 'string' },
    },
  });

  const target = TARGETS[values.target];

  if (!target) {
    throw new Error('target must be teams or players.');
  }

  let limit = Infinity;

  if (values.limit !== undefined) {
    limit = Number(values.limit);

    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error('limit must be a whole number of 1 or more.');
    }
  }

  cloudinary.config({
    cloud_name: requireEnv('CLOUDINARY_CLOUD_NAME'),
    api_key: requireEnv('CLOUDINARY_API_KEY'),
    api_secret: requireEnv('CLOUDINARY_API_SECRET'),
    secure: true,
  });

  const client = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SECRET_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // rows that already have a url are never read, so reruns resume where they stopped
  const pending = await fetchPendingIds(client, target);
  const ids = pending.slice(0, limit);

  for (const id of ids) {
    await uploadOne(client, target, id);
  }

  console.log(`${ids.length} uploaded.`);
}

// prints the message alone, since a stack trace is noise for a setup mistake
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
