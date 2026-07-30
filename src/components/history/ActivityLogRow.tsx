/**
 * Single History activity row — summary, undo, open record, and automation peek.
 */
import { useEffect, useState } from 'react';
import { ACTIVITY_CATEGORY_LABELS } from '../../constants/activityLabels';
import {
  resolveActivityAutomation,
  type ResolvedActivityAutomation,
} from '../../services/resolveActivityAutomation';
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
  onUndo?: (event: CrmActivityEvent) => void;
  undoing?: boolean;
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

export default function ActivityLogRow({
  event,
  onOpen,
  onUndo,
  undoing = false,
}: ActivityLogRowProps) {
  const canOpenRecord = Boolean(
    onOpen && event.entityId && (event.navigateTo || event.entityType),
  );
  const openLabel =
    event.entityType === 'contact'
      ? 'Open contact'
      : event.entityType === 'application'
        ? 'Open application'
        : event.entityType === 'recruitment'
          ? 'Open prospect'
          : 'Open';
  const canUndo = Boolean(onUndo && event.undoable);
  const [showAutomation, setShowAutomation] = useState(false);
  const [resolved, setResolved] = useState<ResolvedActivityAutomation | null>(
    null,
  );
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [openingAutomation, setOpeningAutomation] = useState(false);

  useEffect(() => {
    if (!showAutomation || !event.isAutomation) return;
    if (resolved) return;

    let cancelled = false;
    setResolving(true);
    setResolveError(null);

    void resolveActivityAutomation(event)
      .then((result) => {
        if (!cancelled) setResolved(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setResolveError(
            err instanceof Error
              ? err.message
              : 'Could not identify this automation',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showAutomation, event, resolved]);

  const openAutomationInMonday = async () => {
    setOpeningAutomation(true);
    setResolveError(null);
    try {
      const details =
        resolved ?? (await resolveActivityAutomation(event));
      if (!resolved) setResolved(details);

      try {
        await navigator.clipboard.writeText(details.searchText);
      } catch {
        // Clipboard may be blocked; still open the link.
      }

      window.open(details.openUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setResolveError(
        'Could not open automations. Search Automate for the name shown above.',
      );
    } finally {
      setOpeningAutomation(false);
    }
  };

  return (
    <div className="rounded-2xl bg-crm-surface p-4 ring-1 ring-crm-taupe/20">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crm-indigo-50 text-sm font-semibold text-crm-indigo">
          {initials(event.actorName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${CATEGORY_STYLES[event.category]}`}
            >
              {ACTIVITY_CATEGORY_LABELS[event.category]}
            </span>
            {event.boardName && (
              <span className="rounded-full bg-crm-white px-2 py-0.5 text-xs text-crm-slate ring-1 ring-crm-taupe/20">
                {event.boardName}
              </span>
            )}
            {event.isAutomation && (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-violet-200">
                Automation
              </span>
            )}
          </div>

          <p className="mt-1 text-sm font-medium text-crm-heading">{event.summary}</p>
          {event.detail && (
            <p className="mt-1 text-sm text-crm-slate">{event.detail}</p>
          )}
          <p className="mt-2 text-xs text-crm-slate">
            {formatTimestamp(event.occurredAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {canUndo && (
            <button
              type="button"
              onClick={() => onUndo?.(event)}
              disabled={undoing}
              className="rounded-xl border border-crm-taupe/25 bg-crm-white px-3 py-1.5 text-xs font-medium text-crm-heading transition hover:bg-amber-50 disabled:opacity-60"
            >
              {undoing ? 'Undoing…' : 'Undo'}
            </button>
          )}
          {canOpenRecord && (
            <button
              type="button"
              onClick={() => onOpen?.(event)}
              className="rounded-xl border border-crm-taupe/25 bg-crm-white px-3 py-1.5 text-xs font-medium text-crm-indigo transition hover:bg-crm-indigo-50"
            >
              {openLabel}
            </button>
          )}
          {event.isAutomation && (
            <button
              type="button"
              onClick={() => setShowAutomation((open) => !open)}
              className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-900 transition hover:bg-violet-100"
            >
              {showAutomation ? 'Hide automation' : 'See automation'}
            </button>
          )}
        </div>
      </div>

      {showAutomation && event.isAutomation && (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm text-crm-heading">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-800">
            Automation name
          </p>
          {resolving && (
            <p className="mt-1 text-crm-slate">Identifying automation…</p>
          )}
          {!resolving && resolved && (
            <>
              <p className="mt-1 text-base font-semibold text-crm-heading">
                {resolved.name}
              </p>
              {resolved.automationId && (
                <p className="mt-1 text-xs text-crm-slate">
                  automation id: {resolved.automationId}
                </p>
              )}
              {resolved.stepTitles.length > 1 && (
                <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-crm-text">
                  {resolved.stepTitles.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </>
          )}
          {event.detail && (
            <p className="mt-2 text-crm-text">
              Change: <span className="font-medium">{event.detail}</span>
            </p>
          )}
          <p className="mt-2 text-xs text-crm-slate">
            Opens this automation in Automate. The name is also copied so you
            can paste/search if the page does not jump to it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void openAutomationInMonday()}
              disabled={openingAutomation || resolving || !event.boardId}
              className="rounded-xl border border-violet-300 bg-crm-white px-3 py-1.5 text-xs font-medium text-violet-900 transition hover:bg-violet-100 disabled:opacity-60"
            >
              {openingAutomation
                ? 'Opening…'
                : resolved?.name
                  ? `Open “${resolved.name.length > 42 ? `${resolved.name.slice(0, 42)}…` : resolved.name}”`
                  : 'Open automation'}
            </button>
          </div>
          {resolveError && (
            <p className="mt-2 text-xs text-rose-700">{resolveError}</p>
          )}
        </div>
      )}
    </div>
  );
}
