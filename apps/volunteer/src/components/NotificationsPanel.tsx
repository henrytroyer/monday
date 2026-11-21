import { useLayoutEffect, useRef, useState } from 'react';
import type {
  VolunteerApplicationStatus,
  VolunteerNotificationSource,
} from '../contract/volunteerApi';
import {
  NOTIFICATION_KIND_LABEL,
  NOTIFICATION_SOURCE_LABEL,
  NOTIFICATIONS_TITLE,
  formatNotificationDate,
  notificationRollDownMax,
  sortedNotifications,
  unreadNotificationCount,
} from '../lib/notifications';

export function NotificationsPanel({
  me,
  open,
  onOpenChange,
  className = '',
}: {
  me: VolunteerApplicationStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}) {
  const items = sortedNotifications(me);
  const unread = unreadNotificationCount(me);
  const listId = 'volunteer-notifications';
  const panelRef = useRef<HTMLElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const measure = () => {
      const bounds = rollDownBounds(panel);
      if (!bounds) return;
      const cap = notificationRollDownMax(bounds.panelTop, bounds.aboveBottom, bounds.belowTop);
      const header = panel.querySelector(':scope > header');
      const minimum = header instanceof HTMLElement ? header.offsetHeight : 0;
      const next = Math.round(Math.max(minimum, cap));
      setMaxHeight((current) => (current === next ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    const hero = enclosingSection(panel);
    if (hero) observer.observe(hero);
    const next = hero?.nextElementSibling;
    if (next instanceof HTMLElement) observer.observe(next);
    const overlay = panel.parentElement?.parentElement;
    if (overlay) {
      for (const child of overlay.children) {
        if (child instanceof HTMLElement) observer.observe(child);
      }
    }
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <section
      ref={panelRef}
      aria-label={NOTIFICATIONS_TITLE}
      style={maxHeight == null ? undefined : { maxHeight }}
      className={`flex w-full min-h-0 flex-col overflow-hidden bg-white/95 shadow-lg ring-1 ring-white/60 backdrop-blur ${className}`}
    >
      <header
        className={`flex shrink-0 items-center justify-between gap-3 px-4 py-3 ${open ? 'border-b border-sand/70' : ''}`}
      >
        <h2 className="text-base font-semibold text-navy">{NOTIFICATIONS_TITLE}</h2>
        <div className="flex items-center gap-1.5">
          {unread > 0 ? (
            <span className="rounded-full bg-crm-terracotta px-2.5 py-0.5 text-xs font-semibold text-white">
              {unread} new
            </span>
          ) : null}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => onOpenChange(!open)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-navy hover:bg-sand/40"
          >
            <span className="sr-only">{open ? 'Roll up notifications' : 'Roll down notifications'}</span>
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden
            >
              <path d="m6 14 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <div
        id={listId}
        className={`grid min-h-0 overflow-hidden motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-out ${
          open ? 'grid-rows-[minmax(0,1fr)]' : 'grid-rows-[0fr]'
        }`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="min-h-0 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-crm-slate">
              No messages yet. Updates about your application and notes from the i58 team will show
              up here.
            </p>
          ) : (
            <ul className="divide-y divide-sand/60">
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
        </div>
      </div>
    </section>
  );
}

/** The page section that contains the panel. The panel itself is also a section. */
function enclosingSection(panel: HTMLElement): HTMLElement | null {
  const parent = panel.parentElement;
  return parent ? parent.closest('section') : null;
}

/** Gap above the panel, and the top of the section underneath it. */
function rollDownBounds(
  panel: HTMLElement,
): { panelTop: number; aboveBottom: number; belowTop: number } | null {
  const rect = panel.getBoundingClientRect();
  const hero = enclosingSection(panel);
  if (!hero) return null;
  const heroRect = hero.getBoundingClientRect();
  let aboveBottom = heroRect.top;

  const overlay = panel.parentElement?.parentElement;
  if (overlay) {
    for (const child of overlay.children) {
      if (!(child instanceof HTMLElement) || child.contains(panel)) continue;
      const childRect = child.getBoundingClientRect();
      const overlapsX = childRect.right > rect.left + 1 && childRect.left < rect.right - 1;
      if (overlapsX && childRect.bottom <= rect.top + 1) {
        aboveBottom = Math.max(aboveBottom, childRect.bottom);
      }
    }
  }

  const next = hero.nextElementSibling;
  const nextTop = next instanceof HTMLElement ? next.getBoundingClientRect().top : heroRect.bottom;
  const belowTop = nextTop > rect.top + 1 ? nextTop : heroRect.bottom;
  return { panelTop: rect.top, aboveBottom, belowTop };
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
