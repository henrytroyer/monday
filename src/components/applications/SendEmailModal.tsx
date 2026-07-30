import { useEffect, useMemo, useState } from 'react';
import { sendApplicationEmail } from '../../services/crmApi';
import type { ApplicationEmail, EmailRecipientRole } from '../../types/volunteer';
import type { VolunteerDetail } from '../../types/volunteer';
import type { EmailDraftAttachment } from '../../types/emailCompose';
import EmailComposePanel from '../email/EmailComposePanel';
import {
  buildMailtoUrl,
  buildMergeContext,
  mergeEmailTemplate,
} from '../../utils/emailMerge';
import { BLANK_EMAIL_TEMPLATE_ID } from '../../utils/emailMergeFields';
import { plainTextToHtml } from '../../utils/htmlEmailBody';
import {
  findEmailTemplate,
  useEmailTemplates,
} from '../../hooks/useEmailTemplates';
import { appendEmailComposeLogEntry } from '../../utils/emailComposeLog';
import OverlayBackButton from '../layout/OverlayBackButton';

function logApplicationCompose(input: {
  detail: VolunteerDetail;
  recipient: ApplicationEmail;
  subject: string;
  body: string;
  templateId?: string;
  templateName?: string;
}) {
  appendEmailComposeLogEntry({
    subject: input.subject,
    body: input.body,
    recipientEmail: input.recipient.address,
    recipientName: input.recipient.label,
    itemId: input.detail.id,
    contactId: input.detail.id,
    templateId: input.templateId,
    templateName: input.templateName,
    sourceLabel: 'Application compose',
  });
}

interface SendEmailModalProps {
  detail: VolunteerDetail;
  onClose: () => void;
  onAfterSend?: () => void;
  onAfterMailto?: () => void;
  initialTemplateId?: string;
  initialRecipientRole?: EmailRecipientRole;
  fixedRecipient?: ApplicationEmail;
  extraMergeContext?: Record<string, string>;
}

export default function SendEmailModal({
  detail,
  onClose,
  onAfterSend,
  onAfterMailto,
  initialTemplateId,
  initialRecipientRole,
  fixedRecipient,
  extraMergeContext,
}: SendEmailModalProps) {
  const { templates, loading: templatesLoading } = useEmailTemplates();
  const recipients = fixedRecipient ? [fixedRecipient] : detail.emails;
  const initialRecipientIndex = useMemo(() => {
    if (!initialRecipientRole) return 0;
    const index = recipients.findIndex(
      (recipient) => recipient.role === initialRecipientRole,
    );
    return index >= 0 ? index : 0;
  }, [initialRecipientRole, recipients]);

  const [recipientIndex, setRecipientIndex] = useState(initialRecipientIndex);
  const [templateKey, setTemplateKey] = useState(
    initialTemplateId ?? BLANK_EMAIL_TEMPLATE_ID,
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('<p><br></p>');
  const [attachments, setAttachments] = useState<EmailDraftAttachment[]>([]);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!initialTemplateId || templates.length === 0) return;
    const match = findEmailTemplate(templates, initialTemplateId);
    if (match) {
      setTemplateKey(match.templateId);
    }
  }, [initialTemplateId, templates]);

  const selectedRecipient: ApplicationEmail | undefined =
    recipients[recipientIndex];
  const selectedTemplate =
    templateKey === BLANK_EMAIL_TEMPLATE_ID
      ? null
      : findEmailTemplate(templates, templateKey);

  const mergeContext = useMemo(() => {
    if (!selectedRecipient) return { ...extraMergeContext };
    return {
      ...buildMergeContext(detail, selectedRecipient),
      ...extraMergeContext,
    };
  }, [detail, extraMergeContext, selectedRecipient]);

  useEffect(() => {
    if (templateKey === BLANK_EMAIL_TEMPLATE_ID) {
      setSubject('');
      setBody('<p><br></p>');
      return;
    }
    if (!selectedTemplate || !selectedRecipient) return;
    const merged = mergeEmailTemplate(
      selectedTemplate.subject,
      selectedTemplate.body,
      mergeContext,
    );
    setSubject(merged.subject);
    setBody(plainTextToHtml(merged.body));
  }, [
    templateKey,
    selectedTemplate?.id,
    recipientIndex,
    detail.id,
    extraMergeContext,
  ]);

  const finalEmail = useMemo(
    () => mergeEmailTemplate(subject, body, mergeContext),
    [subject, body, mergeContext],
  );

  const mailtoUrl = useMemo(() => {
    if (!selectedRecipient?.address || !finalEmail.subject.trim()) return '';
    return buildMailtoUrl(
      selectedRecipient.address,
      finalEmail.subject,
      finalEmail.body,
      {
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
      },
    );
  }, [selectedRecipient, finalEmail, cc, bcc]);

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
    if (!selectedRecipient) return;
    setSending(true);
    setStatusMessage(null);
    try {
      await sendApplicationEmail({
        itemId: detail.id,
        to: selectedRecipient.address,
        recipientLabel: selectedRecipient.label,
        templateId: selectedTemplate?.templateId ?? BLANK_EMAIL_TEMPLATE_ID,
        templateName: selectedTemplate?.name ?? 'Blank email',
        subject: finalEmail.subject,
        body: finalEmail.body,
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
      });
      logApplicationCompose({
        detail,
        recipient: selectedRecipient,
        subject: finalEmail.subject,
        body: finalEmail.body,
        templateId: selectedTemplate?.templateId,
        templateName: selectedTemplate?.name,
      });
      setStatusMessage('Email sent successfully.');
      onAfterSend?.();
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
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-sm"
        aria-label={`Back to ${detail.name}`}
        onClick={onClose}
      />

      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="shrink-0 border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={detail.name} onBack={onClose} />
          <h2
            id="send-email-title"
            className="mt-3 text-lg font-semibold text-crm-heading"
          >
            Send email
          </h2>
          <p className="mt-1 text-sm text-crm-slate">
            Compose a message for {detail.name}. Pick a template or start blank.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {recipients.length === 0 ? (
            <p className="text-sm text-amber-700">
              No email addresses on this application. Add Email, Parent Email,
              Pastor Email, or Other Reference Emails on this application.
            </p>
          ) : templatesLoading ? (
            <p className="text-sm text-crm-slate">Loading templates…</p>
          ) : (
            <>
              {!fixedRecipient && (
                <fieldset>
                  <legend className="text-sm font-medium text-crm-heading">
                    To
                  </legend>
                  <ul className="mt-2 space-y-2">
                    {recipients.map((recipient, index) => (
                      <li key={`${recipient.role}-${recipient.address}`}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-crm-taupe/20 px-3 py-2.5 has-[:checked]:border-crm-indigo has-[:checked]:bg-crm-taupe-50">
                          <input
                            type="radio"
                            name="email-recipient"
                            checked={recipientIndex === index}
                            onChange={() => setRecipientIndex(index)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block text-sm font-medium text-crm-heading">
                              {recipient.label}
                            </span>
                            <span className="text-sm text-crm-slate">
                              {recipient.address}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              )}

              {fixedRecipient && selectedRecipient && (
                <div>
                  <p className="text-sm font-medium text-crm-heading">To</p>
                  <p className="mt-2 rounded-xl border border-crm-taupe/20 bg-crm-taupe-50 px-3 py-2.5 text-sm">
                    <span className="font-medium text-crm-heading">
                      {selectedRecipient.label}
                    </span>
                    <span className="block text-crm-slate">
                      {selectedRecipient.address}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="email-template"
                  className="text-sm font-medium text-crm-heading"
                >
                  Template
                </label>
                <select
                  id="email-template"
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
                >
                  <option value={BLANK_EMAIL_TEMPLATE_ID}>
                    Blank email (custom)
                  </option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.templateId}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

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

              {attachments.length > 0 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {attachments.length} attachment(s) ready — download each file below the compose area, then attach them manually in your mail app when using Open in email app.
                </p>
              )}
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

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-crm-taupe/20 px-5 py-4">
          {mailtoUrl && (
            <a
              href={mailtoUrl}
              onClick={() => {
                if (selectedRecipient) {
                  logApplicationCompose({
                    detail,
                    recipient: selectedRecipient,
                    subject: finalEmail.subject,
                    body: finalEmail.body,
                    templateId: selectedTemplate?.templateId,
                    templateName: selectedTemplate?.name,
                  });
                }
                onAfterMailto?.();
                onAfterSend?.();
              }}
              className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
            >
              Open in email app
            </a>
          )}
          <button
            type="button"
            disabled={sending || recipients.length === 0 || !finalEmail.subject.trim()}
            onClick={handleSend}
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  );
}
