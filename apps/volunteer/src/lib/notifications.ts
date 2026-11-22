import type {
  VolunteerApplicationStatus,
  VolunteerNotification,
  VolunteerNotificationKind,
  VolunteerNotificationSource,
} from '../contract/volunteerApi';

export const NOTIFICATIONS_TITLE = 'Notifications';

export const NOTIFICATION_SOURCE_LABEL: Record<VolunteerNotificationSource, string> = {
  email: 'Email',
  portal: 'i58 portal',
};

export const NOTIFICATION_KIND_LABEL: Record<VolunteerNotificationKind, string> = {
  application: 'Application',
  team_note: 'From the i58 team',
  reminder: 'Reminder',
};

/** Newest first. */
export function sortedNotifications(me: VolunteerApplicationStatus): VolunteerNotification[] {
  return [...(me.notifications ?? [])].sort(
    (a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt),
  );
}

export function unreadNotificationCount(me: VolunteerApplicationStatus): number {
  return (me.notifications ?? []).filter((item) => !item.read).length;
}

export function unreadNotifications(me: VolunteerApplicationStatus): VolunteerNotification[] {
  return sortedNotifications(me).filter((item) => !item.read);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole 24-hour periods since the message was sent. Null when the timestamp is unusable. */
export function wholeDaysSinceSent(sentAt: string, now: Date): number | null {
  const sent = Date.parse(sentAt);
  if (Number.isNaN(sent)) return null;
  return Math.floor((now.getTime() - sent) / DAY_MS);
}

function hasReply(item: VolunteerNotification): boolean {
  return typeof item.respondedAt === 'string' && item.respondedAt.trim().length > 0;
}

/**
 * True when staff asked for a reply and that many days have passed without one.
 * `alertAfterDays` is the threshold set when the message was sent.
 */
export function isNotificationFlagged(item: VolunteerNotification, now: Date): boolean {
  if (hasReply(item)) return false;
  const threshold = item.alertAfterDays;
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0) return false;
  const elapsed = wholeDaysSinceSent(item.sentAt, now);
  if (elapsed == null) return false;
  return elapsed >= threshold;
}

export function flaggedNotifications(
  me: VolunteerApplicationStatus,
  now: Date,
): VolunteerNotification[] {
  return sortedNotifications(me).filter((item) => isNotificationFlagged(item, now));
}

export function flaggedNotificationCount(me: VolunteerApplicationStatus, now: Date): number {
  return (me.notifications ?? []).filter((item) => isNotificationFlagged(item, now)).length;
}

/**
 * Tallest the panel may open while leaving the same gap under it as above it.
 * Distances are along the page, in pixels.
 */
export function notificationRollDownMax(
  panelTop: number,
  aboveBottom: number,
  belowTop: number,
): number {
  const margin = Math.max(0, panelTop - aboveBottom);
  return Math.max(0, belowTop - panelTop - margin);
}

/** Short date such as "Oct 12". */
export function formatNotificationDate(sentAt: string): string {
  return new Date(sentAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
