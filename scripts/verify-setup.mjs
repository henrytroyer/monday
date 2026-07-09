#!/usr/bin/env node
/**
 * Verify local CRM setup before running dev:live.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

let failed = false;

function pass(msg) {
  console.log(`✓ ${msg}`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed = true;
}

function warn(msg) {
  console.warn(`⚠ ${msg}`);
}

function parseEnv(content) {
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function checkProxy(port) {
  try {
    const res = await fetch(`http://localhost:${port}/`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

if (!existsSync(envPath)) {
  fail('.env missing — run: npm run setup');
  console.log('');
  process.exit(1);
}

pass('.env exists');

const env = parseEnv(readFileSync(envPath, 'utf8'));
const mockMode = env.VITE_USE_MOCK_DATA === 'true';

if (mockMode) {
  pass('Mock mode (VITE_USE_MOCK_DATA=true) — npm run dev is enough');
  console.log('');
  console.log('For live Monday data, set VITE_USE_MOCK_DATA=false and configure LIVE block in .env');
  process.exit(0);
}

pass('Live mode (VITE_USE_MOCK_DATA=false)');

const required = [
  'MONDAY_API_TOKEN',
  'VITE_CONTACTS_BOARD_ID',
  'VITE_MONDAY_API_PROXY_URL',
];

for (const key of required) {
  if (!env[key]?.trim()) {
    fail(`${key} is required for live mode`);
  } else if (key === 'MONDAY_API_TOKEN') {
    pass('MONDAY_API_TOKEN is set');
  } else {
    pass(`${key}=${env[key]}`);
  }
}

if (!env.VITE_APPLICATIONS_BOARD_ID?.trim()) {
  warn('VITE_APPLICATIONS_BOARD_ID not set — Applications page may be empty');
}

const proxyUp = await checkProxy(4042);
if (proxyUp) {
  pass('Monday proxy reachable on port 4042');
} else {
  warn('Monday proxy not running on port 4042 — start with: npm run dev:live');
}

console.log('');
if (failed) {
  console.error('Setup incomplete. See COLLABORATOR_SETUP.md');
  process.exit(1);
}

console.log('Setup looks good. Run: npm run dev:live');
console.log('Then open: http://localhost:4040');
