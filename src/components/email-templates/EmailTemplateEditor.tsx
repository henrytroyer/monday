import { useState } from 'react';
import type { EmailTemplateInput } from '../../types/emailTemplate';
import EmailOutgoingPreviewDialog from '../email-admin/EmailOutgoingPreviewDialog';
import ProfessionalEmailComposer from '../email/ProfessionalEmailComposer';

interface EmailTemplateEditorProps {
  draft: EmailTemplateInput;
  onChange: (draft: EmailTemplateInput) => void;
  onSave: () => void;
  onCancel?: () => void;
  saving: boolean;
  readOnly?: boolean;
  saveLabel?: string;
  mergeContext?: Record<string, string>;
}

export default function EmailTemplateEditor({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  readOnly = false,
  saveLabel = 'Save template',
  mergeContext,
}: EmailTemplateEditorProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="template-name" className="text-sm font-medium text-crm-heading">
            Name
          </label>
          <input
            id="template-name"
            type="text"
            value={draft.name}
            disabled={readOnly}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20 disabled:bg-crm-taupe-50"
          />
        </div>

        <div>
          <label htmlFor="template-id" className="text-sm font-medium text-crm-heading">
            Template ID
          </label>
          <p className="mt-1 text-xs text-crm-slate">
            Slug for automations (e.g. <code className="text-crm-text">pastor-reference-request</code>)
          </p>
          <input
            id="template-id"
            type="text"
            value={draft.templateId}
            disabled={readOnly}
            onChange={(event) =>
              onChange({ ...draft, templateId: event.target.value })
            }
            className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 font-mono text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20 disabled:bg-crm-taupe-50"
          />
        </div>
      </div>

      <ProfessionalEmailComposer
        subject={draft.subject}
        body={draft.body}
        onSubjectChange={(subject) => onChange({ ...draft, subject })}
        onBodyChange={(body) => onChange({ ...draft, body })}
        mergeContext={mergeContext}
        disabled={readOnly}
        mode="template"
        insertMode="token"
        layout="split"
        autoAppendSignature={false}
        showExtendedHeaders={false}
      />

      {!readOnly && (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
          >
            Preview outgoing email
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={saving || !draft.name.trim() || !draft.templateId.trim()}
            onClick={onSave}
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      )}

      {readOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
          >
            Preview outgoing email
          </button>
        </div>
      )}

      <EmailOutgoingPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        subject={draft.subject}
        body={draft.body}
        templateName={draft.name.trim() || undefined}
        mergeContext={mergeContext}
      />
    </div>
  );
}
