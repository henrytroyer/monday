import { useEffect, useState } from 'react';

interface LinkInsertDialogProps {
  open: boolean;
  initialUrl?: string;
  initialText?: string;
  onClose: () => void;
  onConfirm: (url: string, text: string, openInNewTab: boolean) => void;
}

export default function LinkInsertDialog({
  open,
  initialUrl = '',
  initialText = '',
  onClose,
  onConfirm,
}: LinkInsertDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [openInNewTab, setOpenInNewTab] = useState(true);

  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl);
    setText(initialText);
  }, [open, initialUrl, initialText]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        aria-label="Close link dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-crm-taupe/20 bg-crm-surface p-5 shadow-2xl"
      >
        <h3 id="link-dialog-title" className="text-lg font-semibold text-crm-heading">
          Insert link
        </h3>
        <p className="mt-1 text-sm text-crm-slate">
          Add a hyperlink to selected text or enter display text below.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="link-url" className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
              URL
            </label>
            <input
              id="link-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="mt-1 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-indigo focus:ring-2 focus:ring-crm-indigo/20"
            />
          </div>
          <div>
            <label htmlFor="link-text" className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
              Display text
            </label>
            <input
              id="link-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link label"
              className="mt-1 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-indigo focus:ring-2 focus:ring-crm-indigo/20"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-crm-text">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
            />
            Open in new tab
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!url.trim()}
            onClick={() => {
              onConfirm(url.trim(), text.trim() || url.trim(), openInNewTab);
              onClose();
            }}
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-50"
          >
            Insert link
          </button>
        </div>
      </div>
    </div>
  );
}
