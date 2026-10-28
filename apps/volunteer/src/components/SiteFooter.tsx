import { HOPE_IN_ACTION, ISAIAH_FOOTER } from '../lib/nav';

export function SiteFooter({ tone = 'soft' }: { tone?: 'soft' | 'white' }) {
  const surface =
    tone === 'white'
      ? 'border-t border-sand/80 bg-white text-navy'
      : 'bg-[#667b96] text-white';
  const verse = tone === 'white' ? 'text-crm-slate' : 'text-white/80';

  return (
    <footer className={`mt-auto px-5 py-6 ${surface}`}>
      <div className="mx-auto max-w-5xl">
        <p className="font-display text-sm font-semibold tracking-wide">{HOPE_IN_ACTION}</p>
        <p className={`mt-2 max-w-3xl text-xs leading-relaxed ${verse}`}>
          {ISAIAH_FOOTER}
        </p>
      </div>
    </footer>
  );
}
