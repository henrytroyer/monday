import { I58_MARK, VOLUNTEER_PORTAL_TITLE } from '../lib/nav';

export function BrandMark() {
  return (
    <span className="inline-flex items-center gap-3">
      <img
        src={I58_MARK}
        alt=""
        className="-translate-y-2 h-12 w-auto shrink-0 object-contain object-center sm:h-16"
      />
      <span className="text-base font-semibold leading-none tracking-tight text-navy sm:text-lg">
        {VOLUNTEER_PORTAL_TITLE}
      </span>
    </span>
  );
}
