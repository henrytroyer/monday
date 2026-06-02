import { useEffect, useMemo, useState } from 'react';
import { EMAIL_TEMPLATES } from '../../data/emailTemplates';
import { sendApplicationEmail } from '../../services/crmApi';
import type { ApplicationEmail } from '../../types/volunteer';
import type { VolunteerDetail } from '../../types/volunteer';
import {
  buildMailtoUrl,
  buildMergeContext,
  mergeEmailTemplate,
} from '../../utils/emailMerge';

interface SendEmailModalProps {
  detail: VolunteerDetail;
  onClose: () => void;
}

export default function SendEmailModal({ detail, onClose }: SendEmailModalProps) {
  const recipients = detail.emails;
  const [recipientIndex, setRecipientIndex] = useState(0);
  const [templateId, setTemplateId] = useState(EMAIL_TEMPLATES[0]?.id ?? '');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedRecipient: ApplicationEmail | undefined =
    recipients[recipientIndex];
  const selectedTemplate =
    EMAIL_TEMPLATES.find((t) => t.id === templateId) ?? EMAIL_TEMPLATES[0];

  const merged = useMemo(() => {
    if (!selectedRecipient || !selectedTemplate) {
      return { subject: '', body: '' };
    }
    const context = buildMergeContext(detail, selectedRecipient);
    return mergeEmailTemplate(
      selectedTemplate.subject,
      selectedTemplate.body,
      context,
    );
  }, [detail, selectedRecipient, selectedTemplate]);

  const mailtoUrl = useMemo(() => {
    if (!selectedRecipient?.address || !merged.subject) return '';
    return buildMailtoUrl(
      selectedRecipient.address,
      merged.subject,
      merged.body,
    );
  }, [selectedRecipient, merged]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (recipientIndex >= recipients.length && recipients.length > 0) {
      setRecipientIndex(0);
    }
  }, [recipients.length, recipientIndex]);

  const handleSend = async () => {
    if (!selectedRecipient || !selectedTemplate) return;
    setSending(true);
    setStatusMessage(null);
    try {
      await sendApplicationEmail({
        itemId: detail.id,
        to: selectedRecipient.address,
        recipientLabel: selectedRecipient.label,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        subject: merged.subject,
        body: merged.body,
      });
      setStatusMessage('Email sent successfully.');
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Could not send email.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-email-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-200 px-5 py-4">
          <h2
            id="send-email-title"
            className="text-lg font-semibold text-slate-900"
          >
            Send email
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose a recipient and template for {detail.name}.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {recipients.length === 0 ? (
            <p className="text-sm text-amber-700">
              No email addresses on this application. Add Email, Parent Email,
              Pastor Email, or Other Reference Emails on the monday.com item.
            </p>
          ) : (
            <>
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">
                  To
                </legend>
                <ul className="mt-2 space-y-2">
                  {recipients.map((recipient, index) => (
                    <li key={`${recipient.role}-${recipient.address}`}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                        <input
                          type="radio"
                          name="email-recipient"
                          checked={recipientIndex === index}
                          onChange={() => setRecipientIndex(index)}
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-sm font-medium text-slate-900">
                            {recipient.label}
                          </span>
                          <span className="text-sm text-slate-500">
                            {recipient.address}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              <div>
                <label
                  htmlFor="email-template"
                  className="text-sm font-medium text-slate-700"
                >
                  Template
                </label>
                <select
                  id="email-template"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  {EMAIL_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700">Preview</h3>
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-medium text-slate-900">
                    Subject: {merged.subject || '—'}
                  </p>
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-slate-700">
                    {merged.body || '—'}
                  </pre>
                </div>
              </div>
            </>
          )}

          {statusMessage && (
            <p
              className={`text-sm ${statusMessage.includes('success') ? 'text-emerald-700' : 'text-amber-800'}`}
              role="status"
            >
              {statusMessage}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          {mailtoUrl && (
            <a
              href={mailtoUrl}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open in email app
            </a>
          )}
          <button
            type="button"
            disabled={sending || recipients.length === 0}
            onClick={handleSend}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  );
}
