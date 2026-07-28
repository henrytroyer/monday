/**
 * CrmEmailComposeModal.tsx — Compose / reply / forward with real send via proxy.
 */

import { useEffect, useMemo, useState } from 'react';
import type { EmailDraftAttachment } from '../../types/emailCompose';
import type { MailboxComposeDraft } from '../../utils/emailReplyDraft';
import { BLANK_EMAIL_TEMPLATE_ID } from '../../utils/emailMergeFields';
import {
  findEmailTemplate,
  useEmailTemplates,
} from '../../hooks/useEmailTemplates';
import { mergeEmailTemplate } from '../../utils/emailMerge';
import { plainTextToHtml } from '../../utils/htmlEmailBody';
import { sendCrmEmail } from '../../services/sendCrmEmail';
import { appendEmailComposeLogEntry } from '../../utils/emailComposeLog';
import EmailComposePanel from '../email/EmailComposePanel';
import OverlayBackButton from '../layout/OverlayBackButton';

interface CrmEmailComposeModalProps {
  draft: MailboxComposeDraft;
  contactName: string;
  contactId: string;
  mergeContext?: Record<string, string>;
  showTemplates?: boolean;
  onClose: () => void;
  onSent?: () => void;
}

function titleForMode(mode: MailboxComposeDraft['mode']): string {
  switch (mode) {
    case 'reply':
      return 'Reply';
    case 'replyAll':
      return 'Reply all';
    case 'forward':
      return 'Forward';
    default:
      return 'New email';
  }
}

export default function CrmEmailComposeModal({
  draft,
  contactName,
  contactId,
  mergeContext = {},
  showTemplates = true,
  onClose,
  onSent,
}: CrmEmailComposeModalProps) {
  const { templates, loading: templatesLoading } = useEmailTemplates();
  const [templateKey, setTemplateKey] = useState(BLANK_EMAIL_TEMPLATE_ID);
  const [to, setTo] = useState(draft.to);
  const [cc, setCc] = useState(draft.cc);
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.bodyHtml);
  const [attachments, setAttachments] = useState<EmailDraftAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedTemplate =
    templateKey === BLANK_EMAIL_TEMPLATE_ID
      ? null
      : findEmailTemplate(templates, templateKey);

  useEffect(() => {
    setTo(draft.to);
    setCc(draft.cc);
    setSubject(draft.subject);
    setBody(draft.bodyHtml);
    setTemplateKey(BLANK_EMAIL_TEMPLATE_ID);
    setStatusMessage(null);
  }, [draft]);

  useEffect(() => {
    if (templateKey === BLANK_EMAIL_TEMPLATE_ID || !selectedTemplate) return;
    const merged = mergeEmailTemplate(
      selectedTemplate.subject,
      selectedTemplate.body,
      { ...mergeContext, email: to, name: contactName },
    );
    setSubject(merged.subject);
    setBody(plainTextToHtml(merged.body));
  }, [templateKey, selectedTemplate?.id]);

  const canSend = Boolean(to.trim() && subject.trim() && body.trim());

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

  const statusTone = useMemo(() => {
    if (!statusMessage) return '';
    return /sent successfully/i.test(statusMessage)
      ? 'text-emerald-700'
      : 'text-amber-800';
  }, [statusMessage]);

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setStatusMessage(null);
    try {
      await sendCrmEmail({
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        html: body,
        itemId: draft.itemId,
      });
      appendEmailComposeLogEntry({
        subject: subject.trim(),
        body,
        recipientEmail: to.trim(),
        recipientName: contactName,
        itemId: draft.itemId,
        contactId,
        templateId: selectedTemplate?.templateId,
        templateName: selectedTemplate?.name,
        sourceLabel: titleForMode(draft.mode),
      });
      setStatusMessage('Email sent successfully.');
      onSent?.();
      window.setTimeout(() => onClose(), 600);
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Could not send email.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crm-email-compose-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-sm"
        aria-label={`Back to ${contactName}`}
        onClick={onClose}
      />

      <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="shrink-0 border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={contactName} onBack={onClose} />
          <h2
            id="crm-email-compose-title"
            className="mt-3 text-lg font-semibold text-crm-heading"
          >
            {titleForMode(draft.mode)}
          </h2>
          <p className="mt-1 text-sm text-crm-slate">
            Sends from the configured i58global mailbox via the CRM proxy.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-crm-heading">To</span>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
                autoComplete="email"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-crm-heading">CC</span>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
                placeholder="optional"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-crm-heading">BCC</span>
            <input
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
              placeholder="optional"
            />
          </label>

          {showTemplates && draft.mode === 'compose' && (
            <label className="block text-sm">
              <span className="font-medium text-crm-heading">Template</span>
              <select
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                disabled={templatesLoading}
                className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
              >
                <option value={BLANK_EMAIL_TEMPLATE_ID}>Blank email</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.templateId}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <EmailComposePanel
            subject={subject}
            body={body}
            onSubjectChange={setSubject}
            onBodyChange={setBody}
            mergeContext={{ ...mergeContext, email: to, name: contactName }}
            insertMode="value"
            mode="compose"
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            layout="stacked"
          />

          {attachments.length > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Attachments are not sent by the CRM proxy yet — remove them from
              the draft or attach manually after send is configured for files.
            </p>
          )}

          {statusMessage && (
            <p className={`text-sm ${statusTone}`} role="status">
              {statusMessage}
            </p>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-crm-taupe/20 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={sending || !canSend}
            onClick={() => void handleSend()}
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
