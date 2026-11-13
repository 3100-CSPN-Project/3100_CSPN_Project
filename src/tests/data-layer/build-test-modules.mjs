import { spawnSync } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';

const result = spawnSync(
  process.execPath,
  [
    'node_modules/typescript/lib/tsc.js',
    '--project',
    'tsconfig.data-tests.json',
  ],
  { stdio: 'inherit' },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const destination = '.test-build/scripts/mlb';
await mkdir(destination, { recursive: true });
await copyFile('scripts/mlb/aggregator.mjs', `${destination}/aggregator.mjs`);
