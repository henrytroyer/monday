/**
 * Full-featured email composer — TipTap editor, attachments, signatures, merge fields, CC/BCC.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EmailDraftAttachment } from '../../types/emailCompose';
import { getDefaultEmailSignature } from '../../utils/emailSignatures';
import EmailAttachmentPanel from './EmailAttachmentPanel';
import SignatureManagerDialog from './dialogs/SignatureManagerDialog';
import MergeFieldSidebar from './MergeFieldSidebar';
import TiptapEmailEditor, {
  type TiptapEmailEditorHandle,
} from './TiptapEmailEditor';
import { IconChevronDown, IconSignature } from './emailEditorIcons';

export type EmailComposerMode = 'compose' | 'template';

interface ProfessionalEmailComposerProps {
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  mergeContext?: Record<string, string>;
  disabled?: boolean;
  mode?: EmailComposerMode;
  insertMode?: 'token' | 'value';
  attachments?: EmailDraftAttachment[];
  onAttachmentsChange?: (attachments: EmailDraftAttachment[]) => void;
  cc?: string;
  bcc?: string;
  onCcChange?: (value: string) => void;
  onBccChange?: (value: string) => void;
  showExtendedHeaders?: boolean;
  autoAppendSignature?: boolean;
  layout?: 'split' | 'stacked';
}

export default function ProfessionalEmailComposer({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  mergeContext,
  disabled = false,
  mode = 'compose',
  insertMode = mode === 'template' ? 'token' : 'value',
  attachments = [],
  onAttachmentsChange,
  cc = '',
  bcc = '',
  onCcChange,
  onBccChange,
  showExtendedHeaders = mode === 'compose',
  autoAppendSignature = mode === 'compose',
  layout = 'split',
}: ProfessionalEmailComposerProps) {
  const editorRef = useRef<TiptapEmailEditorHandle>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [showCcBcc, setShowCcBcc] = useState(Boolean(cc || bcc));
  const [signatureMenuOpen, setSignatureMenuOpen] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signaturesVersion, setSignaturesVersion] = useState(0);
  const signatureAppendedRef = useRef(false);

  const defaultSignature = useMemo(() => {
    void signaturesVersion;
    return getDefaultEmailSignature();
  }, [signaturesVersion]);

  useEffect(() => {
    if (!autoAppendSignature || signatureAppendedRef.current || disabled) return;
    const defaultSig = getDefaultEmailSignature();
    if (!defaultSig?.html || body.replace(/<[^>]+>/g, '').trim()) return;
    signatureAppendedRef.current = true;
    onBodyChange(`${body}<p><br></p>${defaultSig.html}`);
  }, [autoAppendSignature, body, disabled, onBodyChange]);

  const insertAtCursor = (text: string) => {
    const active = document.activeElement;
    if (active === subjectRef.current) {
      const input = subjectRef.current;
      if (!input) return;
      const start = input.selectionStart ?? subject.length;
      const end = input.selectionEnd ?? subject.length;
      const next = `${subject.slice(0, start)}${text}${subject.slice(end)}`;
      onSubjectChange(next);
      requestAnimationFrame(() => {
        input.focus();
        const caret = start + text.length;
        input.setSelectionRange(caret, caret);
      });
      return;
    }
    editorRef.current?.insertContent(text);
  };

  const insertSignatureHtml = (html: string) => {
    editorRef.current?.insertHtml(`<p><br></p>${html}`);
    setSignatureMenuOpen(false);
  };

  const isSplit = layout === 'split';

  return (
    <div className="email-pro-composer">
      <div className="email-pro-composer__headers">
        <div className="email-pro-field">
          <label htmlFor="email-pro-subject" className="email-pro-field__label">
            Subject
          </label>
          <input
            ref={subjectRef}
            id="email-pro-subject"
            type="text"
            value={subject}
            disabled={disabled}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Subject line"
            className="email-pro-field__input email-pro-field__input--subject"
          />
        </div>

        {showExtendedHeaders && (
          <>
            {!showCcBcc ? (
              <button
                type="button"
                onClick={() => setShowCcBcc(true)}
                className="email-pro-cc-toggle"
              >
                + Cc / Bcc
              </button>
            ) : (
              <>
                <div className="email-pro-field">
                  <label htmlFor="email-pro-cc" className="email-pro-field__label">
                    Cc
                  </label>
                  <input
                    id="email-pro-cc"
                    type="text"
                    value={cc}
                    disabled={disabled}
                    onChange={(e) => onCcChange?.(e.target.value)}
                    placeholder="cc@example.com"
                    className="email-pro-field__input"
                  />
                </div>
                <div className="email-pro-field">
                  <label htmlFor="email-pro-bcc" className="email-pro-field__label">
                    Bcc
                  </label>
                  <input
                    id="email-pro-bcc"
                    type="text"
                    value={bcc}
                    disabled={disabled}
                    onChange={(e) => onBccChange?.(e.target.value)}
                    placeholder="bcc@example.com"
                    className="email-pro-field__input"
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div
        className={
          isSplit
            ? 'email-pro-composer__workspace email-pro-composer__workspace--split'
            : 'email-pro-composer__workspace email-pro-composer__workspace--stacked'
        }
      >
        <div className="email-pro-composer__editor-column">
          {!disabled && (
            <div className="email-pro-composer__actions">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSignatureMenuOpen((open) => !open)}
                  className="email-pro-action-btn"
                >
                  <IconSignature className="h-4 w-4" />
                  Signature
                  <IconChevronDown className="h-3 w-3 opacity-60" />
                </button>
                {signatureMenuOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10"
                      aria-label="Close signature menu"
                      onClick={() => setSignatureMenuOpen(false)}
                    />
                    <div className="email-pro-dropdown">
                      {defaultSignature && (
                        <button
                          type="button"
                          onClick={() => insertSignatureHtml(defaultSignature.html)}
                          className="email-pro-dropdown__item"
                        >
                          Insert default: {defaultSignature.name}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSignatureMenuOpen(false);
                          setSignatureDialogOpen(true);
                        }}
                        className="email-pro-dropdown__item"
                      >
                        Manage signatures…
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <TiptapEmailEditor
            ref={editorRef}
            value={body}
            onChange={onBodyChange}
            disabled={disabled}
            minHeightClassName={isSplit ? 'min-h-[340px]' : 'min-h-[300px]'}
          />

          {mode === 'compose' && onAttachmentsChange && (
            <EmailAttachmentPanel
              attachments={attachments}
              onChange={onAttachmentsChange}
              disabled={disabled}
            />
          )}
        </div>

        {!disabled && (
          <MergeFieldSidebar
            mergeContext={mergeContext}
            onInsert={insertAtCursor}
            insertMode={insertMode}
            collapsed={!isSplit}
          />
        )}
      </div>

      <SignatureManagerDialog
        open={signatureDialogOpen}
        onClose={() => setSignatureDialogOpen(false)}
        onInsert={insertSignatureHtml}
        onSignaturesChange={() => setSignaturesVersion((v) => v + 1)}
      />
    </div>
  );
}
