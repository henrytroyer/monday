/**
 * emailReplyDraft.ts — Reply / forward draft helpers for the mailbox composer.
 */

import { plainTextToHtml } from './htmlEmailBody';

export type MailboxComposeMode = 'compose' | 'reply' | 'replyAll' | 'forward';

export interface MailboxComposeDraft {
  mode: MailboxComposeMode;
  to: string;
  cc: string;
  subject: string;
  bodyHtml: string;
  itemId?: string;
}

function ensureReSubject(subject: string): string {
  const trimmed = subject.trim();
  if (!trimmed) return 'Re:';
  return /^re\s*:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
}

function ensureFwdSubject(subject: string): string {
  const trimmed = subject.trim();
  if (!trimmed) return 'Fwd:';
  return /^(fwd|fw)\s*:/i.test(trimmed) ? trimmed : `Fwd: ${trimmed}`;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function quoteHtml(args: {
  senderName: string;
  senderEmail: string;
  sentAt: string;
  bodyHtml?: string;
  textBody: string;
}): string {
  const when = formatWhen(args.sentAt);
  const inner =
    args.bodyHtml?.trim() ||
    plainTextToHtml(args.textBody || '');
  return (
    `<p><br></p>` +
    `<blockquote style="margin:0;padding-left:12px;border-left:2px solid #c4b5a0;color:#5c5346">` +
    `<p style="margin:0 0 8px">On ${when}, ${escapeHtml(args.senderName)} ` +
    `&lt;${escapeHtml(args.senderEmail)}&gt; wrote:</p>` +
    `${inner}` +
    `</blockquote>`
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildReplyDraft(input: {
  mode: 'reply' | 'replyAll';
  subject: string;
  senderName: string;
  senderEmail: string;
  sentAt: string;
  textBody: string;
  bodyHtml?: string;
  toRecipients: Array<{ email: string }>;
  ccRecipients?: Array<{ email: string }>;
  contactEmail: string;
  direction: 'inbound' | 'outbound';
  itemId?: string;
}): MailboxComposeDraft {
  const contact = input.contactEmail.trim().toLowerCase();
  const replyTo =
    input.direction === 'inbound'
      ? input.senderEmail
      : input.toRecipients[0]?.email || input.contactEmail;

  let cc = '';
  if (input.mode === 'replyAll') {
    const emails = new Set<string>();
    for (const r of input.toRecipients) {
      const e = r.email.trim().toLowerCase();
      if (e && e !== contact && e !== replyTo.trim().toLowerCase()) {
        emails.add(r.email.trim());
      }
    }
    for (const r of input.ccRecipients ?? []) {
      const e = r.email.trim().toLowerCase();
      if (e && e !== contact && e !== replyTo.trim().toLowerCase()) {
        emails.add(r.email.trim());
      }
    }
    if (
      input.direction === 'inbound' &&
      input.senderEmail &&
      input.senderEmail.toLowerCase() !== replyTo.trim().toLowerCase()
    ) {
      // already in To
    }
    cc = [...emails].join(', ');
  }

  return {
    mode: input.mode,
    to: replyTo,
    cc,
    subject: ensureReSubject(input.subject),
    bodyHtml: quoteHtml({
      senderName: input.senderName,
      senderEmail: input.senderEmail,
      sentAt: input.sentAt,
      bodyHtml: input.bodyHtml,
      textBody: input.textBody,
    }),
    itemId: input.itemId,
  };
}

export function buildForwardDraft(input: {
  subject: string;
  senderName: string;
  senderEmail: string;
  sentAt: string;
  textBody: string;
  bodyHtml?: string;
  itemId?: string;
}): MailboxComposeDraft {
  const when = formatWhen(input.sentAt);
  const inner =
    input.bodyHtml?.trim() || plainTextToHtml(input.textBody || '');
  return {
    mode: 'forward',
    to: '',
    cc: '',
    subject: ensureFwdSubject(input.subject),
    bodyHtml:
      `<p><br></p>` +
      `<p>---------- Forwarded message ----------<br>` +
      `From: ${escapeHtml(input.senderName)} &lt;${escapeHtml(input.senderEmail)}&gt;<br>` +
      `Date: ${escapeHtml(when)}<br>` +
      `Subject: ${escapeHtml(input.subject)}</p>` +
      `${inner}`,
    itemId: input.itemId,
  };
}

export function buildBlankComposeDraft(input: {
  to: string;
  itemId?: string;
}): MailboxComposeDraft {
  return {
    mode: 'compose',
    to: input.to,
    cc: '',
    subject: '',
    bodyHtml: '<p><br></p>',
    itemId: input.itemId,
  };
}
