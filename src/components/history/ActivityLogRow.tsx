import type { CrmActivityCategory, CrmActivityEvent } from '../../types/activityLog';

const CATEGORY_STYLES: Record<CrmActivityCategory, string> = {
  created: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  updated: 'bg-sky-50 text-sky-800 ring-sky-200',
  deleted: 'bg-rose-50 text-rose-800 ring-rose-200',
  moved: 'bg-amber-50 text-amber-800 ring-amber-200',
  comment: 'bg-violet-50 text-violet-800 ring-violet-200',
  email: 'bg-crm-indigo-50 text-crm-indigo ring-crm-indigo/20',
  other: 'bg-crm-taupe-50 text-crm-slate ring-crm-taupe/20',
};

interface ActivityLogRowProps {
  event: CrmActivityEvent;
  onOpen?: (event: CrmActivityEvent) => void;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export default function ActivityLogRow({ event, onOpen }: ActivityLogRowProps) {
  const clickable = Boolean(onOpen && event.navigateTo);

  const content = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crm-indigo-50 text-sm font-semibold text-crm-indigo">
        {initials(event.actorName)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-crm-heading">{event.actorName}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${CATEGORY_STYLES[event.category]}`}
          >
            {event.category}
          </span>
          {event.boardName && (
            <span className="rounded-full bg-crm-white px-2 py-0.5 text-xs text-crm-slate ring-1 ring-crm-taupe/20">
              {event.boardName}
            </span>
          )}
        </div>

        <p className="mt-1 text-sm text-crm-text">{event.summary}</p>
        {event.detail && (
          <p className="mt-1 text-sm text-crm-slate">{event.detail}</p>
        )}
        <p className="mt-2 text-xs text-crm-slate">{formatTimestamp(event.occurredAt)}</p>
      </div>

      {clickable && (
        <span className="shrink-0 text-crm-slate" aria-hidden="true">
          →
        </span>
      )}
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => onOpen?.(event)}
        className="flex w-full items-start gap-4 rounded-2xl bg-crm-surface p-4 text-left ring-1 ring-crm-taupe/20 transition hover:bg-crm-indigo-50/40"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-start gap-4 rounded-2xl bg-crm-surface p-4 ring-1 ring-crm-taupe/20">
      {content}
    </div>
  );
}
