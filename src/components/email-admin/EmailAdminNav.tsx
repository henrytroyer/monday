import type { EmailAdminTab } from '../../types/emailAdmin';
import { EMAIL_ADMIN_TABS } from './emailAdminTabs';

interface EmailAdminNavProps {
  activeTab: EmailAdminTab;
  onChange: (tab: EmailAdminTab) => void;
}

export default function EmailAdminNav({
  activeTab,
  onChange,
}: EmailAdminNavProps) {
  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-crm-taupe/20 pb-4"
      aria-label="Email admin sections"
    >
      {EMAIL_ADMIN_TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              active
                ? 'bg-crm-indigo text-white shadow-sm'
                : 'border border-crm-taupe/20 text-crm-heading hover:bg-crm-taupe-50'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
