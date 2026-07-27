/**
 * Batch email compose for filtered / selected Contacts — BCC via mail client.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ContactListItem, ContactTag } from '../../types/contact';
import type { EmailDraftAttachment } from '../../types/emailCompose';
import EmailComposePanel from '../email/EmailComposePanel';
import {
  buildBatchBccMailtoUrl,
  mergeEmailTemplate,
} from '../../utils/emailMerge';
import { BLANK_EMAIL_TEMPLATE_ID } from '../../utils/emailMergeFields';
import { plainTextToHtml } from '../../utils/htmlEmailBody';
import {
  findEmailTemplate,
  useEmailTemplates,
} from '../../hooks/useEmailTemplates';
import { appendEmailComposeLogEntry } from '../../utils/emailComposeLog';
import {
  buildBatchContactMergeContext,
  contactEmailRecipients,
  formatContactFilterTagSummary,
} from '../../utils/contactBatchEmail';
import OverlayBackButton from '../layout/OverlayBackButton';

interface ContactBatchEmailModalProps {
  contacts: ContactListItem[];
  filterTags: ContactTag[];
  onClose: () => void;
}

export default function ContactBatchEmailModal({
  contacts,
  filterTags,
  onClose,
}: ContactBatchEmailModalProps) {
  const { templates, loading } = useEmailTemplates();
  const [templateKey, setTemplateKey] = useState(BLANK_EMAIL_TEMPLATE_ID);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('<p><br></p>');
  const [attachments, setAttachments] = useState<EmailDraftAttachment[]>([]);
  const [cc, setCc] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const recipients = useMemo(
    () => contactEmailRecipients(contacts),
    [contacts],
  );
  const skippedCount = contacts.length - recipients.length;
  const tagSummary = formatContactFilterTagSummary(filterTags);

  const selectedTemplate =
    templateKey === BLANK_EMAIL_TEMPLATE_ID
      ? null
      : findEmailTemplate(templates, templateKey);

  const mergeContext = useMemo(
    () => buildBatchContactMergeContext(filterTags),
    [filterTags],
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
  }, [templateKey, selectedTemplate?.id, mergeContext]);

  const finalEmail = useMemo(
    () => mergeEmailTemplate(subject, body, mergeContext),
    [subject, body, mergeContext],
  );

  const batchMailto = useMemo(() => {
    if (!finalEmail.subject.trim() || recipients.length === 0) {
      return { url: '', includedEmails: [] as string[], omittedCount: 0 };
    }
    return buildBatchBccMailtoUrl(
      recipients.map((recipient) => recipient.email),
      finalEmail.subject,
      finalEmail.body,
    );
  }, [finalEmail, recipients]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const copyBccList = async () => {
    const list = recipients.map((recipient) => recipient.email).join(', ');
    try {
      await navigator.clipboard.writeText(list);
      setCopyMessage('BCC list copied to clipboard');
      window.setTimeout(() => setCopyMessage(null), 2500);
    } catch {
      setCopyMessage('Could not copy — select the list manually');
    }
  };

  const logBatchOpen = () => {
    appendEmailComposeLogEntry({
      subject: finalEmail.subject,
      body: finalEmail.body,
      recipientEmail: `${recipients.length} recipients (BCC)`,
      recipientName: `Batch · ${tagSummary}`,
      templateId: selectedTemplate?.templateId,
      templateName: selectedTemplate?.name,
      sourceLabel: 'Contact batch compose',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-batch-email-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-sm"
        aria-label="Close batch email"
        onClick={onClose}
      />

      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="shrink-0 border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel="Contacts" onBack={onClose} />
          <h2
            id="contact-batch-email-title"
            className="mt-3 text-lg font-semibold text-crm-heading"
          >
            Batch email
          </h2>
          <p className="mt-1 text-sm text-crm-slate">
            {recipients.length} recipient
            {recipients.length === 1 ? '' : 's'}
            {filterTags.length > 0 ? (
              <>
                {' '}
                · filter <span className="font-medium text-crm-heading">{tagSummary}</span>
              </>
            ) : null}
            {skippedCount > 0 ? (
              <> · {skippedCount} without a usable email skipped</>
            ) : null}
          </p>
          <p className="mt-2 text-xs text-crm-slate">
            Opens your mail app with everyone in BCC (same message for all).
            Per-person merge fields like first name are not filled in batch mode.
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

            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-crm-slate">
                Recipients
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-crm-slate">
                {recipients.slice(0, 40).map((recipient) => (
                  <li key={recipient.id} className="truncate">
                    <span className="font-medium text-crm-heading">
                      {recipient.name}
                    </span>{' '}
                    · {recipient.email}
                  </li>
                ))}
                {recipients.length > 40 ? (
                  <li className="text-xs">+{recipients.length - 40} more</li>
                ) : null}
              </ul>
            </div>
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
              bcc={recipients.map((recipient) => recipient.email).join(', ')}
              onCcChange={setCc}
              onBccChange={() => {
                /* BCC is managed from the recipient list */
              }}
              layout="split"
            />

            {batchMailto.omittedCount > 0 && (
              <p className="mt-4 text-sm text-amber-800" role="status">
                Your mail app link can only fit {batchMailto.includedEmails.length}{' '}
                of {recipients.length} addresses. Copy the full BCC list and paste
                it in your mail client.
              </p>
            )}

            {(statusMessage || copyMessage) && (
              <p className="mt-4 text-sm text-amber-800" role="status">
                {statusMessage ?? copyMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-crm-taupe/20 px-5 py-4">
          <button
            type="button"
            onClick={() => void copyBccList()}
            disabled={recipients.length === 0}
            className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Copy BCC list
          </button>
          {batchMailto.url ? (
            <a
              href={batchMailto.url}
              onClick={logBatchOpen}
              className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
            >
              Open in email app
            </a>
          ) : null}
          <button
            type="button"
            onClick={() =>
              setStatusMessage(
                'Direct send is not configured yet. Use "Open in email app" (BCC) or copy the BCC list.',
              )
            }
            disabled={recipients.length === 0 || !finalEmail.subject.trim()}
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send batch email
          </button>
        </div>
      </div>
    </div>
  );
}
