import { useState } from 'react';
import { BrandMark } from './BrandMark';
import { PORTAL_TAB_LABEL, PORTAL_TABS, type PortalTab } from '../lib/nav';

export function AppHeader({
  tab,
  onTabChange,
  onSignOut,
  overlay = false,
}: {
  tab?: PortalTab;
  onTabChange?: (next: PortalTab) => void;
  onSignOut?: () => void;
  overlay?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showNav = Boolean(onTabChange && tab);

  function goTo(next: PortalTab) {
    onTabChange?.(next);
    setMenuOpen(false);
  }

  return (
    <header
      className={
        overlay
          ? 'absolute inset-x-0 top-0 z-30 bg-transparent'
          : 'sticky top-0 z-30 border-b border-sand/70 bg-white/95 backdrop-blur'
      }
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
        <button
          type="button"
          className="inline-flex min-w-0 items-center text-left"
          onClick={() => (onTabChange ? goTo('home') : undefined)}
          aria-label="Home"
        >
          <BrandMark />
        </button>
        {showNav ? (
          <>
            <nav
              aria-label="Portal"
              className="hidden items-center gap-2 md:flex"
            >
              {PORTAL_TABS.map((id) => {
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
              })}
              {onSignOut ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="site-nav-link"
                >
                  Sign out
                </button>
              ) : null}
            </nav>
            <button
              type="button"
              className="site-nav-link md:hidden"
              aria-expanded={menuOpen}
              aria-controls="portal-mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              Menu
            </button>
          </>
        ) : onSignOut ? (
          <button type="button" onClick={onSignOut} className="site-nav-link">
            Sign out
          </button>
        ) : null}
      </div>
      {showNav && menuOpen ? (
        <nav
          id="portal-mobile-menu"
          aria-label="Portal"
          className="border-t border-sand/70 bg-white/95 px-5 py-3 backdrop-blur md:hidden"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-2">
            {PORTAL_TABS.map((id) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => goTo(id)}
                  className="site-nav-link w-full text-left"
                >
                  {PORTAL_TAB_LABEL[id]}
                </button>
              );
            })}
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
