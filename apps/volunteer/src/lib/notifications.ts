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

/** Short date such as "Oct 12". */
export function formatNotificationDate(sentAt: string): string {
  return new Date(sentAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
