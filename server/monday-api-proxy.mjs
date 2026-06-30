/**
 * monday.com GraphQL proxy — keeps API token server-side.
 *
 * Env: MONDAY_API_TOKEN, PORT (default 4042)
 * Run: npm run monday:proxy
 *
 * CRM: VITE_MONDAY_API_PROXY_URL=/api/monday  (via Vite dev proxy)
 */

import http from 'node:http';
import { URL } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT || 4042);
const TOKEN = process.env.MONDAY_API_TOKEN;
const MONDAY_API = 'https://api.monday.com/v2';
const API_VERSION = '2023-10';

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

async function mondayGraphql(query, variables) {
  if (!TOKEN) {
    throw new Error('Set MONDAY_API_TOKEN in environment');
  }

  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      Authorization: TOKEN,
      'Content-Type': 'application/json',
      'API-Version': API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `monday API ${res.status}`);
  }

  if (!res.ok) {
    const message =
      payload.errors?.[0]?.message ||
      payload.error_message ||
      text ||
      `monday API ${res.status}`;
    throw new Error(message);
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message || 'monday GraphQL error');
  }

  return payload;
}

function inferContentType(url, fallback = 'application/octet-stream') {
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.pdf')) return 'application/pdf';
  return fallback;
}

async function streamAssetResponse(res, publicUrl) {
  const upstream = await fetch(publicUrl);
  if (!upstream.ok) {
    sendJson(res, upstream.status, {
      error: `Asset fetch failed (${upstream.status})`,
    });
    return;
  }

  const contentType =
    upstream.headers.get('content-type') ||
    inferContentType(publicUrl);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=300',
    'Access-Control-Allow-Origin': '*',
  });

  if (upstream.body) {
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        hasToken: Boolean(TOKEN),
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/graphql') {
      const body = await readJsonBody(req);
      if (!body.query || typeof body.query !== 'string') {
        sendJson(res, 400, { error: 'query string required' });
        return;
      }
      const result = await mondayGraphql(body.query, body.variables);
      sendJson(res, 200, result);
      return;
    }

    const assetMatch = url.pathname.match(/^\/assets\/(\d+)$/);
    if (req.method === 'GET' && assetMatch) {
      const assetId = assetMatch[1];
      const result = await mondayGraphql(
        `query ($ids: [ID!]!) { assets(ids: $ids) { id public_url } }`,
        { ids: [assetId] },
      );
      const publicUrl = result.data?.assets?.[0]?.public_url;
      if (!publicUrl) {
        sendJson(res, 404, { error: 'Asset not found' });
        return;
      }
      await streamAssetResponse(res, publicUrl);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Server error',
    });
  }
});

server.listen(PORT, () => {
  console.log(`monday API proxy http://localhost:${PORT}`);
  if (!TOKEN) {
    console.warn('Warning: MONDAY_API_TOKEN not set');
  }
});
