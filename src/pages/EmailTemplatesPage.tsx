import {
  EMAIL_TEMPLATES,
  getSupermailMinedAt,
} from '../data/emailTemplates';
import EmailTemplateSourceBadge from '../components/email-templates/EmailTemplateSourceBadge';
import { groupEmailTemplates } from '../utils/emailTemplateDisplay';

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
  const { crm, supermail } = groupEmailTemplates();
  const minedAt = getSupermailMinedAt();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0">
        <h1 className="text-4xl font-semibold text-crm-heading">Email templates</h1>
        <p className="mt-2 max-w-2xl text-crm-slate">
          Templates used when you send email from an application. Built-in CRM
          templates live in{' '}
          <code className="rounded bg-crm-taupe-100 px-1.5 py-0.5 text-sm text-crm-text">
            src/data/emailTemplates.ts
          </code>
          . SuperMail templates are mined from outgoing send logs on the
          Applications board via{' '}
          <code className="rounded bg-crm-taupe-100 px-1.5 py-0.5 text-sm text-crm-text">
            npm run mine:supermail-templates
          </code>
          .
        </p>
        {minedAt && (
          <p className="mt-2 text-sm text-crm-slate">
            Last SuperMail import:{' '}
            <time dateTime={minedAt}>
              {new Date(minedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </time>
            {' · '}
            {supermail.length} mined template{supermail.length === 1 ? '' : 's'}
          </p>
        )}
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

        <TemplateSection title="CRM templates" templates={crm} />
        <TemplateSection
          title="SuperMail templates (mined)"
          templates={supermail}
          emptyMessage="No SuperMail templates yet. Run npm run mine:supermail-templates with MONDAY_API_TOKEN configured."
        />
      </div>
    </div>
  );
}

function TemplateSection({
  title,
  templates,
  emptyMessage,
}: {
  title: string;
  templates: typeof EMAIL_TEMPLATES;
  emptyMessage?: string;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold text-crm-heading">{title}</h2>
      {templates.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-crm-taupe/30 bg-crm-taupe-50/50 px-6 py-8 text-sm text-crm-slate">
          {emptyMessage ?? 'No templates in this section.'}
        </p>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <article
              key={template.id}
              className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-crm-heading">
                      {template.name}
                    </h3>
                    <EmailTemplateSourceBadge source={template.source} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-crm-slate">
                    {template.id}
                  </p>
                  {template.source === 'supermail' && (
                    <p className="mt-1 text-xs text-crm-slate">
                      {template.sendCount ?? 1} send
                      {(template.sendCount ?? 1) === 1 ? '' : 's'} matched
                      {template.minedAt
                        ? ` · mined ${new Date(template.minedAt).toLocaleDateString()}`
                        : ''}
                    </p>
                  )}
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
      )}
    </section>
  );
}
