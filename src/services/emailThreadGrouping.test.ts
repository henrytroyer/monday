import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactEmailMessage } from '../types/contact';
import {
  filterThreadsByApplication,
  groupContactEmailMessagesIntoThreads,
  normalizeEmailSubject,
} from './emailThreadGrouping';
import {
  emailTrackingStatusLabel,
  resolveEmailTrackingDisplayStatus,
} from './emailTrackingStatus';
import type { EmailMessage } from '../types/emailThread';

function msg(
  partial: Partial<ContactEmailMessage> &
    Pick<ContactEmailMessage, 'id' | 'subject' | 'direction' | 'sentAt'>,
): ContactEmailMessage {
  return {
    contactId: 'c1',
    senderName: 'Sender',
    senderEmail: 'sender@example.com',
    recipientName: 'Recv',
    recipientEmail: 'recv@example.com',
    body: 'Hello',
    source: 'application',
    sourceLabel: 'Term A',
    itemId: 'app-1',
    timelineId: 'term-a',
    ...partial,
  };
}

describe('normalizeEmailSubject', () => {
  it('strips Re/Fwd prefixes', () => {
    assert.equal(normalizeEmailSubject('Re: Hello'), 'hello');
    assert.equal(normalizeEmailSubject('FW: Re: Hello'), 'hello');
    assert.equal(normalizeEmailSubject('Fwd: Trip'), 'trip');
  });
});

describe('groupContactEmailMessagesIntoThreads', () => {
  it('groups same application + subject + participants', () => {
    const threads = groupContactEmailMessagesIntoThreads(
      [
        msg({
          id: '1',
          subject: 'Safeguarding',
          direction: 'outbound',
          sentAt: '2026-01-01T10:00:00.000Z',
        }),
        msg({
          id: '2',
          subject: 'Re: Safeguarding',
          direction: 'inbound',
          sentAt: '2026-01-02T10:00:00.000Z',
          senderEmail: 'recv@example.com',
          recipientEmail: 'sender@example.com',
        }),
      ],
      { contactId: 'c1', contactName: 'Test', contactEmail: 'recv@example.com' },
    );
    assert.equal(threads.length, 1);
    assert.equal(threads[0]!.messageCount, 2);
    assert.equal(threads[0]!.applicationId, 'app-1');
  });

  it('does not merge same subject with different participants', () => {
    const threads = groupContactEmailMessagesIntoThreads(
      [
        msg({
          id: '1',
          subject: 'Hello',
          direction: 'outbound',
          sentAt: '2026-01-01T10:00:00.000Z',
          recipientEmail: 'a@example.com',
        }),
        msg({
          id: '2',
          subject: 'Hello',
          direction: 'outbound',
          sentAt: '2026-01-02T10:00:00.000Z',
          recipientEmail: 'b@example.com',
          senderEmail: 'other@example.com',
        }),
      ],
      { contactId: 'c1' },
    );
    assert.equal(threads.length, 2);
  });

  it('filters threads by application', () => {
    const threads = groupContactEmailMessagesIntoThreads(
      [
        msg({
          id: '1',
          subject: 'A',
          direction: 'outbound',
          sentAt: '2026-01-01T10:00:00.000Z',
          itemId: 'app-1',
        }),
        msg({
          id: '2',
          subject: 'B',
          direction: 'outbound',
          sentAt: '2026-01-02T10:00:00.000Z',
          itemId: 'app-2',
        }),
      ],
      { contactId: 'c1' },
    );
    const scoped = filterThreadsByApplication(threads, 'app-1');
    assert.equal(scoped.length, 1);
    assert.equal(scoped[0]!.applicationId, 'app-1');
  });
});

describe('emailTrackingStatus', () => {
  const base: EmailMessage = {
    id: 'm1',
    threadId: 't1',
    contactId: 'c1',
    direction: 'outbound',
    senderName: 'i58',
    senderEmail: 'info@i58global.org',
    toRecipients: [{ name: 'V', email: 'v@example.com' }],
    ccRecipients: [],
    bccRecipients: [],
    subject: 'Hi',
    textBody: 'Hi',
    sentAt: '2026-01-01T00:00:00.000Z',
    deliveryStatus: 'unknown',
    isAutomated: true,
    trackingEnabled: false,
    openCount: 0,
    clickCount: 0,
    attachments: [],
    links: [],
    trackingEvents: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('shows tracking disabled when not enabled', () => {
    assert.equal(
      resolveEmailTrackingDisplayStatus(base),
      'tracking_disabled',
    );
    assert.equal(
      emailTrackingStatusLabel('tracking_disabled'),
      'Tracking disabled',
    );
  });

  it('shows opened only when tracking enabled and opens recorded', () => {
    assert.equal(
      resolveEmailTrackingDisplayStatus({
        ...base,
        trackingEnabled: true,
        openCount: 2,
        firstOpenedAt: '2026-01-02T00:00:00.000Z',
        deliveryStatus: 'delivered',
      }),
      'opened',
    );
  });

  it('shows delivered_no_open when tracking enabled without opens', () => {
    assert.equal(
      resolveEmailTrackingDisplayStatus({
        ...base,
        trackingEnabled: true,
        deliveryStatus: 'delivered',
      }),
      'delivered_no_open',
    );
  });
});
