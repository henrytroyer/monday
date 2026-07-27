import { useEffect, useMemo, useState } from 'react';
import { mergeEmailTemplate } from '../../utils/emailMerge';
import {
  buildSampleMergeContext,
  findUnmergedTokens,
  SAMPLE_RECIPIENT_ROLES,
  sampleRecipientDisplay,
  type SampleRecipientRole,
} from '../../utils/emailPreviewSampleContext';
import { getDefaultLinkedEmailAccount } from '../../utils/emailAccountsStorage';
import { htmlToPlainText, isLikelyHtmlBody, plainTextToHtml } from '../../utils/htmlEmailBody';

interface EmailOutgoingPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  subject: string;
  body: string;
  templateName?: string;
  mergeContext?: Record<string, string>;
}

type PreviewMode = 'rich' | 'plain';

export default function EmailOutgoingPreviewDialog({
  open,
  onClose,
  subject,
  body,
  templateName,
  mergeContext,
}: EmailOutgoingPreviewDialogProps) {
  const [recipientRole, setRecipientRole] =
    useState<SampleRecipientRole>('volunteer');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('rich');

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  const context = useMemo(
    () => mergeContext ?? buildSampleMergeContext(recipientRole),
    [mergeContext, recipientRole],
  );

  const merged = useMemo(
    () => mergeEmailTemplate(subject, body, context),
    [subject, body, context],
  );

  const previewHtml = useMemo(() => {
    const trimmed = merged.body.trim();
    if (!trimmed) return '<p><br></p>';
    return isLikelyHtmlBody(trimmed) ? trimmed : plainTextToHtml(trimmed);
  }, [merged.body]);

  const plainBody = useMemo(() => htmlToPlainText(previewHtml), [previewHtml]);

  const unmergedTokens = useMemo(
    () =>
      findUnmergedTokens(`${merged.subject}\n${merged.body}`),
    [merged.subject, merged.body],
  );

  const defaultAccount = getDefaultLinkedEmailAccount();
  const fromName = defaultAccount?.label ?? 'Sarah Chen';
  const fromEmail =
    defaultAccount?.email && defaultAccount.email.includes('@')
      ? defaultAccount.email
      : 'coordination@example.org';

  const recipient = useMemo(() => {
    if (mergeContext) {
      return {
        name: mergeContext.toName ?? mergeContext.name ?? 'Recipient',
        email: mergeContext.email ?? 'recipient@example.com',
      };
    }
    return sampleRecipientDisplay(recipientRole);
  }, [mergeContext, recipientRole]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        aria-label="Close email preview"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-preview-title"
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl"
      >
        <div className="border-b border-crm-taupe/20 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="email-preview-title"
                className="text-lg font-semibold text-crm-heading"
              >
                Outgoing email preview
              </h3>
              <p className="mt-1 text-sm text-crm-slate">
                {templateName
                  ? `Previewing “${templateName}” with sample merge data.`
                  : 'Preview with sample merge data — nothing is sent.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-crm-taupe/20 px-3 py-1.5 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
            >
              Close
            </button>
          </div>

          {!mergeContext && (
            <label className="mt-4 block max-w-xs text-sm">
              <span className="font-medium text-crm-heading">Sample recipient</span>
              <select
                value={recipientRole}
                onChange={(e) =>
                  setRecipientRole(e.target.value as SampleRecipientRole)
                }
                className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
              >
                {SAMPLE_RECIPIENT_ROLES.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-b border-crm-taupe/20 px-5 py-3">
          <button
            type="button"
            onClick={() => setPreviewMode('rich')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              previewMode === 'rich'
                ? 'bg-crm-indigo text-white'
                : 'text-crm-heading hover:bg-crm-taupe-50'
            }`}
          >
            Rich email
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('plain')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              previewMode === 'plain'
                ? 'bg-crm-indigo text-white'
                : 'text-crm-heading hover:bg-crm-taupe-50'
            }`}
          >
            Plain text (mailto)
          </button>
        </div>

        {unmergedTokens.length > 0 && (
          <p className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Unmerged fields:{' '}
            {unmergedTokens.map((token) => (
              <code key={token} className="mr-2 font-mono text-xs">
                {token}
              </code>
            ))}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="overflow-hidden rounded-2xl border border-crm-taupe/20 bg-white shadow-sm">
            <dl className="divide-y divide-crm-taupe/15 text-sm">
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 px-4 py-3">
                <dt className="font-medium text-crm-slate">From</dt>
                <dd className="text-crm-heading">
                  {fromName}{' '}
                  <span className="text-crm-slate">&lt;{fromEmail}&gt;</span>
                </dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 px-4 py-3">
                <dt className="font-medium text-crm-slate">To</dt>
                <dd className="text-crm-heading">
                  {recipient.name}{' '}
                  <span className="text-crm-slate">&lt;{recipient.email}&gt;</span>
                </dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 px-4 py-3">
                <dt className="font-medium text-crm-slate">Subject</dt>
                <dd className="font-medium text-crm-heading">
                  {merged.subject.trim() || '(No subject)'}
                </dd>
              </div>
            </dl>

            <div className="border-t border-crm-taupe/15 bg-crm-white px-4 py-5">
              {previewMode === 'rich' ? (
                <div
                  className="email-tiptap-content email-preview-body text-crm-heading"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-crm-heading">
                  {plainBody || '(Empty body)'}
                </pre>
              )}
            </div>
          </div>

          {previewMode === 'plain' && (
            <p className="mt-3 text-xs text-crm-slate">
              “Open in email app” sends plain text only — formatting, images, and
              tables may not carry over to the recipient’s mail client.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
