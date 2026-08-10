/**
 * ContactSyncSettingsPanel.tsx — Centered CRM modal for Full sync + Fillout sync.
 * Opened from the Contacts header; Refresh stays in the page header.
 * Starting a sync closes this modal while work continues in the background.
 */

interface ContactSyncSettingsPanelProps {
  open: boolean;
  /** Which sync is currently running (disables that button only). */
  running: 'full' | 'fillout' | null;
  lastFullSyncLabel: string;
  lastFilloutSyncLabel: string;
  onClose: () => void;
  onFullSync: () => void;
  onFilloutSync: () => void;
}

export default function ContactSyncSettingsPanel({
  open,
  running,
  lastFullSyncLabel,
  lastFilloutSyncLabel,
  onClose,
  onFullSync,
  onFilloutSync,
}: ContactSyncSettingsPanelProps) {
  if (!open) return null;

  const anyRunning = running !== null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-sync-settings-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
        aria-label="Close contacts settings"
        onClick={onClose}
      />

      <div className="relative flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-crm-taupe/20 px-5 py-4">
          <div>
            <h2
              id="contact-sync-settings-title"
              className="text-lg font-semibold text-crm-heading"
            >
              Contacts settings
            </h2>
            <p className="mt-1 text-sm text-crm-slate">
              Create or update Contacts from Monday boards or Fillout. Refresh
              only reloads the list. Syncs keep running after you close this.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-2 py-1 text-sm text-crm-slate transition hover:bg-crm-taupe-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
          <section className="rounded-xl border border-crm-taupe/15 bg-crm-white/60 p-4">
            <h3 className="text-sm font-semibold text-crm-heading">Full sync</h3>
            <p className="mt-1 text-xs text-crm-slate">
              Monday boards (short-term, long-term, service ended, donations) —
              all items. Can take several minutes.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onFullSync}
                disabled={anyRunning}
                className="rounded-2xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
              >
                {running === 'full' ? 'Running…' : 'Full sync'}
              </button>
              <p className="text-xs text-crm-slate">
                Last sync: {lastFullSyncLabel}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-crm-taupe/15 bg-crm-white/60 p-4">
            <h3 className="text-sm font-semibold text-crm-heading">
              Fillout sync
            </h3>
            <p className="mt-1 text-xs text-crm-slate">
              Short-term Fillout form — full history (volunteer, parent, pastor,
              spouse). Runs only when you press the button.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onFilloutSync}
                disabled={anyRunning}
                className="rounded-2xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
              >
                {running === 'fillout' ? 'Running…' : 'Fillout sync'}
              </button>
              <p className="text-xs text-crm-slate">
                Last sync: {lastFilloutSyncLabel}
              </p>
            </div>
          </section>
        </div>

        <div className="flex shrink-0 justify-end border-t border-crm-taupe/20 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
