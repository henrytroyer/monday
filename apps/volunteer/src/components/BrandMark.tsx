import { I58_MARK, volunteerPortalLabel } from '../lib/nav';

export function BrandMark({ name }: { name?: string | null }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <img
        src={I58_MARK}
        alt=""
        className="-translate-y-2 h-12 w-auto shrink-0 object-contain object-center sm:h-16"
      />
      <span className="min-w-0 text-base font-semibold leading-tight tracking-tight text-navy sm:text-lg">
        {volunteerPortalLabel(name)}
      </span>
    </span>
  );
}
