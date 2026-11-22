import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER, previewStatusForNewAccount } from '../mock/fixtures.ts';
import {
  flaggedNotificationCount,
  flaggedNotifications,
  formatNotificationDate,
  isNotificationFlagged,
  notificationRollDownMax,
  sortedNotifications,
  unreadNotificationCount,
  unreadNotifications,
  wholeDaysSinceSent,
} from './notifications.ts';

describe('volunteer notifications', () => {
  it('lists Jane’s messages newest first', () => {
    const items = sortedNotifications(JANE_MILLER);
    assert.equal(items.length, 4);
    assert.equal(items[0]?.id, 'jane-team-photo');
    assert.equal(items.at(-1)?.id, 'jane-orientation');
  });

  it('does not reorder the fixture itself', () => {
    const before = JANE_MILLER.notifications?.map((item) => item.id);
    sortedNotifications({
      ...JANE_MILLER,
      notifications: [...(JANE_MILLER.notifications ?? [])].reverse(),
    });
    assert.deepEqual(
      JANE_MILLER.notifications?.map((item) => item.id),
      before,
    );
  });

  it('counts unread messages', () => {
    assert.equal(unreadNotificationCount(JANE_MILLER), 2);
    assert.deepEqual(
      unreadNotifications(JANE_MILLER).map((item) => item.id),
      ['jane-team-photo', 'jane-reference-requested'],
    );
  });

  it('flags a message once the reply threshold has passed', () => {
    const sentAt = '2026-10-12T14:20:00Z';
    const message = {
      id: 'photo',
      source: 'portal' as const,
      kind: 'team_note' as const,
      title: 'Photo',
      body: 'Please send a photo.',
      sentAt,
      read: true,
      alertAfterDays: 7,
    };
    const justBefore = new Date(Date.parse(sentAt) + 7 * 24 * 60 * 60 * 1000 - 1);
    const onTheDay = new Date(Date.parse(sentAt) + 7 * 24 * 60 * 60 * 1000);
    assert.equal(wholeDaysSinceSent(sentAt, justBefore), 6);
    assert.equal(isNotificationFlagged(message, justBefore), false);
    assert.equal(wholeDaysSinceSent(sentAt, onTheDay), 7);
    assert.equal(isNotificationFlagged(message, onTheDay), true);
  });

  it('does not flag a message that has a reply or no threshold', () => {
    const now = new Date('2026-11-22T12:00:00Z');
    const base = {
      id: 'note',
      source: 'email' as const,
      kind: 'reminder' as const,
      title: 'Note',
      body: 'Hello',
      sentAt: '2026-09-01T00:00:00Z',
      read: false,
    };
    assert.equal(isNotificationFlagged(base, now), false);
    assert.equal(isNotificationFlagged({ ...base, alertAfterDays: 3, respondedAt: '2026-09-02T00:00:00Z' }, now), false);
    assert.equal(isNotificationFlagged({ ...base, alertAfterDays: 3, respondedAt: '   ' }, now), true);
    assert.equal(isNotificationFlagged({ ...base, alertAfterDays: -1 }, now), false);
    assert.equal(isNotificationFlagged({ ...base, sentAt: 'not-a-date', alertAfterDays: 0 }, now), false);
    assert.equal(isNotificationFlagged({ ...base, alertAfterDays: 0 }, now), true);
  });

  it('flags Jane’s unanswered photo note and leaves the rest alone', () => {
    const now = new Date('2026-11-22T12:00:00Z');
    assert.equal(flaggedNotificationCount(JANE_MILLER, now), 1);
    assert.deepEqual(
      flaggedNotifications(JANE_MILLER, now).map((item) => item.id),
      ['jane-team-photo'],
    );
  });

  it('handles a record with no notifications', () => {
    const me = { ...JANE_MILLER, notifications: undefined };
    assert.deepEqual(sortedNotifications(me), []);
    assert.equal(unreadNotificationCount(me), 0);
    assert.equal(flaggedNotificationCount(me, new Date('2026-11-22T12:00:00Z')), 0);
  });

  it('greets a new preview account with one unread message', () => {
    const me = previewStatusForNewAccount({ name: 'Sam', email: 'sam@example.com' });
    assert.equal(unreadNotificationCount(me), 1);
    assert.equal(sortedNotifications(me)[0]?.id, 'welcome');
  });

  it('caps the open panel so the gap below matches the gap above', () => {
    assert.equal(notificationRollDownMax(100, 84, 500), 384);
    assert.equal(notificationRollDownMax(48, 16, 448), 368);
    assert.equal(notificationRollDownMax(200, 188, 214), 2);
    assert.equal(notificationRollDownMax(200, 188, 210), 0);
  });

  it('formats a short UTC date', () => {
    assert.equal(formatNotificationDate('2026-10-12T14:20:00Z'), 'Oct 12');
    assert.equal(formatNotificationDate('2026-10-01T23:59:00Z'), 'Oct 1');
  });
});
