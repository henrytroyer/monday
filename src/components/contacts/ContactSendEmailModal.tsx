import { useEffect, useMemo, useState } from 'react';
import { EMAIL_TEMPLATES } from '../../data/emailTemplates';
import type { ContactDetail } from '../../types/contact';
import {
  buildContactMergeContext,
  buildMailtoUrl,
  mergeEmailTemplate,
} from '../../utils/emailMerge';
import OverlayBackButton from '../layout/OverlayBackButton';

interface ContactSendEmailModalProps {
  contact: ContactDetail;
  onClose: () => void;
}

export default function ContactSendEmailModal({
  contact,
  onClose,
}: ContactSendEmailModalProps) {
  const [templateId, setTemplateId] = useState(EMAIL_TEMPLATES[0]?.id ?? '');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedTemplate =
    EMAIL_TEMPLATES.find((t) => t.id === templateId) ?? EMAIL_TEMPLATES[0];

  const merged = useMemo(() => {
    if (!selectedTemplate || !contact.email || contact.email === '—') {
      return { subject: '', body: '' };
    }
    const context = buildContactMergeContext(contact);
    return mergeEmailTemplate(
      selectedTemplate.subject,
      selectedTemplate.body,
      context,
    );
  }, [contact, selectedTemplate]);

  const mailtoUrl = useMemo(() => {
    if (!contact.email || contact.email === '—' || !merged.subject) return '';
    return buildMailtoUrl(contact.email, merged.subject, merged.body);
  }, [contact.email, merged]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-send-email-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-sm"
        aria-label={`Back to ${contact.name}`}
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="shrink-0 border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={contact.name} onBack={onClose} />
          <h2
            id="contact-send-email-title"
            className="mt-3 text-lg font-semibold text-crm-heading"
          >
            Email templates
          </h2>
          <p className="mt-1 text-sm text-crm-slate">
            To{' '}
            <span className="font-medium text-crm-heading">{contact.name}</span>{' '}
            · {contact.email}
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="min-h-0 overflow-y-auto border-b border-crm-taupe/20 p-4 md:border-b-0 md:border-r">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-crm-slate">
              Choose a template
            </p>
            <ul className="space-y-2">
              {EMAIL_TEMPLATES.map((template) => {
                const selected = template.id === templateId;
                return (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateId(template.id);
                        setStatusMessage(null);
                      }}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        selected
                          ? 'border-crm-indigo bg-crm-taupe-50 ring-1 ring-crm-indigo'
                          : 'border-crm-taupe/20 bg-crm-surface hover:border-crm-taupe/28 hover:bg-crm-taupe-50'
                      }`}
                    >
                      <p className="font-medium text-crm-heading">
                        {template.name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-crm-slate">
                        {template.subject}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="min-h-0 overflow-y-auto p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-crm-slate">
              Preview
            </p>
            {selectedTemplate ? (
              <div className="rounded-xl border border-crm-taupe/20 bg-crm-white p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
                  Subject
                </p>
                <p className="mt-1 font-medium text-crm-heading">
                  {merged.subject || '—'}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-crm-slate">
                  Body
                </p>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-crm-text">
                  {merged.body || '—'}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-crm-slate">Select a template.</p>
            )}

            {statusMessage && (
              <p className="mt-4 text-sm text-amber-800" role="status">
                {statusMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-crm-taupe/20 px-5 py-4">
          {mailtoUrl && (
            <a
              href={mailtoUrl}
              className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
            >
              Open in email app
            </a>
          )}
          <button
            type="button"
            onClick={() =>
              setStatusMessage(
                'Direct send is not configured yet. Use "Open in email app" to send from your mail client.',
              )
            }
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
          >
            Send email
          </button>
        </div>
      </div>
    </div>
  );
}
