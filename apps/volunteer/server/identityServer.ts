/**
 * identityServer.ts — Local identity service for the volunteer app.
 *
 * Verifies an i58-finance Firebase ID token, then finds or creates the
 * Contacts row for that email. This is not mondayApiProxy and it does not
 * accept the staff dev-proxy secret as proof of identity.
 *
 *   cd apps/volunteer && npm run identity
 *   Listens on http://127.0.0.1:4051
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFirebaseIdToken } from '../src/identity/firebaseIdToken.ts';
import { runContactIdentity, type MondayGraphql } from '../src/identity/mondayContactIdentity.ts';
import { validateProfile } from '../src/identity/profile.ts';

const here = dirname(fileURLToPath(import.meta.url));
loadEnvFile(resolve(here, '../../../.env'));
loadEnvFile(resolve(here, '../.env'));

const PORT = Number(process.env.VOLUNTEER_IDENTITY_PORT || 4051);
const BOARD_ID = (
  process.env.VOLUNTEER_CONTACTS_BOARD_ID ||
  process.env.VITE_CONTACTS_BOARD_ID ||
  '2463183745'
).trim();
const MONDAY_TOKEN = (process.env.MONDAY_API_TOKEN || '').trim();
const FIREBASE_PROJECT_ID = (process.env.VITE_FIREBASE_PROJECT_ID || 'i58-finance').trim();

const ALLOWED_ORIGINS = new Set([
  'http://localhost:4050',
  'http://127.0.0.1:4050',
]);

const mondayGraphql: MondayGraphql = async (query, variables) => {
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      Authorization: MONDAY_TOKEN,
      'Content-Type': 'application/json',
      'API-Version': '2025-01',
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = (await response.json()) as {
    data?: unknown;
    errors?: Array<{ message?: string }>;
  };
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || `Monday API ${response.status}`);
  }
  return payload.data;
};

const server = createServer(async (req, res) => {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url || '/').split('?')[0] === '/health') {
    sendJson(res, 200, {
      ok: true,
      mondayConfigured: Boolean(MONDAY_TOKEN),
      firebaseProjectId: FIREBASE_PROJECT_ID,
    });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Use POST.' });
    return;
  }

  try {
    if (!MONDAY_TOKEN) {
      sendJson(res, 503, { error: 'The identity service is missing the Monday token.' });
      return;
    }
    const token = bearerToken(req);
    if (!token) {
      sendJson(res, 401, { error: 'Sign in again.' });
      return;
    }
    const { email } = await verifyFirebaseIdToken(token, FIREBASE_PROJECT_ID);
    const body = await readJson(req);
    const profileInput =
      body && typeof body === 'object' && 'profile' in body
        ? (body as { profile?: unknown }).profile
        : null;
    const validated = validateProfile(
      profileInput && typeof profileInput === 'object'
        ? (profileInput as Record<string, string>)
        : {},
    );
    if (!validated.ok) {
      sendJson(res, 400, { error: validated.message });
      return;
    }

    const confirmMatch =
      body != null &&
      typeof body === 'object' &&
      (body as { confirmMatch?: unknown }).confirmMatch === true;
    const result = await runContactIdentity({
      graphql: mondayGraphql,
      boardId: BOARD_ID,
      email,
      profile: validated.value,
      tagLabel: 'Volunteer',
      confirmMatch,
    });
    sendJson(res, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Identity request failed';
    console.error('volunteer identity:', message);
    if (message === 'unauthorized') {
      sendJson(res, 401, { error: 'Sign in again.' });
      return;
    }
    sendJson(res, 500, { error: 'We could not save your contact. Try again.' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`volunteer identity http://127.0.0.1:${PORT}`);
});

function bearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    size += buffer.length;
    if (size > 20_000) throw new Error('Request body is too large.');
    chunks.push(buffer);
  }
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function loadEnvFile(path: string) {
  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}
