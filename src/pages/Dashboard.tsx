import { useState } from 'react';
import AppSidebar, { type PageId } from '../components/layout/AppSidebar';
import { useLayout } from '../context/LayoutContext';
import ApplicationsPage from './ApplicationsPage';
import ContactsPage from './ContactsPage';
import EmailTemplatesPage from './EmailTemplatesPage';
import LongtermApplicationsPage from './LongtermApplicationsPage';
import RecruitmentPage from './RecruitmentPage';

export default function Dashboard() {
  const [activePage, setActivePage] = useState<PageId>('applications');
  const [recruitmentFocusId, setRecruitmentFocusId] = useState<string | null>(
    null,
  );
  const [applicationFocusId, setApplicationFocusId] = useState<string | null>(
    null,
  );
  const { closeSidebar } = useLayout();

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

  return (
    <div className="flex h-screen bg-crm-white">
      <AppSidebar activePage={activePage} onNavigate={handleNavigate} />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-8">
        {activePage === 'applications' && (
          <ApplicationsPage
            focusApplicationId={applicationFocusId}
            onClearFocus={() => setApplicationFocusId(null)}
          />
        )}

        {activePage === 'contacts' && (
          <ContactsPage
            onGoToRecruitment={handleGoToRecruitment}
            onGoToApplication={handleGoToApplication}
          />
        )}

        {activePage === 'email-templates' && <EmailTemplatesPage />}

        {activePage === 'recruitment' && (
          <RecruitmentPage
            focusProspectId={recruitmentFocusId}
            onClearFocus={() => setRecruitmentFocusId(null)}
          />
        )}

        {activePage === 'longterm-applications' && <LongtermApplicationsPage />}

        {activePage === 'forms' && (
          <PlaceholderPage
            title="Forms"
            description="Application forms and references"
          />
        )}

        {activePage === 'automations' && (
          <PlaceholderPage
            title="Automations"
            description="Workflow and email automations"
          />
        )}
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
