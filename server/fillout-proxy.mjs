/**
 * fillout-proxy.mjs — Server-side Fillout REST proxy (keeps API key off the client).
 *
 * Env:
 *   FILLOUT_API_KEY (required for submissions)
 *   FILLOUT_API_BASE (default https://api.fillout.com/v1/api)
 *   PORT (default 4044)
 *
 * Run: npm run fillout:proxy
 * CRM: VITE_FILLOUT_PROXY_URL=/api/fillout (Vite proxies here in DEV)
 */

import http from 'node:http';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT || 4044);
const FILLOUT_API_KEY = (process.env.FILLOUT_API_KEY || '').trim();
const FILLOUT_API_BASE = (
  process.env.FILLOUT_API_BASE || 'https://api.fillout.com/v1/api'
).replace(/\/$/, '');

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        filloutConfigured: Boolean(FILLOUT_API_KEY),
      });
      return;
    }

    const submissionsMatch = pathname.match(
      /^\/forms\/([^/]+)\/submissions$/,
    );
    if (req.method === 'GET' && submissionsMatch) {
      if (!FILLOUT_API_KEY) {
        sendJson(res, 503, {
          error:
            'FILLOUT_API_KEY is not set. Add it to .env and restart fillout:proxy.',
        });
        return;
      }

      const formId = decodeURIComponent(submissionsMatch[1]);
      const upstream = new URL(
        `${FILLOUT_API_BASE}/forms/${encodeURIComponent(formId)}/submissions`,
      );
      for (const key of ['limit', 'offset', 'afterDate', 'beforeDate', 'sort', 'status']) {
        const value = url.searchParams.get(key);
        if (value) upstream.searchParams.set(key, value);
      }
      if (!upstream.searchParams.has('sort')) {
        upstream.searchParams.set('sort', 'desc');
      }

      const upstreamRes = await fetch(upstream, {
        headers: {
          Authorization: `Bearer ${FILLOUT_API_KEY}`,
          Accept: 'application/json',
        },
      });
      const text = await upstreamRes.text();
      let body;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        sendJson(res, 502, {
          error: 'Fillout returned non-JSON',
          status: upstreamRes.status,
          body: text.slice(0, 500),
        });
        return;
      }

      if (!upstreamRes.ok) {
        sendJson(res, upstreamRes.status >= 400 ? upstreamRes.status : 502, {
          error: body?.error?.message || body?.message || 'Fillout request failed',
          fillout: body,
        });
        return;
      }

      sendJson(res, 200, body);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `Fillout proxy listening on http://localhost:${PORT} (key ${
      FILLOUT_API_KEY ? 'set' : 'MISSING'
    })`,
  );
});
