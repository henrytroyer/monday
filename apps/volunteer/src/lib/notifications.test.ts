import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER, previewStatusForNewAccount } from '../mock/fixtures.ts';
import {
  formatNotificationDate,
  sortedNotifications,
  unreadNotificationCount,
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
  });

  it('handles a record with no notifications', () => {
    const me = { ...JANE_MILLER, notifications: undefined };
    assert.deepEqual(sortedNotifications(me), []);
    assert.equal(unreadNotificationCount(me), 0);
  });

  it('greets a new preview account with one unread message', () => {
    const me = previewStatusForNewAccount({ name: 'Sam', email: 'sam@example.com' });
    assert.equal(unreadNotificationCount(me), 1);
    assert.equal(sortedNotifications(me)[0]?.id, 'welcome');
  });

  it('formats a short UTC date', () => {
    assert.equal(formatNotificationDate('2026-10-12T14:20:00Z'), 'Oct 12');
    assert.equal(formatNotificationDate('2026-10-01T23:59:00Z'), 'Oct 1');
  });
});
