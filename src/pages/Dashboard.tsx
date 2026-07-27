import { useEffect, useState } from 'react';
import AppSidebar from '../components/layout/AppSidebar';
import { type PageId } from '../constants/navItems';
import KeepAlivePage from '../components/layout/KeepAlivePage';
import { useLayout } from '../context/LayoutContext';
import { useMondayBoardWatcher } from '../hooks/useMondayBoardWatcher';
import {
  getInitialActivePage,
  getInitialMountedPages,
  patchCrmNavigationState,
} from '../services/crmNavigationStorage';
import ApplicationsPage from './ApplicationsPage';
import ContactsPage from './ContactsPage';
import EmailAdminPage from './EmailAdminPage';
import LongtermApplicationsPage from './LongtermApplicationsPage';
import HistoryPage from './HistoryPage';
import RecruitmentPage from './RecruitmentPage';

export default function Dashboard() {
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

  const handleNavigate = (id: PageId) => {
    setActivePage(id);
    closeSidebar();
  };

  const handleGoToRecruitment = (prospectId: string) => {
    setRecruitmentFocusId(prospectId);
    setActivePage('recruitment');
    closeSidebar();
  };

  const handleGoToApplication = (applicationId: string) => {
    setApplicationFocusId(applicationId);
    setActivePage('applications');
    closeSidebar();
  };

  const handleGoToContact = (contactId: string) => {
    setContactFocusId(contactId);
    setActivePage('contacts');
    closeSidebar();
  };

  return (
    <div className="flex h-screen bg-crm-white">
      <AppSidebar activePage={activePage} onNavigate={handleNavigate} />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-8">
        <KeepAlivePage
          active={activePage === 'applications'}
          mounted={mountedPages.has('applications')}
        >
          <ApplicationsPage
            focusApplicationId={applicationFocusId}
            onClearFocus={() => setApplicationFocusId(null)}
          />
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'contacts'}
          mounted={mountedPages.has('contacts')}
        >
          <ContactsPage
            focusContactId={contactFocusId}
            onClearFocus={() => setContactFocusId(null)}
            onGoToRecruitment={handleGoToRecruitment}
            onGoToApplication={handleGoToApplication}
          />
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'history'}
          mounted={mountedPages.has('history')}
        >
          <HistoryPage
            onNavigate={handleNavigate}
            onFocusApplication={handleGoToApplication}
            onFocusRecruitment={handleGoToRecruitment}
            onFocusContact={handleGoToContact}
          />
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'email'}
          mounted={mountedPages.has('email')}
        >
          <EmailAdminPage
            onOpenApplication={handleGoToApplication}
            onOpenContact={handleGoToContact}
          />
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'recruitment'}
          mounted={mountedPages.has('recruitment')}
        >
          <RecruitmentPage
            focusProspectId={recruitmentFocusId}
            onClearFocus={() => setRecruitmentFocusId(null)}
          />
        </KeepAlivePage>

        <KeepAlivePage
          active={activePage === 'longterm-applications'}
          mounted={mountedPages.has('longterm-applications')}
        >
          <LongtermApplicationsPage />
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
