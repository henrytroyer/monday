import { useState } from 'react';
import ApplicationsPage from './ApplicationsPage';
import ContactsPage from './ContactsPage';
import EmailTemplatesPage from './EmailTemplatesPage';

export default function Dashboard() {
  const [activePage, setActivePage] = useState('applications');

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className="w-72 shrink-0 border-r border-slate-200 bg-white p-6">
        <div>
          <h1 className="text-2xl font-bold">CRM Prototype</h1>
          <p className="mt-2 text-sm text-slate-500">
            Volunteer operations dashboard
          </p>
        </div>

        <nav className="mt-10 space-y-2">
          {(
            [
              ['contacts', 'Contacts'],
              ['applications', 'Applications'],
              ['email-templates', 'Email templates'],
              ['forms', 'Forms'],
              ['automations', 'Automations'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActivePage(id)}
              className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                activePage === id
                  ? 'bg-slate-900 text-white'
                  : 'hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-8">
        {activePage === 'applications' && <ApplicationsPage />}

        {activePage === 'contacts' && <ContactsPage />}

        {activePage === 'email-templates' && <EmailTemplatesPage />}

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
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-500">{description}</p>
      <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-500">
        Prototype placeholder — we can build this section next.
      </p>
    </div>
  );
}
