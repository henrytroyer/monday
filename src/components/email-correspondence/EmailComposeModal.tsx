/**
 * EmailComposeModal.tsx — Re-exports reply/forward draft helpers.
 * Prefer importing from utils/emailReplyDraft or CrmEmailComposeModal.
 */

export {
  buildBlankComposeDraft,
  buildForwardDraft,
  buildReplyDraft,
  type MailboxComposeDraft,
  type MailboxComposeMode,
} from '../../utils/emailReplyDraft';

/** @deprecated use buildReplyDraft / quote in emailReplyDraft */
export function buildReplyQuote(args: {
  senderName: string;
  senderEmail: string;
  sentAt: string;
  body: string;
}): string {
  const when = new Date(args.sentAt).toLocaleString();
  return `\n\n---\nOn ${when}, ${args.senderName} <${args.senderEmail}> wrote:\n\n${args.body}`;
}

/** @deprecated use buildForwardDraft */
export function buildForwardPrefix(args: {
  subject: string;
  senderName: string;
  senderEmail: string;
  sentAt: string;
  body: string;
}): { subject: string; body: string } {
  const when = new Date(args.sentAt).toLocaleString();
  return {
    subject: args.subject.toLowerCase().startsWith('fwd:')
      ? args.subject
      : `Fwd: ${args.subject}`,
    body: `\n\n---------- Forwarded message ----------\nFrom: ${args.senderName} <${args.senderEmail}>\nDate: ${when}\nSubject: ${args.subject}\n\n${args.body}`,
  };
}
