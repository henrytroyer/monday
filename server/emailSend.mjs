/**
 * emailSend.mjs — Outbound email via Resend or SMTP (Gmail app password).
 * Used by monday-api-proxy POST /email/send.
 *
 * Env (one of):
 *   RESEND_API_KEY + EMAIL_FROM_ADDRESS
 *   SMTP_HOST + SMTP_USER + SMTP_PASS + EMAIL_FROM_ADDRESS
 */

import nodemailer from 'nodemailer';

const DEFAULT_FROM = 'info@i58global.org';

export function getEmailFromAddress() {
  return (process.env.EMAIL_FROM_ADDRESS || DEFAULT_FROM).trim();
}

export function getEmailFromName() {
  return (process.env.EMAIL_FROM_NAME || 'i58 Global').trim();
}

export function isEmailSendConfigured() {
  if (process.env.RESEND_API_KEY?.trim()) return true;
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

export function emailSendConfigStatus() {
  return {
    configured: isEmailSendConfigured(),
    provider: process.env.RESEND_API_KEY?.trim()
      ? 'resend'
      : process.env.SMTP_HOST?.trim()
        ? 'smtp'
        : null,
    from: getEmailFromAddress(),
  };
}

function splitAddresses(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return String(value)
    .split(/[,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function sendViaResend({ from, to, cc, bcc, subject, html, text, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY.trim();
  const payload = {
    from,
    to,
    subject,
    html,
    text: text || htmlToText(html),
  };
  if (cc.length) payload.cc = cc;
  if (bcc.length) payload.bcc = bcc;
  if (replyTo) payload.reply_to = replyTo;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || body.error || `Resend error ${res.status}`);
  }
  return { provider: 'resend', id: body.id || null };
}

async function sendViaSmtp({ from, to, cc, bcc, subject, html, text, replyTo }) {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === 'true' || port === 465;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST.trim(),
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from,
    to: to.join(', '),
    cc: cc.length ? cc.join(', ') : undefined,
    bcc: bcc.length ? bcc.join(', ') : undefined,
    subject,
    html,
    text: text || htmlToText(html),
    replyTo: replyTo || undefined,
  });

  return { provider: 'smtp', id: info.messageId || null };
}

/** Comma-separated domains allowed as From (default i58global.org). */
function allowedFromDomains() {
  const raw =
    process.env.EMAIL_FROM_ALLOWED_DOMAINS?.trim() || 'i58global.org';
  return new Set(
    raw
      .split(/[,;]+/)
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  );
}

function extractEmailAddress(value) {
  const raw = String(value || '').trim();
  const angle = raw.match(/<([^>]+)>/);
  return (angle?.[1] || raw).trim().toLowerCase();
}

function assertAllowedFromAddress(fromAddress) {
  const email = extractEmailAddress(fromAddress);
  const at = email.lastIndexOf('@');
  if (at < 1) {
    throw new Error(`Invalid From address: ${fromAddress}`);
  }
  const domain = email.slice(at + 1);
  if (!allowedFromDomains().has(domain)) {
    throw new Error(
      `From domain "${domain}" is not allowed. Set EMAIL_FROM_ALLOWED_DOMAINS or use an approved address.`,
    );
  }
}

const MAX_RECIPIENTS = Number(process.env.EMAIL_MAX_RECIPIENTS || 25);

/**
 * @param {{
 *   to: string|string[],
 *   cc?: string|string[],
 *   bcc?: string|string[],
 *   subject: string,
 *   html: string,
 *   text?: string,
 *   from?: string,
 *   replyTo?: string,
 * }} input
 */
export async function sendOutboundEmail(input) {
  if (!isEmailSendConfigured()) {
    throw new Error(
      'Email send is not configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS (and EMAIL_FROM_ADDRESS) on the monday proxy.',
    );
  }

  const to = splitAddresses(input.to);
  if (!to.length) throw new Error('At least one recipient (to) is required');
  const subject = String(input.subject || '').trim();
  if (!subject) throw new Error('Subject is required');
  const html = String(input.html || '').trim();
  if (!html) throw new Error('Email body is required');

  const fromAddress = (input.from || getEmailFromAddress()).trim();
  assertAllowedFromAddress(fromAddress);
  const fromName = getEmailFromName();
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
  const cc = splitAddresses(input.cc);
  const bcc = splitAddresses(input.bcc);
  const recipientCount = to.length + cc.length + bcc.length;
  if (recipientCount > MAX_RECIPIENTS) {
    throw new Error(
      `Too many recipients (${recipientCount}). Max is ${MAX_RECIPIENTS}.`,
    );
  }
  const text = input.text ? String(input.text) : undefined;
  const replyTo = input.replyTo?.trim() || undefined;

  if (process.env.RESEND_API_KEY?.trim()) {
    return sendViaResend({ from, to, cc, bcc, subject, html, text, replyTo });
  }
  return sendViaSmtp({ from, to, cc, bcc, subject, html, text, replyTo });
}

/** monday update body shaped like SuperMail / Outgoing Email logs. */
export function buildOutgoingEmailUpdateBody({
  from,
  to,
  subject,
  html,
  sentAt = new Date(),
}) {
  const when = sentAt.toUTCString().replace('GMT', 'UTC');
  const safeSubject = String(subject || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeFrom = String(from || getEmailFromAddress())
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const toList = splitAddresses(to).join(', ') || String(to);
  const safeTo = String(toList).replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return (
    `<span><u><b>Outgoing Email</b></u></span><br><br>` +
    `<span><b>Sent at:</b> ${when}<br>` +
    `<span><b>from:</b> <a>${safeFrom}</a><br>` +
    `<span><b>to:</b> <a>${safeTo}</a></span><br>` +
    `<span><b>Subject:</b> ${safeSubject}</span><br>` +
    `<span><b>Body:</b></span><br>${html}`
  );
}
