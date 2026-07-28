import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildBlankComposeDraft,
  buildForwardDraft,
  buildReplyDraft,
} from './emailReplyDraft';

describe('emailReplyDraft', () => {
  it('builds reply to inbound sender with Re: subject and quote', () => {
    const draft = buildReplyDraft({
      mode: 'reply',
      subject: 'Welcome',
      senderName: 'Alex',
      senderEmail: 'alex@example.com',
      sentAt: '2026-07-01T12:00:00.000Z',
      textBody: 'Hello there',
      toRecipients: [{ email: 'info@i58global.org' }],
      contactEmail: 'alex@example.com',
      direction: 'inbound',
      itemId: 'item-1',
    });
    assert.equal(draft.mode, 'reply');
    assert.equal(draft.to, 'alex@example.com');
    assert.equal(draft.subject, 'Re: Welcome');
    assert.match(draft.bodyHtml, /Hello there|blockquote/i);
    assert.equal(draft.itemId, 'item-1');
  });

  it('does not double Re: prefix', () => {
    const draft = buildReplyDraft({
      mode: 'reply',
      subject: 'Re: Welcome',
      senderName: 'Alex',
      senderEmail: 'alex@example.com',
      sentAt: '2026-07-01T12:00:00.000Z',
      textBody: 'Hi',
      toRecipients: [{ email: 'info@i58global.org' }],
      contactEmail: 'alex@example.com',
      direction: 'inbound',
    });
    assert.equal(draft.subject, 'Re: Welcome');
  });

  it('builds forward draft with empty To', () => {
    const draft = buildForwardDraft({
      subject: 'Packing list',
      senderName: 'Coord',
      senderEmail: 'info@i58global.org',
      sentAt: '2026-07-01T12:00:00.000Z',
      textBody: 'Bring boots',
    });
    assert.equal(draft.mode, 'forward');
    assert.equal(draft.to, '');
    assert.equal(draft.subject, 'Fwd: Packing list');
    assert.match(draft.bodyHtml, /Forwarded message/);
  });

  it('builds blank compose draft', () => {
    const draft = buildBlankComposeDraft({
      to: 'alex@example.com',
      itemId: 'c1',
    });
    assert.equal(draft.mode, 'compose');
    assert.equal(draft.to, 'alex@example.com');
    assert.equal(draft.itemId, 'c1');
  });
});
