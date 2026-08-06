/**
 * Dashboard.tsx — CRM shell with permission-gated pages.
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import AppSidebar from '../components/layout/AppSidebar';
import { permissionForPage, type PageId } from '../constants/navItems';
import KeepAlivePage from '../components/layout/KeepAlivePage';
import PermissionGate from '../components/shared/PermissionGate';
import CrmProviders from '../context/CrmProviders';
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
const CrmUsersPage = lazy(() => import('./CrmUsersPage'));
const UserSettingsPage = lazy(() => import('./UserSettingsPage'));
const RolesPermissionsPage = lazy(() => import('./RolesPermissionsPage'));
const AuditLogPage = lazy(() => import('./AuditLogPage'));

export default function Dashboard() {
  return (
    <CrmProviders>
      <DashboardInner />
    </CrmProviders>
  );
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
    <div className="flex h-screen bg-crm-white">
      <AppSidebar activePage={activePage} onNavigate={handleNavigate} />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-8">
        <KeepAlivePage
          active={activePage === 'applications'}
          mounted={mountedPages.has('applications')}
        >
          <Suspense fallback={<PageLoadFallback label="Applications" />}>
            <PermissionGate permission={permissionForPage('applications')}>
              <ApplicationsPage
                focusApplicationId={applicationFocusId}
                onClearFocus={() => setApplicationFocusId(null)}
              />
            </PermissionGate>
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'contacts'}
          mounted={mountedPages.has('contacts')}
        >
          <Suspense fallback={<PageLoadFallback label="Contacts" />}>
            <PermissionGate permission={permissionForPage('contacts')}>
              <ContactsPage
                focusContactId={contactFocusId}
                onClearFocus={() => setContactFocusId(null)}
                onGoToRecruitment={handleGoToRecruitment}
                onGoToApplication={handleGoToApplication}
              />
            </PermissionGate>
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'history'}
          mounted={mountedPages.has('history')}
        >
          <Suspense fallback={<PageLoadFallback label="History" />}>
            <PermissionGate permission={permissionForPage('history')}>
              <HistoryPage
                onNavigate={handleNavigate}
                onFocusApplication={handleGoToApplication}
                onFocusRecruitment={handleGoToRecruitment}
                onFocusContact={handleGoToContact}
                onFocusLongtermApplication={handleGoToLongtermApplication}
              />
            </PermissionGate>
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'email-templates'}
          mounted={mountedPages.has('email-templates')}
        >
          <Suspense fallback={<PageLoadFallback label="Email templates" />}>
            <PermissionGate permission={permissionForPage('email-templates')}>
              <EmailTemplatesPage />
            </PermissionGate>
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'email-campaigns'}
          mounted={mountedPages.has('email-campaigns')}
        >
          <Suspense fallback={<PageLoadFallback label="Email campaigns" />}>
            <PermissionGate permission={permissionForPage('email-campaigns')}>
              <EmailCampaignsPage />
            </PermissionGate>
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'recruitment'}
          mounted={mountedPages.has('recruitment')}
        >
          <Suspense fallback={<PageLoadFallback label="Recruitment" />}>
            <PermissionGate permission={permissionForPage('recruitment')}>
              <RecruitmentPage
                focusProspectId={recruitmentFocusId}
                onClearFocus={() => setRecruitmentFocusId(null)}
              />
            </PermissionGate>
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'longterm-applications'}
          mounted={mountedPages.has('longterm-applications')}
        >
          <Suspense fallback={<PageLoadFallback label="Long-term applications" />}>
            <PermissionGate permission={permissionForPage('longterm-applications')}>
              <LongtermApplicationsPage
                focusApplicationId={longtermFocusId}
                onClearFocus={() => setLongtermFocusId(null)}
              />
            </PermissionGate>
          </Suspense>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'users'}
          mounted={mountedPages.has('users')}
        >
          <Suspense fallback={<PageLoadFallback label="Users" />}>
            <CrmUsersPage />
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
          active={activePage === 'roles-permissions'}
          mounted={mountedPages.has('roles-permissions')}
        >
          <Suspense fallback={<PageLoadFallback label="Roles & permissions" />}>
            <RolesPermissionsPage />
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
          active={activePage === 'forms'}
          mounted={mountedPages.has('forms')}
        >
          <PermissionGate permission="settings.view">
            <PlaceholderPage
              title="Forms"
              description="Application forms and references"
            />
          </PermissionGate>
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'automations'}
          mounted={mountedPages.has('automations')}
        >
          <PermissionGate permission="settings.view">
            <PlaceholderPage
              title="Automations"
              description="Workflow and email automations"
            />
          </PermissionGate>
        </KeepAlivePage>
      </main>
    </div>
  );
}

function PageLoadFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-crm-slate">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-crm-taupe/30 border-t-crm-heading"
        aria-hidden
      />
      <p className="text-sm">Loading {label}…</p>
    </div>
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
