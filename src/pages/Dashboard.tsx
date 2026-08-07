/**
 * Dashboard.tsx — CRM shell (open access for allowlisted operators).
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import AppSidebar from '../components/layout/AppSidebar';
import type { PageId } from '../constants/navItems';
import KeepAlivePage from '../components/layout/KeepAlivePage';
import CrmPageLoading from '../components/shared/CrmPageLoading';
import { useCurrentUser } from '../context/useCurrentUser';
import { useLayout } from '../context/LayoutContext';
import { useMondayBoardWatcher } from '../hooks/useMondayBoardWatcher';
import {
  getInitialActivePage,
  getInitialMountedPages,
  patchCrmNavigationState,
} from '../services/crmNavigationStorage';

const ApplicationsPage = lazy(() => import('./ApplicationsPage'));
const ContactsPage = lazy(() => import('./ContactsPage'));
const EmailTemplatesPage = lazy(() => import('./EmailTemplatesPage'));
const EmailCampaignsPage = lazy(() => import('./EmailCampaignsPage'));
const HistoryPage = lazy(() => import('./HistoryPage'));
const RecruitmentPage = lazy(() => import('./RecruitmentPage'));
const LongtermApplicationsPage = lazy(() => import('./LongtermApplicationsPage'));
const UserSettingsPage = lazy(() => import('./UserSettingsPage'));
const AuditLogPage = lazy(() => import('./AuditLogPage'));
const ContactMergeOpsPage = lazy(() => import('./ContactMergeOpsPage'));

const shellBootGlobal = globalThis as typeof globalThis & {
  __crmShellBooted?: boolean;
};

export default function Dashboard() {
  const { isLoading: userLoading } = useCurrentUser();
  // Once the shell has mounted, never replace it with the fullscreen boot loader
  // again — that unmounted DashboardInner and wiped open contact/detail state.
  const [shellBooted, setShellBooted] = useState(
    () => Boolean(shellBootGlobal.__crmShellBooted),
  );

  useEffect(() => {
    if (!userLoading) {
      shellBootGlobal.__crmShellBooted = true;
      setShellBooted(true);
    }
  }, [userLoading]);

  // After first successful boot in this JS realm, keep the shell mounted even if
  // providers briefly report not-ready (full document reload still resets).
  const showingBootLoader = !shellBooted && userLoading;

  if (showingBootLoader) {
    return <CrmPageLoading variant="fullscreen" />;
  }
  return <DashboardInner />;
}

function DashboardInner() {
  const [activePage, setActivePage] = useState<PageId>(getInitialActivePage);
  const [mountedPages, setMountedPages] =
    useState<Set<PageId>>(getInitialMountedPages);
  const [recruitmentFocusId, setRecruitmentFocusId] = useState<string | null>(
    null,
  );
  const [applicationFocusId, setApplicationFocusId] = useState<string | null>(
    null,
  );
  const [contactFocusId, setContactFocusId] = useState<string | null>(null);
  const [longtermFocusId, setLongtermFocusId] = useState<string | null>(null);
  const { closeSidebar } = useLayout();
  useMondayBoardWatcher();

  useEffect(() => {
    patchCrmNavigationState({ activePage });
  }, [activePage]);

  useEffect(() => {
    setMountedPages((prev) => {
      if (prev.has(activePage)) return prev;
      return new Set(prev).add(activePage);
    });
  }, [activePage]);

  const goToPage = (id: PageId) => {
    setMountedPages((prev) => {
      if (prev.has(id)) return prev;
      return new Set(prev).add(id);
    });
    setActivePage(id);
    closeSidebar();
  };

  const handleNavigate = (id: PageId) => {
    goToPage(id);
  };

  const handleGoToRecruitment = (prospectId: string) => {
    setRecruitmentFocusId(prospectId);
    goToPage('recruitment');
  };

  const handleGoToApplication = (applicationId: string) => {
    setApplicationFocusId(applicationId);
    goToPage('applications');
  };

  const handleGoToContact = (contactId: string) => {
    setContactFocusId(contactId);
    goToPage('contacts');
  };

  const handleGoToLongtermApplication = (applicationId: string) => {
    setLongtermFocusId(applicationId);
    goToPage('longterm-applications');
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] bg-crm-white">
      <AppSidebar activePage={activePage} onNavigate={handleNavigate} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[calc(3.25rem+env(safe-area-inset-top))] md:p-8 md:pt-8">
        <KeepAlivePage
          active={activePage === 'applications'}
          mounted={mountedPages.has('applications')}
        >
          <Suspense fallback={<PageLoadFallback label="Applications" />}>
            <ApplicationsPage
              focusApplicationId={applicationFocusId}
              onClearFocus={() => setApplicationFocusId(null)}
            />
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'contacts'}
          mounted={mountedPages.has('contacts')}
        >
          <Suspense fallback={<PageLoadFallback label="Contacts" />}>
            <ContactsPage
              focusContactId={contactFocusId}
              onClearFocus={() => setContactFocusId(null)}
              onGoToRecruitment={handleGoToRecruitment}
              onGoToApplication={handleGoToApplication}
            />
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'history'}
          mounted={mountedPages.has('history')}
        >
          <Suspense fallback={<PageLoadFallback label="History" />}>
            <HistoryPage
              onNavigate={handleNavigate}
              onFocusApplication={handleGoToApplication}
              onFocusRecruitment={handleGoToRecruitment}
              onFocusContact={handleGoToContact}
              onFocusLongtermApplication={handleGoToLongtermApplication}
            />
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'email-templates'}
          mounted={mountedPages.has('email-templates')}
        >
          <Suspense fallback={<PageLoadFallback label="Email templates" />}>
            <EmailTemplatesPage />
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'email-campaigns'}
          mounted={mountedPages.has('email-campaigns')}
        >
          <Suspense fallback={<PageLoadFallback label="Email campaigns" />}>
            <EmailCampaignsPage />
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'recruitment'}
          mounted={mountedPages.has('recruitment')}
        >
          <Suspense fallback={<PageLoadFallback label="Recruitment" />}>
            <RecruitmentPage
              focusProspectId={recruitmentFocusId}
              onClearFocus={() => setRecruitmentFocusId(null)}
            />
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'longterm-applications'}
          mounted={mountedPages.has('longterm-applications')}
        >
          <Suspense fallback={<PageLoadFallback label="Long-term applications" />}>
            <LongtermApplicationsPage
              focusApplicationId={longtermFocusId}
              onClearFocus={() => setLongtermFocusId(null)}
            />
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'user-settings'}
          mounted={mountedPages.has('user-settings')}
        >
          <Suspense fallback={<PageLoadFallback label="User settings" />}>
            <UserSettingsPage />
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'audit-log'}
          mounted={mountedPages.has('audit-log')}
        >
          <Suspense fallback={<PageLoadFallback label="Audit log" />}>
            <AuditLogPage />
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'contact-merge-ops'}
          mounted={mountedPages.has('contact-merge-ops')}
        >
          <Suspense fallback={<PageLoadFallback label="Contact merge ops" />}>
            <ContactMergeOpsPage />
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'forms'}
          mounted={mountedPages.has('forms')}
        >
          <PlaceholderPage
            title="Forms"
            description="Application forms and references"
          />
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'automations'}
          mounted={mountedPages.has('automations')}
        >
          <PlaceholderPage
            title="Automations"
            description="Workflow and email automations"
          />
        </KeepAlivePage>
      </main>
    </div>
  );
}

function PageLoadFallback({ label }: { label: string }) {
  return (
    <CrmPageLoading
      label={`i58 Volunteer portal · ${label}`}
      className="min-h-0 flex-1"
    />
  );
}

function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-4xl font-semibold text-crm-heading">{title}</h1>
      <p className="mt-2 text-crm-slate">{description}</p>
      <p className="mt-8 rounded-2xl border border-dashed border-crm-taupe/28 bg-crm-surface p-6 text-crm-slate">
        Prototype placeholder — we can build this section next.
      </p>
    </div>
  );
}
