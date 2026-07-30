/**
 * sendCrmEmail.ts — Send mail through the monday API proxy (/email/send).
 */

import {
  getMondayProxyAuthToken,
  getMondayProxyBaseOverride,
} from './mondayProxyAuth';

export interface SendCrmEmailParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  /** HTML body from the TipTap composer */
  html: string;
  text?: string;
  /** Override From address (must be allowed by provider) */
  from?: string;
  replyTo?: string;
  /** monday item to log an Outgoing Email update on */
  itemId?: string;
}

export interface SendCrmEmailResult {
  ok: true;
  provider: string;
  id: string | null;
  mondayUpdateId: string | null;
  from: string;
}

export interface EmailSendStatus {
  configured: boolean;
  provider: 'resend' | 'smtp' | null;
  from: string;
}

function resolveProxyBase(): string {
  const override = getMondayProxyBaseOverride();
  if (override) return override;
  const fromEnv = (import.meta.env.VITE_MONDAY_API_PROXY_URL as string | undefined)
    ?.trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  throw new Error(
    'Monday API proxy is not configured (VITE_MONDAY_API_PROXY_URL).',
  );
}

async function proxyFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const base = resolveProxyBase();
  const idToken = await getMondayProxyAuthToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  try {
    return await fetch(`${base}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(45_000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error(
        'Could not reach monday API proxy. Run `npm run monday:proxy` (or `npm run dev:live`).',
      );
    }
    if (err instanceof TypeError) {
      throw new Error(
        'Could not reach monday API proxy. Run `npm run monday:proxy` (or `npm run dev:live`).',
      );
    }
    throw err;
  }
}

export async function fetchEmailSendStatus(): Promise<EmailSendStatus> {
  const res = await proxyFetch('/email/status');
  const body = (await res.json()) as EmailSendStatus & { error?: string };
  if (!res.ok) {
    throw new Error(body.error || `Email status ${res.status}`);
  }
  return body;
}

export async function sendCrmEmail(
  params: SendCrmEmailParams,
): Promise<SendCrmEmailResult> {
  try {
    const status = await fetchEmailSendStatus();
    if (!status.configured) {
      throw new Error(
        'Outbound email is not configured on the monday API proxy. Set RESEND_API_KEY or SMTP_* on the proxy, then retry.',
      );
    }
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes('Outbound email is not configured')
    ) {
      throw err;
    }
    // Status endpoint may be unavailable on older proxies — continue to /email/send.
  }

  const res = await proxyFetch('/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject: params.subject,
      html: params.html,
      text: params.text,
      from: params.from,
      replyTo: params.replyTo,
      itemId: params.itemId,
    }),
  });

  const body = (await res.json()) as SendCrmEmailResult & { error?: string };
  if (!res.ok || body.error) {
    const message = body.error || `Send failed (${res.status})`;
    if (/not configured|RESEND|SMTP/i.test(message)) {
      throw new Error(
        `${message} Configure RESEND_API_KEY or SMTP_* on the monday API proxy (local + Cloud Function).`,
      );
    }
    throw new Error(message);
  }
  return body;
}
