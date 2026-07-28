/**
 * EmailActivityTimeline — chronological tracking events (unavailable until provider).
 */

import type { EmailMessage } from '../../types/emailThread';

interface EmailActivityTimelineProps {
  message: EmailMessage;
}

export default function EmailActivityTimeline({
  message,
}: EmailActivityTimelineProps) {
  if (message.direction !== 'outbound') return null;

  const events = message.trackingEvents;
  if (!events.length) {
    return (
      <details className="mt-3 rounded-xl border border-dashed border-crm-taupe/25 px-3 py-2 text-xs text-crm-slate">
        <summary className="cursor-pointer font-medium text-crm-heading">
          Activity timeline
        </summary>
        <p className="mt-2">
          Tracking information is unavailable for this email.
        </p>
      </details>
    );
  }

  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.eventTimestamp).getTime() -
      new Date(b.eventTimestamp).getTime(),
  );

  return (
    <details className="mt-3 rounded-xl border border-crm-taupe/15 px-3 py-2 text-xs text-crm-slate">
      <summary className="cursor-pointer font-medium text-crm-heading">
        Activity timeline
      </summary>
      <ol className="mt-2 space-y-2 border-l border-crm-taupe/25 pl-3">
        {sorted.map((event) => (
          <li key={event.id}>
            <p className="font-medium text-crm-heading">{event.eventType}</p>
            <p>{new Date(event.eventTimestamp).toLocaleString()}</p>
            {event.linkUrl && <p className="break-all">{event.linkUrl}</p>}
            {event.source && <p>Source: {event.source}</p>}
          </li>
        ))}
      </ol>
    </details>
  );
}
