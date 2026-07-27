import { useRef, useState } from 'react';
import type { EmailDraftAttachment } from '../../types/emailCompose';
import {
  attachmentsFromFileList,
  formatFileSize,
  totalAttachmentSize,
  validateAttachmentBatch,
} from '../../utils/emailAttachments';
import { IconPaperclip } from './emailEditorIcons';

interface EmailAttachmentPanelProps {
  attachments: EmailDraftAttachment[];
  onChange: (attachments: EmailDraftAttachment[]) => void;
  disabled?: boolean;
}

export default function EmailAttachmentPanel({
  attachments,
  onChange,
  disabled = false,
}: EmailAttachmentPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (files: FileList | File[]) => {
    const incoming = attachmentsFromFileList(files);
    const validationError = validateAttachmentBatch(attachments, incoming);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onChange([...attachments, ...incoming]);
  };

  const removeAttachment = (id: string) => {
    onChange(attachments.filter((entry) => entry.id !== id));
  };

  return (
    <div className="rounded-xl border border-crm-taupe/20 bg-crm-surface">
      <div className="flex items-center justify-between border-b border-crm-taupe/15 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <IconPaperclip className="h-4 w-4 text-crm-slate" />
          <span className="text-sm font-medium text-crm-heading">Attachments</span>
          {attachments.length > 0 && (
            <span className="rounded-full bg-crm-indigo-100 px-2 py-0.5 text-xs font-medium text-crm-indigo">
              {attachments.length} · {formatFileSize(totalAttachmentSize(attachments))}
            </span>
          )}
        </div>
        {!disabled && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) addFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-crm-taupe/20 px-3 py-1.5 text-xs font-medium text-crm-heading hover:bg-crm-taupe-50"
            >
              Add files
            </button>
          </>
        )}
      </div>

      {!disabled && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            if (event.dataTransfer.files.length) {
              addFiles(event.dataTransfer.files);
            }
          }}
          className={`mx-4 mb-4 mt-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
            dragOver
              ? 'border-crm-indigo bg-crm-indigo-50'
              : 'border-crm-taupe/25 bg-crm-taupe-50/50'
          }`}
        >
          <p className="text-sm font-medium text-crm-heading">
            Drag & drop files here
          </p>
          <p className="mt-1 text-xs text-crm-slate">
            PDF, Word, Excel, images — up to 25 MB total
          </p>
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-2 px-4 pb-4">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-3 rounded-xl border border-crm-taupe/15 bg-crm-white px-3 py-2.5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-crm-indigo-50 text-xs font-bold uppercase text-crm-indigo">
                {attachment.name.split('.').pop()?.slice(0, 3) ?? 'file'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-crm-heading">
                  {attachment.name}
                </p>
                <p className="text-xs text-crm-slate">
                  {formatFileSize(attachment.size)}
                  {attachment.type ? ` · ${attachment.type}` : ''}
                </p>
              </div>
              <a
                href={URL.createObjectURL(attachment.file)}
                download={attachment.name}
                className="rounded-lg px-2 py-1 text-xs font-medium text-crm-indigo hover:bg-crm-indigo-50"
              >
                Download
              </a>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="px-4 pb-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      {attachments.length > 0 && (
        <p className="border-t border-crm-taupe/15 px-4 py-2 text-[11px] text-crm-slate">
          Mailto links cannot attach files automatically — use Download, then attach in your mail app when sending.
        </p>
      )}
    </div>
  );
}
