#!/usr/bin/env node
/**
 * First-time setup: copy .env.example → .env if missing.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
const examplePath = resolve(root, '.env.example');

if (existsSync(envPath)) {
  console.log('✓ .env already exists — edit it for live Monday data.');
} else if (existsSync(examplePath)) {
  copyFileSync(examplePath, envPath);
  console.log('✓ Created .env from .env.example');
} else {
  console.error('✗ .env.example not found');
  process.exit(1);
}

console.log('');
console.log('Next steps:');
console.log('  1. Edit .env — enable the LIVE block and add MONDAY_API_TOKEN');
console.log('  2. npm run verify');
console.log('  3. npm run dev:live');
console.log('  4. Open http://localhost:4040');
console.log('');
console.log('See COLLABORATOR_SETUP.md for full instructions.');
