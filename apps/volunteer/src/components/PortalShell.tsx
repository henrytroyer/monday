import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { SiteFooter } from './SiteFooter';
import type { PortalTab } from '../lib/nav';

export function PortalShell({
  tab,
  onTabChange,
  onSignOut,
  toast,
  children,
}: {
  tab: PortalTab;
  onTabChange: (next: PortalTab) => void;
  onSignOut: () => void;
  toast?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-crm-white">
      <AppHeader tab={tab} onTabChange={onTabChange} onSignOut={onSignOut} />
      {toast ? (
        <p role="status" className="mx-auto mt-4 w-full max-w-5xl px-5">
          <span className="block rounded-xl border border-navy/15 bg-crm-indigo-50 px-3 py-2 text-sm text-navy">
            {toast}
          </span>
        </p>
      ) : null}
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
