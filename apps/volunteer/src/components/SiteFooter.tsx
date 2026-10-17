import { HOPE_IN_ACTION, ISAIAH_FOOTER } from '../lib/nav';

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-crm-terracotta px-5 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="font-display text-sm font-semibold tracking-wide">{HOPE_IN_ACTION}</p>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/75">
          {ISAIAH_FOOTER}
        </p>
      </div>
    </footer>
  );
}
