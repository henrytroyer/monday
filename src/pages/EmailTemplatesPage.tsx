import { EMAIL_TEMPLATES } from '../data/emailTemplates';

const MERGE_FIELDS = [
  { key: 'name', description: 'Volunteer full name' },
  { key: 'firstName', description: 'First name' },
  { key: 'email', description: 'Selected recipient address' },
  { key: 'recipientLabel', description: 'Recipient role (e.g. Parent, Pastor)' },
  { key: 'locationPreference', description: 'Location preference' },
  { key: 'location', description: 'Assigned location' },
  { key: 'timelineLabel', description: 'Signup timeline label' },
  { key: 'status', description: 'Application status' },
  { key: 'coordinator', description: 'Coordinator name' },
  { key: 'housing', description: 'Housing' },
  { key: 'phone', description: 'Phone number' },
  { key: 'onboardingProgressSummary', description: 'Full onboarding pipeline status summary (multi-line)' },
  { key: 'currentStepTitle', description: 'Current incomplete onboarding step' },
  { key: 'nextStepTitle', description: 'Next projected onboarding step' },
  { key: 'nextStepProjectedDate', description: 'Projected date for next step' },
  { key: 'completedStepCount', description: 'Number of completed onboarding steps' },
  { key: 'totalStepCount', description: 'Total onboarding steps (9)' },
];

export default function EmailTemplatesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0">
        <h1 className="text-4xl font-semibold text-crm-heading">Email templates</h1>
        <p className="mt-2 max-w-2xl text-crm-slate">
          Templates used when you send email from an application. Edit{' '}
          <code className="rounded bg-crm-taupe-100 px-1.5 py-0.5 text-sm text-crm-text">
            src/data/emailTemplates.ts
          </code>{' '}
          to add or change templates (requires a deploy).
        </p>
      </header>

      <div className="mt-8 min-h-0 flex-1 overflow-y-auto">
        <div className="mb-8 rounded-2xl border border-crm-taupe/20 bg-crm-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-crm-heading">Merge fields</h2>
          <p className="mt-1 text-sm text-crm-slate">
            Use <code className="text-crm-text">{'{{fieldName}}'}</code> in
            subject or body.
          </p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {MERGE_FIELDS.map((field) => (
              <div
                key={field.key}
                className="flex gap-3 rounded-xl bg-crm-taupe-50 px-3 py-2 text-sm"
              >
                <dt className="shrink-0 font-mono text-crm-text">
                  {`{{${field.key}}}`}
                </dt>
                <dd className="text-crm-slate">{field.description}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-4">
          {EMAIL_TEMPLATES.map((template) => (
            <article
              key={template.id}
              className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-crm-heading">
                    {template.name}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-crm-slate">
                    {template.id}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
                  Subject
                </p>
                <p className="mt-1 text-sm font-medium text-crm-heading">
                  {template.subject}
                </p>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
                  Body
                </p>
                <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-crm-taupe-50 p-4 font-sans text-sm text-crm-text">
                  {template.body}
                </pre>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
