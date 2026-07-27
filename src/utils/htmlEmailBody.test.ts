import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  htmlToPlainText,
  isLikelyHtmlBody,
  plainTextToHtml,
} from './htmlEmailBody.ts';

describe('htmlEmailBody', () => {
  it('detects html bodies', () => {
    assert.equal(isLikelyHtmlBody('<p>Hello</p>'), true);
    assert.equal(isLikelyHtmlBody('Hello world'), false);
  });

  it('converts plain text paragraphs to html', () => {
    const html = plainTextToHtml('Hello\n\nSecond line');
    assert.match(html, /<p>Hello<\/p>/);
    assert.match(html, /Second line/);
  });

  it('converts html back to plain text', () => {
    const text = htmlToPlainText(
      '<p>Hello <strong>team</strong></p><p>Second paragraph</p>',
    );
    assert.match(text, /Hello team/);
    assert.match(text, /Second paragraph/);
  });
});
