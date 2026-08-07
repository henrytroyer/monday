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
import {
  buildOutgoingEmailUpdateBody,
  emailSendConfigStatus,
  getEmailFromAddress,
  sendOutboundEmail,
} from './emailSend.mjs';

dotenv.config();

const PORT = Number(process.env.PORT || 4042);
const TOKEN = process.env.MONDAY_API_TOKEN;
const MONDAY_API = 'https://api.monday.com/v2';
const API_VERSION = '2025-01';

async function extractTextFromAssetBuffer(buffer) {
  if (buffer.subarray(0, 5).toString() === '%PDF-') {
    const { PDFParse } = await import('pdf-parse');
    // pdf-parse rejects Node Buffer; always pass a plain Uint8Array copy.
    const data = new Uint8Array(buffer);
    const parser = new PDFParse({ data });
    try {
      const parsed = await parser.getText();
      return parsed.text?.trim() ?? '';
    } finally {
      await parser.destroy?.();
    }
  }

  return buffer.toString('utf8').trim();
}

async function fetchAssetBuffer(assetId) {
  const result = await mondayGraphql(
    `query ($ids: [ID!]!) { assets(ids: $ids) { id public_url } }`,
    { ids: [assetId] },
  );
  const publicUrl = result.data?.assets?.[0]?.public_url;
  if (!publicUrl) {
    throw new Error(`Asset ${assetId} not found`);
  }

  const upstream = await fetch(publicUrl);
  if (!upstream.ok) {
    throw new Error(`Asset fetch failed (${upstream.status})`);
  }

  return Buffer.from(await upstream.arrayBuffer());
}

async function mergePdfBuffers(buffers) {
  const { PDFDocument } = await import('pdf-lib');
  const merged = await PDFDocument.create();

  for (const buffer of buffers) {
    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const doc = await PDFDocument.load(data, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
  }

  return Buffer.from(await merged.save());
}

function sendJson(res, status, data) {
  if (res.headersSent) return;
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Crm-Operator-Email',
  });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  if (res.headersSent) {
    res.end();
    return;
  }
  sendJson(res, status, { error: message });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

async function mondayGraphql(query, variables, apiVersion = API_VERSION) {
  if (!TOKEN) {
    throw new Error('Set MONDAY_API_TOKEN in environment');
  }

  const version =
    typeof apiVersion === 'string' && apiVersion.trim()
      ? apiVersion.trim()
      : API_VERSION;

  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      Authorization: TOKEN,
      'Content-Type': 'application/json',
      'API-Version': version,
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

  try {
    if (upstream.body) {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      sendError(res, 500, err instanceof Error ? err.message : 'Asset stream failed');
    } else {
      res.destroy();
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        hasToken: Boolean(TOKEN),
        email: emailSendConfigStatus(),
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/email/status') {
      sendJson(res, 200, emailSendConfigStatus());
      return;
    }

    if (req.method === 'POST' && pathname === '/email/send') {
      const body = await readJsonBody(req);
      const result = await sendOutboundEmail({
        to: body.to,
        cc: body.cc,
        bcc: body.bcc,
        subject: body.subject,
        html: body.html,
        text: body.text,
        from: body.from,
        replyTo: body.replyTo,
      });

      let mondayUpdateId = null;
      const itemId = body.itemId != null ? String(body.itemId).trim() : '';
      if (itemId && TOKEN) {
        try {
          const fromAddress =
            (typeof body.from === 'string' && body.from.trim()) ||
            getEmailFromAddress();
          const updateBody = buildOutgoingEmailUpdateBody({
            from: fromAddress,
            to: body.to,
            subject: body.subject,
            html: body.html,
          });
          const logged = await mondayGraphql(
            `mutation ($itemId: ID!, $body: String!) {
              create_update(item_id: $itemId, body: $body) { id }
            }`,
            { itemId, body: updateBody },
          );
          mondayUpdateId = logged.data?.create_update?.id ?? null;
        } catch (logErr) {
          console.warn(
            'Email sent but monday log failed:',
            logErr instanceof Error ? logErr.message : logErr,
          );
        }
      }

      sendJson(res, 200, {
        ok: true,
        ...result,
        mondayUpdateId,
        from: getEmailFromAddress(),
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/graphql') {
      const body = await readJsonBody(req);
      if (!body.query || typeof body.query !== 'string') {
        sendJson(res, 400, { error: 'query string required' });
        return;
      }
      const result = await mondayGraphql(
        body.query,
        body.variables,
        body.apiVersion,
      );
      sendJson(res, 200, result);
      return;
    }

    // Upload a file to a monday.com file column (CRM ↔ Monday bidirectional files).
    if (req.method === 'POST' && pathname === '/assets/upload') {
      if (!TOKEN) {
        sendJson(res, 500, { error: 'Set MONDAY_API_TOKEN in environment' });
        return;
      }
      const body = await readJsonBody(req);
      const itemId = body.itemId != null ? String(body.itemId).trim() : '';
      const columnId = body.columnId != null ? String(body.columnId).trim() : '';
      const fileName =
        (typeof body.fileName === 'string' && body.fileName.trim()) ||
        'upload.bin';
      const contentType =
        (typeof body.contentType === 'string' && body.contentType.trim()) ||
        'application/octet-stream';
      const base64 =
        typeof body.base64 === 'string' ? body.base64.replace(/^data:[^;]+;base64,/, '') : '';
      if (!itemId || !columnId || !base64) {
        sendJson(res, 400, {
          error: 'itemId, columnId, and base64 are required',
        });
        return;
      }
      const fileBuffer = Buffer.from(base64, 'base64');
      if (fileBuffer.length === 0) {
        sendJson(res, 400, { error: 'Empty file' });
        return;
      }
      if (fileBuffer.length > 25 * 1024 * 1024) {
        sendJson(res, 400, { error: 'File too large (max 25MB)' });
        return;
      }

      const query = `mutation ($file: File!) {
        add_file_to_column(item_id: ${JSON.stringify(itemId)}, column_id: ${JSON.stringify(columnId)}, file: $file) {
          id
          name
          url
        }
      }`;
      const form = new FormData();
      form.append('query', query);
      form.append('map', JSON.stringify({ file: 'variables.file' }));
      form.append(
        'file',
        new Blob([fileBuffer], { type: contentType }),
        fileName,
      );

      const upstream = await fetch(`${MONDAY_API}/file`, {
        method: 'POST',
        headers: {
          Authorization: TOKEN,
          'API-Version': API_VERSION,
        },
        body: form,
      });
      const text = await upstream.text();
      let payload;
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        sendJson(res, 502, { error: text || 'Invalid monday file response' });
        return;
      }
      if (!upstream.ok || payload.errors?.length) {
        sendJson(res, upstream.ok ? 400 : upstream.status, {
          error:
            payload.errors?.[0]?.message ||
            payload.error_message ||
            text ||
            'File upload failed',
        });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        asset: payload.data?.add_file_to_column ?? null,
      });
      return;
    }

    const assetMatch = pathname.match(/^\/assets\/(\d+)$/);
    const assetTextMatch = pathname.match(/^\/assets\/(\d+)\/text$/);
    const assetMergePathMatch = pathname.match(/^\/assets\/merge\/([\d,]+)$/);

    if (
      req.method === 'GET' &&
      (pathname === '/assets/merge' || assetMergePathMatch)
    ) {
      const ids = assetMergePathMatch
        ? assetMergePathMatch[1]
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
        : (url.searchParams.get('ids') ?? '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);

      if (ids.length < 2) {
        sendJson(res, 400, { error: 'At least 2 asset ids required' });
        return;
      }
      if (ids.length > 10) {
        sendJson(res, 400, { error: 'Too many assets to merge' });
        return;
      }

      const buffers = await Promise.all(ids.map((id) => fetchAssetBuffer(id)));
      const pdfBuffers = buffers.filter(
        (buffer) => buffer.subarray(0, 5).toString() === '%PDF-',
      );

      if (pdfBuffers.length === 0) {
        sendJson(res, 400, { error: 'No PDF assets to merge' });
        return;
      }

      const merged = await mergePdfBuffers(pdfBuffers);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="Itinerary.pdf"',
        'Cache-Control': 'private, max-age=300',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(merged);
      return;
    }

    if (req.method === 'GET' && assetTextMatch) {
      const assetId = assetTextMatch[1];
      const result = await mondayGraphql(
        `query ($ids: [ID!]!) { assets(ids: $ids) { id public_url } }`,
        { ids: [assetId] },
      );
      const publicUrl = result.data?.assets?.[0]?.public_url;
      if (!publicUrl) {
        sendJson(res, 404, { error: 'Asset not found' });
        return;
      }

      const upstream = await fetch(publicUrl);
      if (!upstream.ok) {
        sendJson(res, upstream.status, {
          error: `Asset fetch failed (${upstream.status})`,
        });
        return;
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      const text = await extractTextFromAssetBuffer(buffer);

      sendJson(res, 200, { text });
      return;
    }

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
    if (err?.statusCode === 403 && err?.body) {
      sendJson(res, 403, err.body);
      return;
    }
    sendError(
      res,
      err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500,
      err instanceof Error ? err.message : 'Server error',
    );
  }
});

server.listen(PORT, () => {
  console.log(`monday API proxy http://localhost:${PORT}`);
  if (!TOKEN) {
    console.warn('Warning: MONDAY_API_TOKEN not set');
  }
});
