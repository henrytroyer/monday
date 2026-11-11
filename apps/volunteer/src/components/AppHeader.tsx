import { useEffect, useRef, useState } from 'react';
import { BrandMark } from './BrandMark';
import {
  GENERAL_INFO_SECTIONS,
  PORTAL_TAB_LABEL,
  portalNavTabs,
  type GeneralInfoSectionId,
  type PortalTab,
} from '../lib/nav';

type DirectTab = Exclude<PortalTab, 'generalInfo'>;

export function AppHeader({
  tab,
  generalInfoSection = null,
  onTabChange,
  onGeneralInfoSection,
  onSignOut,
  portalName,
  homeOnly = false,
  overlay = false,
}: {
  tab?: PortalTab;
  generalInfoSection?: GeneralInfoSectionId | null;
  onTabChange?: (next: DirectTab) => void;
  onGeneralInfoSection?: (section: GeneralInfoSectionId) => void;
  onSignOut?: () => void;
  portalName?: string | null;
  homeOnly?: boolean;
  overlay?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [generalOpen, setGeneralOpen] = useState(false);
  const generalRef = useRef<HTMLDivElement>(null);
  const showNav = Boolean(onTabChange && tab);
  const generalCurrent = tab === 'generalInfo';
  const tabs = portalNavTabs(!homeOnly);

  useEffect(() => {
    if (!generalOpen) return;
    function onPointer(event: MouseEvent) {
      if (!generalRef.current?.contains(event.target as Node)) setGeneralOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setGeneralOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [generalOpen]);

  function goTo(next: DirectTab) {
    onTabChange?.(next);
    setMenuOpen(false);
    setGeneralOpen(false);
  }

  function chooseSection(section: GeneralInfoSectionId) {
    onGeneralInfoSection?.(section);
    setMenuOpen(false);
    setGeneralOpen(false);
  }

  function navButton(id: PortalTab) {
    if (id === 'generalInfo') return null;
    const active = tab === id;
    return (
      <button
        key={id}
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={() => goTo(id)}
        className="site-nav-link"
      >
        {PORTAL_TAB_LABEL[id]}
      </button>
    );
  }

  return (
    <header
      className={
        overlay
          ? 'absolute inset-x-0 top-0 z-30 bg-transparent'
          : 'sticky top-0 z-30 border-b border-sand/70 bg-white/95 backdrop-blur'
      }
    >
      <div className="portal-header-bar mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          className="inline-flex shrink-0 items-center text-left"
          onClick={() => (onTabChange ? goTo('home') : undefined)}
          aria-label="Home"
        >
          <BrandMark name={portalName} />
        </button>
        {showNav ? (
          <>
            <nav
              aria-label="Portal"
              className={`${homeOnly ? 'flex' : 'hidden md:flex'} shrink-0 items-center gap-1.5`}
            >
              {tabs.map((id) =>
                id === 'generalInfo' ? (
                  <div key={id} ref={generalRef} className="relative">
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={generalOpen}
                      aria-controls="general-info-menu"
                      aria-current={generalCurrent ? 'page' : undefined}
                      onClick={() => setGeneralOpen((open) => !open)}
                      className="site-nav-link inline-flex items-center gap-1"
                    >
                      {PORTAL_TAB_LABEL.generalInfo}
                      <Chevron open={generalOpen} />
                    </button>
                    {generalOpen ? (
                      <div
                        id="general-info-menu"
                        role="menu"
                        aria-label="General Info"
                        className="absolute left-0 top-full z-40 mt-2 w-max rounded-2xl border border-sand/80 bg-white py-1.5 shadow-lg"
                      >
                        {GENERAL_INFO_SECTIONS.map(([section, label]) => (
                          <button
                            key={section}
                            type="button"
                            role="menuitem"
                            aria-current={generalInfoSection === section ? 'page' : undefined}
                            onClick={() => chooseSection(section)}
                            className={`block w-full whitespace-nowrap px-4 py-2.5 text-left text-sm font-medium hover:bg-crm-indigo-50 ${
                              generalInfoSection === section ? 'text-crm-terracotta' : 'text-navy'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  navButton(id)
                ),
              )}
              {onSignOut ? (
                <button type="button" onClick={onSignOut} className="site-nav-link">
                  Sign out
                </button>
              ) : null}
            </nav>
            {homeOnly ? null : (
              <button
                type="button"
                className="site-nav-link md:hidden"
                aria-expanded={menuOpen}
                aria-controls="portal-mobile-menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                Menu
              </button>
            )}
          </>
        ) : onSignOut ? (
          <button type="button" onClick={onSignOut} className="site-nav-link">
            Sign out
          </button>
        ) : null}
      </div>
      {showNav && menuOpen && !homeOnly ? (
        <nav
          id="portal-mobile-menu"
          aria-label="Portal"
          className="border-t border-sand/70 bg-white/95 px-5 py-3 backdrop-blur md:hidden"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-2">
            {tabs.map((id) =>
              id === 'generalInfo' ? (
                <div key={id} className="flex flex-col gap-2">
                  <p className="px-4 pt-1 text-sm font-semibold text-navy">
                    {PORTAL_TAB_LABEL.generalInfo}
                  </p>
                  {GENERAL_INFO_SECTIONS.map(([section, label]) => (
                    <button
                      key={section}
                      type="button"
                      aria-current={generalInfoSection === section ? 'page' : undefined}
                      onClick={() => chooseSection(section)}
                      className="site-nav-link w-full pl-8 text-left"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  key={id}
                  type="button"
                  aria-current={tab === id ? 'page' : undefined}
                  onClick={() => goTo(id)}
                  className="site-nav-link w-full text-left"
                >
                  {PORTAL_TAB_LABEL[id]}
                </button>
              ),
            )}
            {onSignOut ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
                className="site-nav-link w-full text-left"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
