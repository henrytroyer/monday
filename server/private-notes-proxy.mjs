/**
 * private-notes-proxy.mjs — Local org-confidential + legacy E2E private notes store.
 *
 * Org notes: AES-256-GCM with CRM_PRIVATE_NOTES_ORG_KEY (or a fixed dev key).
 * ACL: author OR X-Operator-Role rank above authorRole.
 * Legacy vault/envelopes under server/.private-notes/{uid}/ for migration.
 *
 * Env: PORT (default 4043), CRM_PRIVATE_NOTES_ORG_KEY
 * Run: npm run private-notes:proxy
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 4043);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '.private-notes');
const ORG_FILE = path.join(ROOT, '_org-notes.json');

const ROLE_HIERARCHY = {
  ceo: 9,
  cfo: 8,
  super_admin: 7,
  board_member: 6,
  field_director: 5,
  finance_team: 4,
  admin: 3,
  pr: 2,
  user: 1,
};

function roleRank(role) {
  const n = String(role || '')
    .trim()
    .toLowerCase();
  return ROLE_HIERARCHY[n] ?? 1;
}

function isRoleAbove(viewer, author) {
  return roleRank(viewer) > roleRank(author);
}

function orgKeyBytes() {
  const raw = String(process.env.CRM_PRIVATE_NOTES_ORG_KEY || 'dev-private-notes-org-key').trim();
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

function encryptBody(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', orgKeyBytes(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    ciphertext: Buffer.concat([enc, tag]).toString('base64'),
  };
}

function decryptBody(ivB64, cipherB64) {
  const iv = Buffer.from(ivB64, 'base64');
  const buf = Buffer.from(cipherB64, 'base64');
  const tag = buf.subarray(buf.length - 16);
  const data = buf.subarray(0, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', orgKeyBytes(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Owner-Uid, X-Operator-Role',
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

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readOrgNotes() {
  try {
    if (!fs.existsSync(ORG_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(ORG_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOrgNotes(notes) {
  ensureDir(ROOT);
  fs.writeFileSync(ORG_FILE, JSON.stringify(notes, null, 2));
}

function header(req, name) {
  const v = req.headers[name.toLowerCase()];
  return String(Array.isArray(v) ? v[0] : v || '').trim();
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, '');
    return;
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  try {
    if (req.method === 'GET' && (pathname === '/health' || pathname === '/')) {
      sendJson(res, 200, { ok: true, mode: 'org-confidential-local' });
      return;
    }

    const ownerUid = header(req, 'x-owner-uid');
    const operatorRole = header(req, 'x-operator-role') || 'user';

    // Legacy vault
    if (pathname === '/vault') {
      if (!ownerUid) {
        sendJson(res, 401, { error: 'Missing X-Owner-Uid' });
        return;
      }
      const dir = ownerDir(ownerUid);
      const vaultPath = path.join(dir, 'vault.json');
      if (req.method === 'GET') {
        if (!fs.existsSync(vaultPath)) {
          sendJson(res, 404, { error: 'No vault' });
          return;
        }
        sendJson(res, 200, JSON.parse(fs.readFileSync(vaultPath, 'utf8')));
        return;
      }
      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        ensureDir(dir);
        const record = { ...body, ownerUid, updatedAt: new Date().toISOString() };
        fs.writeFileSync(vaultPath, JSON.stringify(record, null, 2));
        sendJson(res, 200, record);
        return;
      }
    }

    // Legacy notes
    if (pathname === '/legacy/notes' || pathname.startsWith('/legacy/notes/')) {
      if (!ownerUid) {
        sendJson(res, 401, { error: 'Missing X-Owner-Uid' });
        return;
      }
      const dir = ownerDir(ownerUid);
      const notesPath = path.join(dir, 'notes.json');
      const readNotes = () => {
        try {
          if (!fs.existsSync(notesPath)) return [];
          const parsed = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };
      const writeNotes = (notes) => {
        ensureDir(dir);
        fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));
      };

      if (pathname === '/legacy/notes' && req.method === 'GET') {
        const contactId = url.searchParams.get('contactId') || '';
        let notes = readNotes();
        if (contactId) notes = notes.filter((n) => n.contactId === contactId);
        sendJson(res, 200, { notes });
        return;
      }
      if (pathname === '/legacy/notes' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const notes = readNotes();
        notes.push({ ...body, ownerUid });
        writeNotes(notes);
        sendJson(res, 201, { ...body, ownerUid });
        return;
      }
      const m = pathname.match(/^\/legacy\/notes\/([^/]+)$/);
      if (m && req.method === 'DELETE') {
        const noteId = decodeURIComponent(m[1]);
        writeNotes(readNotes().filter((n) => n.id !== noteId));
        sendJson(res, 200, { ok: true });
        return;
      }
    }

    // Org notes
    if (!ownerUid) {
      sendJson(res, 401, { error: 'Missing X-Owner-Uid' });
      return;
    }

    if (pathname === '/notes' && req.method === 'GET') {
      const contactId = url.searchParams.get('contactId') || '';
      if (!contactId) {
        sendJson(res, 400, { error: 'contactId required' });
        return;
      }
      const out = [];
      for (const row of readOrgNotes()) {
        if (row.contactId !== contactId) continue;
        const canRead =
          row.authorUid === ownerUid ||
          isRoleAbove(operatorRole, row.authorRole);
        if (!canRead) continue;
        try {
          const plain = JSON.parse(decryptBody(row.iv, row.ciphertext));
          out.push({
            id: row.id,
            authorUid: row.authorUid,
            authorName: row.authorName,
            authorRole: row.authorRole,
            authorRank: row.authorRank ?? roleRank(row.authorRole),
            contactId: row.contactId,
            createdAt: row.createdAt,
            body: plain.body,
            source: plain.source || 'contact',
            sourceLabel: plain.sourceLabel || 'Contact',
            timelineId: plain.timelineId,
            applicationItemId: plain.applicationItemId,
            recruitmentProspectId: plain.recruitmentProspectId,
            canEdit: row.authorUid === ownerUid,
          });
        } catch {
          // skip bad rows
        }
      }
      out.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      sendJson(res, 200, { notes: out });
      return;
    }

    if (pathname === '/notes' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const contactId = String(body.contactId || '').trim();
      const noteBody = String(body.body || '').trim();
      if (!contactId || !noteBody) {
        sendJson(res, 400, { error: 'contactId and body required' });
        return;
      }
      const id =
        String(body.id || '').trim() ||
        `pn-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const createdAt = body.createdAt || new Date().toISOString();
      const authorName = String(body.authorName || 'Coordinator').trim();
      const plain = {
        body: noteBody,
        source: body.source || 'contact',
        sourceLabel: body.sourceLabel || 'Contact',
        timelineId: body.timelineId,
        applicationItemId: body.applicationItemId,
        recruitmentProspectId: body.recruitmentProspectId,
      };
      const cipher = encryptBody(JSON.stringify(plain));
      const record = {
        id,
        authorUid: ownerUid,
        authorName,
        authorRole: operatorRole,
        authorRank: roleRank(operatorRole),
        contactId,
        createdAt,
        alg: 'AES-256-GCM',
        iv: cipher.iv,
        ciphertext: cipher.ciphertext,
      };
      const notes = readOrgNotes();
      notes.push(record);
      writeOrgNotes(notes);
      sendJson(res, 201, {
        id,
        authorUid: ownerUid,
        authorName,
        authorRole: operatorRole,
        authorRank: roleRank(operatorRole),
        contactId,
        createdAt,
        body: noteBody,
        source: plain.source,
        sourceLabel: plain.sourceLabel,
        timelineId: plain.timelineId,
        applicationItemId: plain.applicationItemId,
        recruitmentProspectId: plain.recruitmentProspectId,
        canEdit: true,
      });
      return;
    }

    const del = pathname.match(/^\/notes\/([^/]+)$/);
    if (del && req.method === 'DELETE') {
      const noteId = decodeURIComponent(del[1]);
      const notes = readOrgNotes();
      const existing = notes.find((n) => n.id === noteId);
      if (!existing) {
        sendJson(res, 404, { error: 'Not found' });
        return;
      }
      if (existing.authorUid !== ownerUid) {
        sendJson(res, 403, { error: 'Only the author can delete' });
        return;
      }
      writeOrgNotes(notes.filter((n) => n.id !== noteId));
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

ensureDir(ROOT);
server.listen(PORT, () => {
  console.log(`[private-notes-proxy] listening on http://127.0.0.1:${PORT}`);
});
