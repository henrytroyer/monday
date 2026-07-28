import { useEffect, useMemo, useState } from 'react';
import type { ContactDetail } from '../../types/contact';
import type { EmailDraftAttachment } from '../../types/emailCompose';
import EmailComposePanel from '../email/EmailComposePanel';
import {
  buildContactMergeContext,
  buildMailtoUrl,
  mergeEmailTemplate,
} from '../../utils/emailMerge';
import { BLANK_EMAIL_TEMPLATE_ID } from '../../utils/emailMergeFields';
import { plainTextToHtml } from '../../utils/htmlEmailBody';
import {
  findEmailTemplate,
  useEmailTemplates,
} from '../../hooks/useEmailTemplates';
import { appendEmailComposeLogEntry } from '../../utils/emailComposeLog';
import { sendCrmEmail } from '../../services/sendCrmEmail';
import OverlayBackButton from '../layout/OverlayBackButton';

interface ContactSendEmailModalProps {
  contact: ContactDetail;
  onClose: () => void;
  onSent?: () => void;
}

export default function ContactSendEmailModal({
  contact,
  onClose,
  onSent,
}: ContactSendEmailModalProps) {
  const { templates, loading } = useEmailTemplates();
  const [templateKey, setTemplateKey] = useState(BLANK_EMAIL_TEMPLATE_ID);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('<p><br></p>');
  const [attachments, setAttachments] = useState<EmailDraftAttachment[]>([]);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedTemplate =
    templateKey === BLANK_EMAIL_TEMPLATE_ID
      ? null
      : findEmailTemplate(templates, templateKey);

  const mergeContext = useMemo(
    () => buildContactMergeContext(contact),
    [contact],
  );

  useEffect(() => {
    if (templateKey === BLANK_EMAIL_TEMPLATE_ID) {
      setSubject('');
      setBody('<p><br></p>');
      return;
    }
    if (!selectedTemplate) return;
    const merged = mergeEmailTemplate(
      selectedTemplate.subject,
      selectedTemplate.body,
      mergeContext,
    );
    setSubject(merged.subject);
    setBody(plainTextToHtml(merged.body));
  }, [templateKey, selectedTemplate?.id, contact.id]);

  const finalEmail = useMemo(
    () => mergeEmailTemplate(subject, body, mergeContext),
    [subject, body, mergeContext],
  );

  const mailtoUrl = useMemo(() => {
    if (!contact.email || contact.email === '—' || !finalEmail.subject.trim()) {
      return '';
    }
    return buildMailtoUrl(contact.email, finalEmail.subject, finalEmail.body);
  }, [contact.email, finalEmail]);

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

      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="shrink-0 border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={contact.name} onBack={onClose} />
          <h2
            id="contact-send-email-title"
            className="mt-3 text-lg font-semibold text-crm-heading"
          >
            Send email
          </h2>
          <p className="mt-1 text-sm text-crm-slate">
            To{' '}
            <span className="font-medium text-crm-heading">{contact.name}</span>{' '}
            · {contact.email}
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <div className="min-h-0 overflow-y-auto border-b border-crm-taupe/20 p-4 lg:border-b-0 lg:border-r">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-crm-slate">
              Start from
            </p>
            {loading ? (
              <p className="text-sm text-crm-slate">Loading templates…</p>
            ) : (
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateKey(BLANK_EMAIL_TEMPLATE_ID);
                      setStatusMessage(null);
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      templateKey === BLANK_EMAIL_TEMPLATE_ID
                        ? 'border-crm-indigo bg-crm-taupe-50 ring-1 ring-crm-indigo'
                        : 'border-crm-taupe/20 bg-crm-surface hover:border-crm-taupe/28 hover:bg-crm-taupe-50'
                    }`}
                  >
                    <p className="font-medium text-crm-heading">Blank email</p>
                    <p className="mt-1 text-sm text-crm-slate">
                      Write a custom message from scratch
                    </p>
                  </button>
                </li>
                {templates.map((template) => {
                  const selected = template.templateId === templateKey;
                  return (
                    <li key={template.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setTemplateKey(template.templateId);
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
            )}
          </div>

          <div className="min-h-0 overflow-y-auto p-3">
            <EmailComposePanel
              subject={subject}
              body={body}
              onSubjectChange={setSubject}
              onBodyChange={setBody}
              mergeContext={mergeContext}
              insertMode="value"
              mode="compose"
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              cc={cc}
              bcc={bcc}
              onCcChange={setCc}
              onBccChange={setBcc}
              layout="split"
            />

            {statusMessage && (
              <p
                className={`mt-4 text-sm ${
                  /sent successfully/i.test(statusMessage)
                    ? 'text-emerald-700'
                    : 'text-amber-800'
                }`}
                role="status"
              >
                {statusMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-crm-taupe/20 px-5 py-4">
          {mailtoUrl && (
            <a
              href={mailtoUrl}
              onClick={() => {
                appendEmailComposeLogEntry({
                  subject: finalEmail.subject,
                  body: finalEmail.body,
                  recipientEmail: contact.email,
                  recipientName: contact.name,
                  contactId: contact.id,
                  templateId: selectedTemplate?.templateId,
                  templateName: selectedTemplate?.name,
                  sourceLabel: 'Contact compose',
                });
              }}
              className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
            >
              Open in email app
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              void (async () => {
                if (!contact.email || contact.email === '—') {
                  setStatusMessage('This contact has no email address.');
                  return;
                }
                setSending(true);
                setStatusMessage(null);
                try {
                  await sendCrmEmail({
                    to: contact.email,
                    cc: cc.trim() || undefined,
                    bcc: bcc.trim() || undefined,
                    subject: finalEmail.subject,
                    html: finalEmail.body,
                    itemId: contact.id,
                  });
                  appendEmailComposeLogEntry({
                    subject: finalEmail.subject,
                    body: finalEmail.body,
                    recipientEmail: contact.email,
                    recipientName: contact.name,
                    contactId: contact.id,
                    itemId: contact.id,
                    templateId: selectedTemplate?.templateId,
                    templateName: selectedTemplate?.name,
                    sourceLabel: 'Contact compose',
                  });
                  setStatusMessage('Email sent successfully.');
                  onSent?.();
                } catch (err) {
                  setStatusMessage(
                    err instanceof Error
                      ? err.message
                      : 'Could not send email.',
                  );
                } finally {
                  setSending(false);
                }
              })();
            }}
            disabled={
              sending ||
              !finalEmail.subject.trim() ||
              !contact.email ||
              contact.email === '—'
            }
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  );
}
