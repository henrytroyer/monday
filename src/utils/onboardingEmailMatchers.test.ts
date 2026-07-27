import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactEmailMessage } from '../types/contact';
import { findFirstOutboundEmailDate } from './onboardingEmailMatchers';

function outboundMessage(
  partial: Partial<ContactEmailMessage> & Pick<ContactEmailMessage, 'subject'>,
): ContactEmailMessage {
  return {
    id: partial.id ?? 'msg-1',
    contactId: 'contact-1',
    direction: 'outbound',
    senderName: 'Coordinator',
    senderEmail: 'coord@example.com',
    recipientName: 'Pastor',
    recipientEmail: 'pastor@example.com',
    subject: partial.subject,
    body: partial.body ?? '',
    sentAt: partial.sentAt ?? '2026-05-01T10:00:00.000Z',
    source: 'application',
    sourceLabel: 'Summer 2026',
    templateId: partial.templateId,
  };
}

describe('findFirstOutboundEmailDate', () => {
  it('detects pastor reference email by subject', () => {
    const date = findFirstOutboundEmailDate(
      [
        outboundMessage({
          subject: 'Pastor Letter 2',
          sentAt: '2026-04-10T10:00:00.000Z',
        }),
      ],
      'pastor_reference',
    );
    assert.equal(date, '2026-04-10');
  });

  it('detects safeguarding course template', () => {
    const date = findFirstOutboundEmailDate(
      [
        outboundMessage({
          subject: 'Child Safeguarding Course',
          templateId: 'comms-child-safeguarding-course',
          sentAt: '2026-04-15T08:00:00.000Z',
        }),
      ],
      'child_safeguarding',
    );
    assert.equal(date, '2026-04-15');
  });

  it('detects Sterling background check email', () => {
    const date = findFirstOutboundEmailDate(
      [
        outboundMessage({
          subject: 'Sterling Volunteers invitation',
          body: 'Complete your background check',
          sentAt: '2026-04-20T12:00:00.000Z',
        }),
      ],
      'background_check',
    );
    assert.equal(date, '2026-04-20');
  });

  it('ignores inbound messages', () => {
    const date = findFirstOutboundEmailDate(
      [
        {
          ...outboundMessage({ subject: 'Pastor Letter 2' }),
          direction: 'inbound',
        },
      ],
      'pastor_reference',
    );
    assert.equal(date, undefined);
  });
});
