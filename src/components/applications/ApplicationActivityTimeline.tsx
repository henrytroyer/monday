import { formatEmailDetailDate } from '../../utils/formatEmailThread';
import type { ApplicationActivityEvent } from '../../types/volunteer';

interface ApplicationActivityTimelineProps {
  events: ApplicationActivityEvent[];
  loading?: boolean;
  error?: string | null;
}

const categoryStyles: Record<
  ApplicationActivityEvent['category'],
  { label: string; className: string }
> = {
  note: {
    label: 'Note',
    className: 'bg-crm-indigo-50 text-crm-heading ring-crm-indigo/15',
  },
  email: {
    label: 'Email',
    className: 'bg-amber-50 text-amber-950 ring-amber-200/80',
  },
  created: {
    label: 'Created',
    className: 'bg-crm-taupe-50 text-crm-heading ring-crm-taupe/20',
  },
};

export default function ApplicationActivityTimeline({
  events,
  loading = false,
  error = null,
}: ApplicationActivityTimelineProps) {
  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
      <h3 className="text-lg font-semibold text-crm-heading">
        Application timeline
      </h3>
      <p className="mt-1 text-sm text-crm-slate">
        Internal activity log — when notes were added and emails were sent (no
        message content).
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface">
        {loading ? (
          <p className="py-6 text-center text-sm text-crm-slate">
            Loading activity…
          </p>
        ) : error ? (
          <p className="px-4 py-6 text-center text-sm text-amber-800" role="alert">
            {error}
          </p>
        ) : events.length === 0 ? (
          <p className="py-6 text-center text-sm text-crm-slate">
            No internal activity recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-crm-taupe/20">
            {events.map((event) => {
              const style = categoryStyles[event.category];
              return (
                <li
                  key={event.id}
                  className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4"
                >
                  <time
                    dateTime={event.occurredAt}
                    className="shrink-0 text-xs font-medium tabular-nums text-crm-slate sm:w-44"
                  >
                    {formatEmailDetailDate(event.occurredAt)}
                  </time>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}
                      >
                        {style.label}
                      </span>
                      <span className="text-sm font-medium text-crm-heading">
                        {event.actorName}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-crm-text">{event.summary}</p>
                    {event.detail && (
                      <p className="mt-0.5 text-xs text-crm-slate">
                        {event.detail}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
