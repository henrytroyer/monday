import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildBatchBccMailtoUrl,
  buildMailtoUrl,
  MAILTO_SAFE_URL_LENGTH,
} from './emailMerge';

describe('buildMailtoUrl', () => {
  it('supports BCC recipients for batch send', () => {
    const url = buildMailtoUrl('', 'Hello', '<p>Body</p>', {
      bcc: ['a@example.com', 'b@example.com'],
    });
    assert.ok(url.startsWith('mailto:?'));
    assert.ok(url.includes('bcc=a%40example.com'));
    assert.ok(url.includes('b%40example.com'));
    assert.ok(url.includes('subject=Hello'));
  });
});

describe('buildBatchBccMailtoUrl', () => {
  it('includes all recipients when the URL is short', () => {
    const result = buildBatchBccMailtoUrl(
      ['one@example.com', 'two@example.com'],
      'Hi',
      'Hello friends',
    );
    assert.equal(result.omittedCount, 0);
    assert.equal(result.includedEmails.length, 2);
    assert.ok(result.url.includes('bcc='));
  });

  it('omits recipients when the URL would exceed the safe length', () => {
    const many = Array.from(
      { length: 200 },
      (_, index) => `person${index}@verylongdomainexample.org`,
    );
    const result = buildBatchBccMailtoUrl(
      many,
      'A'.repeat(80),
      'B'.repeat(400),
    );
    assert.ok(result.includedEmails.length >= 1);
    assert.ok(result.omittedCount > 0);
    assert.ok(result.url.length <= MAILTO_SAFE_URL_LENGTH + 50);
  });
});
