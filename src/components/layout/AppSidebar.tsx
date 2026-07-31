/**
 * AppSidebar.tsx — Volunteer Portal sidebar with Settings dropdown (CRM-only nav).
 */

import { useEffect, useState } from 'react';
import {
  PRIMARY_NAV_ITEMS,
  SETTINGS_NAV_ITEMS,
  isSettingsPage,
  type PageId,
} from '../../constants/navItems';
import { useLayout } from '../../context/LayoutContext';
import ReviewNotificationBell from './ReviewNotificationBell';
import ContactMatchReviewBell from './ContactMatchReviewBell';

export type { PageId };

interface AppSidebarProps {
  activePage: PageId;
  onNavigate: (id: PageId) => void;
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? 'h-4 w-4'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function navButtonClass(active: boolean, compact = false): string {
  const base = compact
    ? 'w-full rounded-xl px-3 py-2 text-left text-sm transition'
    : 'w-full rounded-2xl px-4 py-3 text-left transition';

  return active
    ? `${base} bg-crm-indigo-50 text-crm-heading font-medium ring-1 ring-crm-indigo/10`
    : `${base} text-crm-text hover:bg-crm-taupe-50`;
}

export default function AppSidebar({ activePage, onNavigate }: AppSidebarProps) {
  const { detailMode, sidebarOpen, openSidebar, closeSidebar } = useLayout();
  const settingsChildActive = isSettingsPage(activePage);
  const [settingsOpen, setSettingsOpen] = useState(settingsChildActive);

  useEffect(() => {
    if (settingsChildActive) {
      setSettingsOpen(true);
    }
  }, [settingsChildActive]);

  const showFullSidebar = !detailMode || sidebarOpen;
  const showCollapsedRail = detailMode && !sidebarOpen;

  return (
    <>
      {detailMode && sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-stone-900/15"
        />
      )}

      {showCollapsedRail && (
        <>
          <aside className="relative w-4 shrink-0 border-r border-crm-taupe/20 bg-crm-surface" />
          <button
            type="button"
            onClick={openSidebar}
            aria-label="Open menu"
            className="fixed left-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 rounded-r-2xl border border-l-0 border-crm-taupe/20 bg-crm-surface/95 px-3 py-5 text-sm font-semibold text-crm-heading shadow-sm backdrop-blur-md transition hover:border-crm-taupe/28 hover:bg-crm-indigo-50"
          >
            <span className="[writing-mode:vertical-rl] rotate-180 tracking-[0.2em]">
              Menu
            </span>
            <ChevronRightIcon />
          </button>
        </>
      )}

      {showFullSidebar && (
        <aside
          className={`flex shrink-0 flex-col border-r border-crm-taupe/20 bg-crm-surface p-6 ${
            detailMode && sidebarOpen
              ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-2xl'
              : 'w-72'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-crm-heading">Volunteer Portal</h1>
              <p className="mt-2 text-sm text-crm-slate">
                Volunteer operations dashboard
              </p>
            </div>

            {detailMode && sidebarOpen && (
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Minimize navigation"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-crm-taupe/20 text-crm-slate transition hover:bg-crm-white hover:text-crm-heading"
              >
                <ChevronLeftIcon />
              </button>
            )}
          </div>

          <nav className="mt-10 space-y-2">
            {PRIMARY_NAV_ITEMS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={navButtonClass(activePage === id)}
              >
                {label}
              </button>
            ))}

            <div>
              <button
                type="button"
                aria-expanded={settingsOpen}
                aria-controls="settings-nav-items"
                onClick={() => setSettingsOpen((open) => !open)}
                className={`${navButtonClass(settingsChildActive)} flex items-center justify-between`}
              >
                <span>Settings</span>
                <ChevronDownIcon
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    settingsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {settingsOpen && (
                <div
                  id="settings-nav-items"
                  className="ml-3 mt-1 space-y-1 border-l border-crm-taupe/20 pl-3"
                >
                  {SETTINGS_NAV_ITEMS.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onNavigate(id)}
                      className={navButtonClass(activePage === id, true)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <ReviewNotificationBell />
          <ContactMatchReviewBell />
        </aside>
      )}
    </>
  );
}
