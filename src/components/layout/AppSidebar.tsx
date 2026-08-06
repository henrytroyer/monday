/**
 * AppSidebar.tsx — Permission-filtered Volunteer Portal sidebar.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ADMIN_TOOL_NAV_ITEMS,
  COMMUNICATIONS_NAV_ITEMS,
  HISTORY_NAV_ITEMS,
  PRIMARY_NAV_ITEMS,
  SETTINGS_NAV_ITEMS,
  USERS_NAV_ITEMS,
  isSettingsPage,
  type PageId,
} from '../../constants/navItems';
import { useCurrentUser } from '../../context/CurrentUserContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useLayout } from '../../context/LayoutContext';
import type { PermissionKey } from '../../permissions/permissionKeys';
import {
  LOCAL_CRM_OPERATORS,
  setLocalUserOverride,
} from '../../services/crmLocalUserOverride';
import ReviewNotificationBell from './ReviewNotificationBell';
import ContactMatchReviewBell from './ContactMatchReviewBell';
import ContactDuplicatesBell from './ContactDuplicatesBell';

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

type NavRow = readonly [PageId, string, PermissionKey];

export default function AppSidebar({ activePage, onNavigate }: AppSidebarProps) {
  const { detailMode, sidebarOpen, openSidebar, closeSidebar } = useLayout();
  const { user, displayName, canSwitchLocalUser } = useCurrentUser();
  const { ready, hasPermission, hasRole, roles, canViewSection } =
    usePermissions();
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

  const showFullSidebar = !detailMode || sidebarOpen;
  const showCollapsedRail = detailMode && !sidebarOpen;

  const filterRows = (rows: readonly NavRow[]) =>
    ready
      ? rows.filter(([id]) =>
          canViewSection(
            `nav.${id}` as Parameters<typeof canViewSection>[0],
          ),
        )
      : [];

  const primary = filterRows(PRIMARY_NAV_ITEMS as unknown as NavRow[]);
  const communications = filterRows(
    COMMUNICATIONS_NAV_ITEMS as unknown as NavRow[],
  );
  const history = filterRows(HISTORY_NAV_ITEMS as unknown as NavRow[]);
  const users = filterRows(USERS_NAV_ITEMS as unknown as NavRow[]);
  const adminTools = filterRows(ADMIN_TOOL_NAV_ITEMS as unknown as NavRow[]);
  const settings = filterRows(SETTINGS_NAV_ITEMS as unknown as NavRow[]);
  const showSettings = hasPermission('settings.view') && settings.length > 0;
  const showAdmin =
    history.length > 0 ||
    users.length > 0 ||
    adminTools.length > 0 ||
    showSettings;

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
          className={`flex h-full min-h-0 shrink-0 flex-col border-r border-crm-taupe/20 bg-crm-surface p-6 ${
            detailMode && sidebarOpen
              ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-2xl'
              : 'w-72'
          }`}
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
                  {user?.email?.trim() || roles.join(' · ') || 'Operator'}
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
            {primary.length > 0 && (
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
            )}

            {communications.length > 0 && (
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
            )}

            {showAdmin && (
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

                {users.map(([id, label]) => (
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

                {showSettings && (
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
                )}
              </NavSection>
            )}
          </nav>

          <div className="mt-4 shrink-0 border-t border-crm-taupe/20 pt-4">
            {hasRole('DEV') && (
              <>
                <ReviewNotificationBell />
                <ContactMatchReviewBell />
              </>
            )}
            {(hasPermission('contacts.merge') ||
              hasPermission('contacts.edit')) && <ContactDuplicatesBell />}
          </div>
        </aside>
      )}
    </>
  );
}
