import { useMemo, useState } from 'react';
import { canEditEmailTemplates } from '../../config/boards';
import { emailTemplateMap } from '../../config/emailTemplateMap';
import EmailTemplateEditor from '../email-templates/EmailTemplateEditor';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';
import type { EmailTemplate, EmailTemplateInput } from '../../types/emailTemplate';

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
  { key: 'onboardingProgressSummary', description: 'Onboarding pipeline summary' },
  { key: 'referenceTypeLabel', description: 'Reference type label' },
];

function emptyDraft(): EmailTemplateInput {
  return {
    name: '',
    templateId: '',
    subject: '',
    body: '',
  };
}

function toDraft(template: EmailTemplate): EmailTemplateInput {
  return {
    name: template.name,
    templateId: template.templateId,
    subject: template.subject,
    body: template.body,
  };
}

export default function EmailTemplatesSection() {
  const {
    templates,
    loading,
    error,
    refetch,
    createTemplate,
    saveTemplate,
    removeTemplate,
  } = useEmailTemplates();
  const editable = canEditEmailTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<EmailTemplateInput>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [selectedId, templates],
  );

  const startCreate = () => {
    setCreating(true);
    setSelectedId(null);
    setDraft(emptyDraft());
    setStatusMessage(null);
  };

  const startEdit = (template: EmailTemplate) => {
    setCreating(false);
    setSelectedId(template.id);
    setDraft(toDraft(template));
    setStatusMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      if (creating) {
        const created = await createTemplate(draft);
        setCreating(false);
        setSelectedId(created.id);
        setStatusMessage('Template created.');
      } else if (selectedTemplate) {
        await saveTemplate(selectedTemplate, draft);
        setStatusMessage('Template saved.');
      }
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Could not save template.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate || !editable) return;
    if (!window.confirm(`Delete "${selectedTemplate.name}"?`)) return;

    setSaving(true);
    setStatusMessage(null);
    try {
      await removeTemplate(selectedTemplate.id);
      setSelectedId(null);
      setDraft(emptyDraft());
      setCreating(false);
      setStatusMessage('Template deleted.');
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Could not delete template.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-crm-heading">Templates</h2>
          <p className="mt-1 max-w-2xl text-sm text-crm-slate">
            Imported from the monday.com Communications docs folder and stored on{' '}
            <strong>{emailTemplateMap.boardName}</strong>. Use{' '}
            <code className="text-crm-text">{'{{fieldName}}'}</code> merge fields
            when sending from applications or contacts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
          >
            Refresh
          </button>
          {editable && (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
            >
              New template
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid min-h-0 flex-1 gap-6 overflow-hidden lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <section className="min-h-0 overflow-y-auto rounded-2xl border border-crm-taupe/20 bg-crm-surface p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-crm-slate">
            All templates
          </h3>
          {loading ? (
            <p className="mt-4 text-sm text-crm-slate">Loading templates…</p>
          ) : error ? (
            <p className="mt-4 text-sm text-amber-800">{error}</p>
          ) : templates.length === 0 ? (
            <p className="mt-4 text-sm text-crm-slate">
              No templates yet. Run{' '}
              <code className="text-crm-text">
                npm run import:communications-docs
              </code>{' '}
              or create one here.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {templates.map((template) => {
                const active = selectedId === template.id && !creating;
                return (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? 'border-crm-indigo bg-crm-taupe-50 ring-1 ring-crm-indigo'
                          : 'border-crm-taupe/20 hover:border-crm-taupe/28 hover:bg-crm-taupe-50'
                      }`}
                    >
                      <p className="font-medium text-crm-heading">
                        {template.name}
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm text-crm-slate">
                        {template.subject || 'No subject'}
                      </p>
                      <p className="mt-1 font-mono text-xs text-crm-slate">
                        {template.templateId}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="min-h-0 overflow-y-auto rounded-2xl border border-crm-taupe/20 bg-crm-surface p-6 shadow-sm">
          {creating || selectedTemplate ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-crm-heading">
                  {creating ? 'New template' : 'Edit template'}
                </h3>
                {!creating && editable && selectedTemplate && (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={saving}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
              <EmailTemplateEditor
                draft={draft}
                onChange={setDraft}
                onSave={() => void handleSave()}
                saving={saving}
                readOnly={!editable}
                saveLabel={creating ? 'Create template' : 'Save changes'}
              />
            </>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <p className="text-sm text-crm-slate">
                Select a template to edit, or create a new one.
              </p>
            </div>
          )}

          {statusMessage && (
            <p className="mt-4 text-sm text-crm-slate" role="status">
              {statusMessage}
            </p>
          )}

          <div className="mt-8 rounded-xl bg-crm-taupe-50 p-4">
            <h4 className="text-sm font-semibold text-crm-heading">
              Merge fields
            </h4>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {MERGE_FIELDS.map((field) => (
                <div key={field.key} className="flex gap-2 text-sm">
                  <dt className="shrink-0 font-mono text-crm-text">
                    {`{{${field.key}}}`}
                  </dt>
                  <dd className="text-crm-slate">{field.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}
