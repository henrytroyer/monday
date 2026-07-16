import { isLikelyHtmlBody, sanitizeEmailHtml } from './sanitizeEmailHtml';

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Convert monday update HTML to plain text while keeping paragraph breaks. */
export function htmlToPlainPreservingBreaks(html: string): string {
  let text = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<\s*\/div\s*>/gi, '\n')
    .replace(/<\s*\/li\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<\s*hr\s*\/?>/gi, '\n\n—\n\n')
    .replace(/<[^>]+>/g, '');

  text = decodeBasicEntities(text);

  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface MondayNoteBodyContent {
  body: string;
  bodyHtml?: string;
}

/** Normalize a monday.com update for storage and display. */
export function mondayUpdateToNoteBody(text: string): MondayNoteBodyContent {
  const trimmed = text.trim();
  if (!trimmed) return { body: '' };

  if (isLikelyHtmlBody(trimmed)) {
    const body = htmlToPlainPreservingBreaks(trimmed);
    const bodyHtml = sanitizeEmailHtml(trimmed);
    return {
      body: body || bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      ...(bodyHtml ? { bodyHtml } : {}),
    };
  }

  return { body: trimmed.replace(/\r\n/g, '\n') };
}

/** Improve readability for legacy notes stored as one long line. */
export function normalizeNoteBodyForDisplay(body: string): string {
  const trimmed = body.trim();
  if (!trimmed || trimmed.includes('\n')) return trimmed;

  if (trimmed.length > 60) {
    return trimmed.replace(/([.!?])\s+(?=[A-Z0-9"'])/g, '$1\n\n');
  }

  return trimmed;
}
