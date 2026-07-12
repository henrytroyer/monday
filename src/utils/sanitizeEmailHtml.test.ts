import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isLikelyHtmlBody, sanitizeEmailHtml } from './sanitizeEmailHtml.ts';

describe('sanitizeEmailHtml', () => {
  it('keeps safe formatting tags', () => {
    const html =
      '<p>Hello <strong>team</strong></p><p><a href="https://example.com">Link</a></p>';
    const sanitized = sanitizeEmailHtml(html);
    assert.match(sanitized, /<p>Hello <strong>team<\/strong><\/p>/);
    assert.match(sanitized, /href="https:\/\/example.com"/);
  });

  it('removes scripts and inline handlers', () => {
    const html =
      '<p onclick="alert(1)">Hi</p><script>alert(1)</script><iframe src="x"></iframe>';
    const sanitized = sanitizeEmailHtml(html);
    assert.doesNotMatch(sanitized, /script|iframe|onclick/i);
    assert.match(sanitized, /Hi/);
  });

  it('detects html bodies', () => {
    assert.equal(isLikelyHtmlBody('<div>Hello</div>'), true);
    assert.equal(isLikelyHtmlBody('Hello there'), false);
  });
});
