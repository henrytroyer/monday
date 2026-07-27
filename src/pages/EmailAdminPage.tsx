import { useState } from 'react';
import EmailAdminNav from '../components/email-admin/EmailAdminNav';
import EmailAccountsSection from '../components/email-admin/EmailAccountsSection';
import EmailMasterLogSection from '../components/email-admin/EmailMasterLogSection';
import EmailOverviewSection from '../components/email-admin/EmailOverviewSection';
import EmailTemplatesSection from '../components/email-admin/EmailTemplatesSection';
import {
  readEmailAdminTab,
  writeEmailAdminTab,
} from '../components/email-admin/emailAdminTabs';
import type { EmailAdminTab } from '../types/emailAdmin';

interface EmailAdminPageProps {
  onOpenApplication?: (itemId: string) => void;
  onOpenContact?: (contactId: string) => void;
}

export default function EmailAdminPage({
  onOpenApplication,
  onOpenContact,
}: EmailAdminPageProps) {
  const [activeTab, setActiveTab] = useState<EmailAdminTab>(readEmailAdminTab);

  const handleTabChange = (tab: EmailAdminTab) => {
    setActiveTab(tab);
    writeEmailAdminTab(tab);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0">
        <h1 className="text-4xl font-semibold text-crm-heading">Email Control</h1>
        <p className="mt-2 max-w-3xl text-crm-slate">
          Admin console for linked mailboxes, template library, and the master log
          of all volunteer correspondence.
        </p>
      </header>

      <div className="mt-6 shrink-0">
        <EmailAdminNav activeTab={activeTab} onChange={handleTabChange} />
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === 'overview' && (
          <EmailOverviewSection onNavigateTab={handleTabChange} />
        )}
        {activeTab === 'templates' && <EmailTemplatesSection />}
        {activeTab === 'accounts' && <EmailAccountsSection />}
        {activeTab === 'log' && (
          <EmailMasterLogSection
            onOpenApplication={onOpenApplication}
            onOpenContact={onOpenContact}
          />
        )}
      </div>
    </div>
  );
}
