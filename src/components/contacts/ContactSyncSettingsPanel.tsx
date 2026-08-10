/**
 * ContactSyncSettingsPanel.tsx — Contacts settings for Full sync + Fillout sync.
 * Opened from the Contacts header; Refresh stays in the page header.
 */

interface ContactSyncSettingsPanelProps {
  open: boolean;
  busy: boolean;
  statusMessage: string | null;
  onClose: () => void;
  onFullSync: () => void;
  onFilloutSync: () => void;
}

export default function ContactSyncSettingsPanel({
  open,
  busy,
  statusMessage,
  onClose,
  onFullSync,
  onFilloutSync,
}: ContactSyncSettingsPanelProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/20 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-sync-settings-title"
      onClick={onClose}
    >
      <div
        className="mt-16 w-full max-w-md rounded-2xl border border-crm-taupe/20 bg-crm-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="contact-sync-settings-title"
              className="text-lg font-semibold text-crm-heading"
            >
              Contacts settings
            </h2>
            <p className="mt-1 text-sm text-crm-slate">
              Create or update Contacts from Monday boards or Fillout. Refresh
              only reloads the list.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-2 py-1 text-sm text-crm-slate hover:bg-crm-taupe-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <section className="rounded-xl border border-crm-taupe/15 p-4">
            <h3 className="text-sm font-semibold text-crm-heading">Full sync</h3>
            <p className="mt-1 text-xs text-crm-slate">
              Monday boards (short-term, long-term, service ended, donations) —
              all items. Can take several minutes.
            </p>
            <button
              type="button"
              onClick={onFullSync}
              disabled={busy}
              className="mt-3 rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Full sync'}
            </button>
          </section>

          <section className="rounded-xl border border-crm-taupe/15 p-4">
            <h3 className="text-sm font-semibold text-crm-heading">
              Fillout sync
            </h3>
            <p className="mt-1 text-xs text-crm-slate">
              Short-term Fillout form — full history in batches of 10 (volunteer,
              parent, pastor, spouse). Runs only when you press the button.
            </p>
            <button
              type="button"
              onClick={onFilloutSync}
              disabled={busy}
              className="mt-3 rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Fillout sync'}
            </button>
          </section>
        </div>

        {statusMessage && (
          <p className="mt-4 text-xs text-crm-slate">{statusMessage}</p>
        )}
      </div>
    </div>
  );
}
