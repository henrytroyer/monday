import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  htmlToPlainPreservingBreaks,
  mondayUpdateToNoteBody,
  normalizeNoteBodyForDisplay,
} from './formatMondayNoteBody';

describe('formatMondayNoteBody', () => {
  it('preserves paragraph breaks from HTML', () => {
    const plain = htmlToPlainPreservingBreaks(
      '<p>First paragraph.</p><p>Second paragraph.</p>',
    );
    assert.match(plain, /First paragraph/);
    assert.match(plain, /Second paragraph/);
    assert.ok(plain.includes('\n'));
  });

  it('stores sanitized html for rich display', () => {
    const result = mondayUpdateToNoteBody(
      '<p>Hello</p><p>Follow up needed.</p>',
    );
    assert.match(result.body, /Hello/);
    assert.match(result.bodyHtml ?? '', /<p>/);
  });

  it('splits legacy one-line notes into sentences', () => {
    const formatted = normalizeNoteBodyForDisplay(
      'Met with volunteer today. They confirmed travel dates. Will follow up next week.',
    );
    assert.ok(formatted.includes('\n'));
  });
});
