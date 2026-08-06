/**
 * private-notes-proxy.mjs — Local ciphertext store for private contact notes.
 *
 * Stores opaque vault + note envelopes under server/.private-notes/{uid}/.
 * Never decrypts. Production should use i58finance Cloud Function + Firestore.
 *
 * Env: PORT (default 4043)
 * Run: npm run private-notes:proxy
 * CRM: VITE_PRIVATE_NOTES_URL=/api/private-notes (Vite proxies here in DEV)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 4043);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '.private-notes');

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Owner-Uid',
  });
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString() || '{}';
  return JSON.parse(text);
}

function ownerDir(uid) {
  const safe = String(uid).replace(/[^a-zA-Z0-9._@-]/g, '_');
  return path.join(ROOT, safe);
}

function ensureOwnerDir(uid) {
  const dir = ownerDir(uid);
  fs.mkdirSync(path.join(dir, 'notes'), { recursive: true });
  return dir;
}

function vaultPath(uid) {
  return path.join(ownerDir(uid), 'vault.json');
}

function notePath(uid, noteId) {
  const safeId = String(noteId).replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(ownerDir(uid), 'notes', `${safeId}.json`);
}

function requireOwner(req, res) {
  const owner = String(req.headers['x-owner-uid'] || '').trim();
  if (!owner) {
    sendJson(res, 401, { error: 'Missing X-Owner-Uid' });
    return null;
  }
  return owner;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  try {
    if (pathname === '/health' && req.method === 'GET') {
      sendJson(res, 200, { ok: true });
      return;
    }

    const owner = requireOwner(req, res);
    if (!owner) return;

    if (pathname === '/vault' && req.method === 'GET') {
      const file = vaultPath(owner);
      if (!fs.existsSync(file)) {
        sendJson(res, 404, { error: 'No vault' });
        return;
      }
      const vault = JSON.parse(fs.readFileSync(file, 'utf8'));
      sendJson(res, 200, vault);
      return;
    }

    if (pathname === '/vault' && req.method === 'PUT') {
      const body = await readJsonBody(req);
      if (body.ownerUid && body.ownerUid !== owner) {
        sendJson(res, 403, { error: 'ownerUid mismatch' });
        return;
      }
      ensureOwnerDir(owner);
      const record = { ...body, ownerUid: owner };
      fs.writeFileSync(vaultPath(owner), JSON.stringify(record, null, 2));
      sendJson(res, 200, record);
      return;
    }

    if (pathname === '/notes' && req.method === 'GET') {
      const contactId = url.searchParams.get('contactId') || '';
      const dir = path.join(ownerDir(owner), 'notes');
      if (!fs.existsSync(dir)) {
        sendJson(res, 200, { notes: [] });
        return;
      }
      const notes = fs
        .readdirSync(dir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .filter((n) => !contactId || n.contactId === contactId);
      sendJson(res, 200, { notes });
      return;
    }

    if (pathname === '/notes' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!body?.id || !body?.contactId || !body?.ciphertext || !body?.iv) {
        sendJson(res, 400, { error: 'Invalid envelope' });
        return;
      }
      ensureOwnerDir(owner);
      const envelope = {
        ...body,
        ownerUid: owner,
        alg: body.alg || 'AES-GCM',
        createdAt: body.createdAt || new Date().toISOString(),
      };
      fs.writeFileSync(
        notePath(owner, envelope.id),
        JSON.stringify(envelope, null, 2),
      );
      sendJson(res, 201, envelope);
      return;
    }

    const noteMatch = pathname.match(/^\/notes\/([^/]+)$/);
    if (noteMatch && req.method === 'DELETE') {
      const file = notePath(owner, decodeURIComponent(noteMatch[1]));
      if (fs.existsSync(file)) fs.unlinkSync(file);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Server error',
    });
  }
});

fs.mkdirSync(ROOT, { recursive: true });
server.listen(PORT, () => {
  console.log(`[private-notes-proxy] listening on http://localhost:${PORT}`);
  console.log(`[private-notes-proxy] data dir: ${ROOT}`);
});
