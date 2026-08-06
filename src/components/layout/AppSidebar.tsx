/**
 * AppSidebar.tsx — Volunteer Portal sidebar (all nav items visible).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ADMIN_TOOL_NAV_ITEMS,
  COMMUNICATIONS_NAV_ITEMS,
  HISTORY_NAV_ITEMS,
  PRIMARY_NAV_ITEMS,
  SETTINGS_NAV_ITEMS,
  isSettingsPage,
  type PageId,
} from '../../constants/navItems';
import { useCurrentUser } from '../../context/useCurrentUser';
import { useLayout } from '../../context/LayoutContext';
import { useIsPhoneLayout } from '../../hooks/useMediaQuery';
import {
  LOCAL_CRM_OPERATORS,
  setLocalUserOverride,
} from '../../services/crmLocalUserOverride';
import ReviewNotificationBell from './ReviewNotificationBell';
import ContactMatchReviewBell from './ContactMatchReviewBell';
import ContactDuplicatesBell from './ContactDuplicatesBell';

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export type { PageId };

interface AppSidebarProps {
  activePage: PageId;
  onNavigate: (id: PageId) => void;
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className ?? 'h-4 w-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

function NavSection({
  title,
  first = false,
  children,
}: {
  title: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={
        first
          ? 'space-y-1'
          : 'mt-4 space-y-1 border-t border-crm-taupe/25 pt-4'
      }
    >
      <p className="px-4 pb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-crm-heading/80">
        {title}
      </p>
      {children}
    </div>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export default function AppSidebar({ activePage, onNavigate }: AppSidebarProps) {
  const { detailMode, sidebarOpen, openSidebar, closeSidebar } = useLayout();
  const isPhone = useIsPhoneLayout();
  const { user, displayName, canSwitchLocalUser } = useCurrentUser();
  const settingsChildActive = isSettingsPage(activePage);
  const [settingsOpen, setSettingsOpen] = useState(settingsChildActive);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (settingsChildActive) setSettingsOpen(true);
  }, [settingsChildActive]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [userMenuOpen]);

  // Phone + detail overlays use a drawer; desktop keeps a permanent sidebar.
  const useDrawer = isPhone || detailMode;
  const showFullSidebar = !useDrawer || sidebarOpen;
  const showDesktopCollapsedRail = detailMode && !sidebarOpen && !isPhone;
  const showPhoneTopBar = isPhone && !sidebarOpen;

  const primary = [...PRIMARY_NAV_ITEMS];
  const communications = [...COMMUNICATIONS_NAV_ITEMS];
  const history = [...HISTORY_NAV_ITEMS];
  const adminTools = [...ADMIN_TOOL_NAV_ITEMS];
  const settings = [...SETTINGS_NAV_ITEMS];

  return (
    <>
      {useDrawer && sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-stone-900/25"
        />
      )}

      {showPhoneTopBar && (
        <header className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-crm-taupe/20 bg-crm-surface/95 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md md:hidden">
          <button
            type="button"
            onClick={openSidebar}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-crm-taupe/20 text-crm-heading transition hover:bg-crm-indigo-50"
          >
            <MenuIcon />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-crm-heading">
              Volunteer Portal
            </p>
          </div>
        </header>
      )}

      {showDesktopCollapsedRail && (
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
          className={
            useDrawer
              ? 'fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] max-w-sm min-h-0 flex-col border-r border-crm-taupe/20 bg-crm-surface p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl'
              : 'relative flex h-full min-h-0 w-72 shrink-0 flex-col border-r border-crm-taupe/20 bg-crm-surface p-6'
          }
        >
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-crm-heading">
                Volunteer Portal
              </h1>
              <p className="mt-2 text-sm text-crm-slate">
                Volunteer operations dashboard
              </p>
            </div>
            {useDrawer && sidebarOpen && (
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Close navigation"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-crm-taupe/20 text-crm-slate transition hover:bg-crm-white hover:text-crm-heading"
              >
                <ChevronLeftIcon />
              </button>
            )}
          </div>

          <div ref={userMenuRef} className="relative mt-5 shrink-0">
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex w-full items-center gap-3 rounded-2xl border border-crm-taupe/20 bg-crm-white/70 px-3 py-2.5 text-left transition hover:border-crm-taupe/35 hover:bg-crm-indigo-50"
              aria-label="Account menu"
              aria-expanded={userMenuOpen}
            >
              {user?.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-crm-taupe/25"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crm-indigo-100 text-xs font-semibold text-crm-heading ring-1 ring-crm-taupe/20"
                >
                  {initialsFromName(displayName)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-crm-heading">
                  {displayName}
                </span>
                <span className="mt-0.5 block truncate text-xs text-crm-slate">
                  {user?.email?.trim() || 'Operator'}
                </span>
              </span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 text-crm-slate transition-transform ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-crm-taupe/25 bg-crm-surface p-2 shadow-lg">
                {canSwitchLocalUser && (
                  <>
                    <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-crm-slate">
                      Local user (dev only)
                    </p>
                    <ul className="max-h-64 space-y-0.5 overflow-y-auto">
                      {LOCAL_CRM_OPERATORS.map((operator) => {
                        const active =
                          user?.email?.toLowerCase() ===
                          operator.email?.toLowerCase();
                        return (
                          <li key={operator.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setLocalUserOverride(operator);
                                setUserMenuOpen(false);
                              }}
                              className={`w-full rounded-xl px-2.5 py-2 text-left text-sm transition ${
                                active
                                  ? 'bg-crm-indigo-50 font-medium text-crm-heading'
                                  : 'text-crm-text hover:bg-crm-taupe-50'
                              }`}
                            >
                              <span className="block truncate">
                                {operator.name}
                              </span>
                              <span className="block truncate text-xs text-crm-slate">
                                {operator.email}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalUserOverride(null);
                        setUserMenuOpen(false);
                      }}
                      className="mt-1 w-full rounded-xl px-2.5 py-2 text-left text-xs text-crm-slate transition hover:bg-crm-taupe-50"
                    >
                      Use monday.com token user
                    </button>
                    <div className="my-1.5 border-t border-crm-taupe/15" />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate('user-settings');
                  }}
                  className="w-full rounded-xl px-2.5 py-2 text-left text-sm text-crm-text transition hover:bg-crm-taupe-50 hover:text-crm-heading"
                >
                  User settings
                </button>
              </div>
            )}
          </div>

          <nav className="mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <NavSection title="Volunteers" first>
              {primary.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  className={navButtonClass(activePage === id)}
                >
                  {label}
                </button>
              ))}
            </NavSection>

            <NavSection title="Communications">
              {communications.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  className={navButtonClass(activePage === id)}
                >
                  {label}
                </button>
              ))}
            </NavSection>

            <NavSection title="Admin">
              {history.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  className={navButtonClass(activePage === id)}
                >
                  {label}
                </button>
              ))}

              {adminTools.map(([id, label]) => (
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
                    className="ml-3 mt-1 space-y-1 border-l border-crm-taupe/15 pl-3"
                  >
                    {settings.map(([id, label]) => (
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
            </NavSection>
          </nav>

          <div className="mt-4 shrink-0 border-t border-crm-taupe/20 pt-4">
            <ReviewNotificationBell />
            <ContactMatchReviewBell />
            <ContactDuplicatesBell />
          </div>
        </aside>
      )}
    </>
  );
}
