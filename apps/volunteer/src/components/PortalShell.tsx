import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { SiteFooter } from './SiteFooter';
import type { GeneralInfoSectionId, PortalTab } from '../lib/nav';

export function PortalShell({
  tab,
  generalInfoSection = null,
  onTabChange,
  onGeneralInfoSection,
  onSignOut,
  portalName,
  toast,
  footerTone = 'soft',
  children,
}: {
  tab: PortalTab;
  generalInfoSection?: GeneralInfoSectionId | null;
  onTabChange: (next: Exclude<PortalTab, 'generalInfo'>) => void;
  onGeneralInfoSection: (section: GeneralInfoSectionId) => void;
  onSignOut: () => void;
  portalName?: string | null;
  toast?: string | null;
  footerTone?: 'soft' | 'white';
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-crm-white">
      <AppHeader
        tab={tab}
        generalInfoSection={generalInfoSection}
        onTabChange={onTabChange}
        onGeneralInfoSection={onGeneralInfoSection}
        onSignOut={onSignOut}
        portalName={portalName}
      />
      {toast ? (
        <p role="status" className="mx-auto mt-4 w-full max-w-5xl px-5">
          <span className="block rounded-xl border border-navy/15 bg-crm-indigo-50 px-3 py-2 text-sm text-navy">
            {toast}
          </span>
        </p>
      ) : null}
      <main
        className={`mx-auto w-full flex-1 px-5 ${
          tab === 'volunteer'
            ? 'max-w-6xl pt-0 pb-8'
            : tab === 'visionValues'
              ? 'max-w-5xl pt-8 pb-0'
              : 'max-w-5xl py-8'
        }`}
      >
        {children}
      </main>
      <SiteFooter tone={footerTone} />
    </div>
  );
}
