/**
 * RecoveryKeyReveal.tsx — One-time display of a private-notes recovery key.
 */

import { useState } from 'react';

interface RecoveryKeyRevealProps {
  recoveryKey: string;
  title?: string;
  onContinue: () => void;
}

export default function RecoveryKeyReveal({
  recoveryKey,
  title = 'Save your recovery key',
  onContinue,
}: RecoveryKeyRevealProps) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob(
      [
        'i58 CRM — Private notes recovery key\n',
        'Store this offline. Anyone with this key can reset your private-notes passphrase.\n',
        'Developers cannot read your notes without this key or your passphrase.\n\n',
        recoveryKey,
        '\n',
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crm-private-notes-recovery-key.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
      role="dialog"
      aria-labelledby="recovery-key-title"
    >
      <h4
        id="recovery-key-title"
        className="text-sm font-semibold text-crm-heading"
      >
        {title}
      </h4>
      <p className="mt-1 text-xs text-crm-slate">
        This is shown once. Copy or download it and store it offline (password
        manager or printed copy). If you lose both your passphrase and this key,
        private notes cannot be recovered.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-3 text-sm font-medium tracking-wide text-crm-heading">
        {recoveryKey}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-1.5 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-1.5 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
        >
          Download .txt
        </button>
      </div>
      <label className="mt-4 flex items-start gap-2 text-sm text-crm-heading">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-1"
        />
        <span>I saved this recovery key somewhere I can find later</span>
      </label>
      <button
        type="button"
        disabled={!saved}
        onClick={onContinue}
        className="mt-3 rounded-xl bg-crm-heading px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}
