/**
 * loadEnvAndViteMeta.ts — Load .env and polyfill import.meta.env for CRM modules in Node.
 * Use: tsx --import ./scripts/lib/loadEnvAndViteMeta.ts scripts/...
 */

import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(root, '.env') });

const env: Record<string, string | undefined> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value != null) env[key] = value;
}

// Live merge defaults for CLI / GitHub Actions unless explicitly mocked.
if (env.VITE_USE_MOCK_DATA == null) env.VITE_USE_MOCK_DATA = 'false';
if (env.ALLOW_LIVE_MERGE === 'true' || env.MERGE_REPORT_ONLY === 'false') {
  env.VITE_CONTACTS_WRITABLE = env.VITE_CONTACTS_WRITABLE || 'true';
  if (env.ALLOW_LIVE_MERGE === 'true') {
    env.VITE_MONDAY_READ_ONLY = 'false';
  }
}

Object.defineProperty(import.meta, 'env', {
  value: env,
  writable: true,
  configurable: true,
  enumerable: true,
});
