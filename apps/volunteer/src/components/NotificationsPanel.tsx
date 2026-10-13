import type {
  VolunteerApplicationStatus,
  VolunteerNotificationSource,
} from '../contract/volunteerApi';
import {
  NOTIFICATION_KIND_LABEL,
  NOTIFICATION_SOURCE_LABEL,
  NOTIFICATIONS_TITLE,
  formatNotificationDate,
  sortedNotifications,
  unreadNotificationCount,
} from '../lib/notifications';

export function NotificationsPanel({
  me,
  className = '',
}: {
  me: VolunteerApplicationStatus;
  className?: string;
}) {
  const items = sortedNotifications(me);
  const unread = unreadNotificationCount(me);

  return (
    <section
      aria-label={NOTIFICATIONS_TITLE}
      className={`flex flex-col rounded-2xl bg-white/95 shadow-lg ring-1 ring-white/60 backdrop-blur ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-sand/70 px-4 py-3">
        <h2 className="text-base font-semibold text-navy">{NOTIFICATIONS_TITLE}</h2>
        {unread > 0 ? (
          <span className="rounded-full bg-crm-terracotta px-2.5 py-0.5 text-xs font-semibold text-white">
            {unread} new
          </span>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-crm-slate">
          No messages yet. Updates about your application and notes from the i58 team will show
          up here.
        </p>
      ) : (
        <ul className="max-h-72 divide-y divide-sand/60 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 px-4 py-3">
              <SourceIcon source={item.source} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={`truncate text-sm text-navy ${item.read ? 'font-medium' : 'font-semibold'}`}
                  >
                    {item.title}
                  </p>
                  <time
                    dateTime={item.sentAt}
                    className="shrink-0 text-xs text-crm-slate"
                  >
                    {formatNotificationDate(item.sentAt)}
                  </time>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-crm-text">
                  {item.body}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-navy/50">
                  {NOTIFICATION_SOURCE_LABEL[item.source]} · {NOTIFICATION_KIND_LABEL[item.kind]}
                </p>
              </div>
              {item.read ? null : (
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-crm-terracotta"
                  aria-label="Unread"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SourceIcon({ source }: { source: VolunteerNotificationSource }) {
  return (
    <span
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crm-indigo-50 text-navy"
      aria-hidden
    >
      {source === 'email' ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"
            strokeLinejoin="round"
          />
          <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
