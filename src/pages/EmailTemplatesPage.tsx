/**
 * EmailTemplatesPage.tsx — Communications → Email templates.
 */

import EmailTemplatesSection from '../components/email-admin/EmailTemplatesSection';

export default function EmailTemplatesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0">
        <h1 className="text-4xl font-semibold text-crm-heading">
          Email templates
        </h1>
        <p className="mt-2 max-w-3xl text-crm-slate">
          Create and edit email templates synced with the portal.
        </p>
      </header>
      <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
        <EmailTemplatesSection />
      </div>
    </div>
  );
}
