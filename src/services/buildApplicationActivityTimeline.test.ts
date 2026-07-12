import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApplicationActivityTimeline } from './buildApplicationActivityTimeline.ts';

describe('buildApplicationActivityTimeline', () => {
  it('merges notes, emails, and created events newest first', () => {
    const events = buildApplicationActivityTimeline({
      termNotes: [
        {
          id: 'n1',
          itemId: '1',
          timelineId: 'summer',
          body: 'Called volunteer',
          createdAt: '2026-03-01T10:00:00.000Z',
          authorName: 'Sarah Chen',
        },
      ],
      emails: [
        {
          id: 'e1',
          contactId: 'c1',
          direction: 'outbound',
          senderName: 'Coordinator',
          senderEmail: 'info@i58global.org',
          recipientName: '—',
          recipientEmail: 'volunteer@example.com',
          subject: 'Welcome',
          body: 'Hello',
          sentAt: '2026-03-02T10:00:00.000Z',
          source: 'application',
          sourceLabel: 'Summer 2026',
        },
      ],
      itemCreatedAt: '2026-02-01T08:00:00.000Z',
    });

    assert.equal(events.length, 3);
    assert.equal(events[0]?.summary, 'Email sent — “Welcome”');
    assert.equal(events[1]?.summary, 'Internal note added');
    assert.equal(events[1]?.actorName, 'Sarah Chen');
    assert.equal(events[2]?.summary, 'Application created');
  });
});
