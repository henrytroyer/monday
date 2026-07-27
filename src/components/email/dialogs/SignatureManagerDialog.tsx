import { useEffect, useState } from 'react';
import type { EmailSignature } from '../../../types/emailCompose';
import {
  createSignatureId,
  deleteEmailSignature,
  listEmailSignatures,
  saveEmailSignature,
} from '../../../utils/emailSignatures';
import TiptapEmailEditor from '../TiptapEmailEditor';

interface SignatureManagerDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (html: string) => void;
  onSignaturesChange?: () => void;
}

export default function SignatureManagerDialog({
  open,
  onClose,
  onInsert,
  onSignaturesChange,
}: SignatureManagerDialogProps) {
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [html, setHtml] = useState('<p>Best regards,<br>Your name<br>Title | Organization</p>');
  const [isDefault, setIsDefault] = useState(false);

  const refresh = () => {
    const next = listEmailSignatures();
    setSignatures(next);
    onSignaturesChange?.();
    return next;
  };

  useEffect(() => {
    if (!open) return;
    const next = refresh();
    const initial = next.find((entry) => entry.isDefault) ?? next[0];
    if (initial) {
      setSelectedId(initial.id);
      setName(initial.name);
      setHtml(initial.html);
      setIsDefault(initial.isDefault);
    }
  }, [open]);

  const selectSignature = (signature: EmailSignature) => {
    setSelectedId(signature.id);
    setName(signature.name);
    setHtml(signature.html);
    setIsDefault(signature.isDefault);
  };

  const startNew = () => {
    setSelectedId(null);
    setName('New signature');
    setHtml('<p>Best regards,<br></p>');
    setIsDefault(signatures.length === 0);
  };

  const handleSave = () => {
    const id = selectedId ?? createSignatureId();
    const saved = saveEmailSignature({
      id,
      name: name.trim() || 'Signature',
      html,
      isDefault,
    });
    setSignatures(saved);
    setSelectedId(id);
    onSignaturesChange?.();
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const next = deleteEmailSignature(selectedId);
    setSignatures(next);
    if (next[0]) selectSignature(next[0]);
    else startNew();
    onSignaturesChange?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        aria-label="Close signature manager"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signature-dialog-title"
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl"
      >
        <div className="border-b border-crm-taupe/20 px-5 py-4">
          <h3 id="signature-dialog-title" className="text-lg font-semibold text-crm-heading">
            Email signatures
          </h3>
          <p className="mt-1 text-sm text-crm-slate">
            Create reusable signatures with formatting, links, and logos.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-crm-taupe/20 p-3 md:border-b-0 md:border-r">
            <button
              type="button"
              onClick={startNew}
              className="mb-3 w-full rounded-xl border border-dashed border-crm-indigo/40 px-3 py-2 text-sm font-medium text-crm-indigo hover:bg-crm-indigo-50"
            >
              + New signature
            </button>
            <ul className="space-y-1">
              {signatures.map((signature) => (
                <li key={signature.id}>
                  <button
                    type="button"
                    onClick={() => selectSignature(signature)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selectedId === signature.id
                        ? 'bg-crm-indigo text-white'
                        : 'text-crm-heading hover:bg-crm-taupe-50'
                    }`}
                  >
                    {signature.name}
                    {signature.isDefault && (
                      <span className="ml-1 text-[10px] uppercase opacity-80">default</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="min-h-0 space-y-3 overflow-y-auto p-4">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
                  Signature name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-crm-taupe/20 px-3 py-2 text-sm outline-none focus:border-crm-indigo focus:ring-2 focus:ring-crm-indigo/20"
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm text-crm-text">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                Default for new emails
              </label>
            </div>

            <TiptapEmailEditor
              value={html}
              onChange={setHtml}
              minHeightClassName="min-h-[180px]"
              compactToolbar
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2 border-t border-crm-taupe/20 px-5 py-4">
          <div className="flex gap-2">
            {selectedId && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
            >
              Save signature
            </button>
            <button
              type="button"
              onClick={() => {
                onInsert(html);
                onClose();
              }}
              className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
            >
              Insert into email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
