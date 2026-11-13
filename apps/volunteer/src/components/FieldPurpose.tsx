import { I58_MISSION, I58_VISION } from '../lib/volunteerGuide';

const onPhoto =
  'text-white! [text-shadow:0_1px_2px_rgba(8,18,36,0.95),0_1px_6px_rgba(8,18,36,0.8)]';

export function FieldPurpose() {
  return (
    <section aria-label="Vision and mission" className="w-full max-w-sm px-2 text-center">
      <h2 className={`font-display text-base font-extrabold leading-tight sm:text-lg ${onPhoto}`}>
        {I58_VISION.title}
      </h2>
      <p className={`mt-0.5 text-xs font-bold leading-tight sm:text-sm ${onPhoto}`}>{I58_VISION.statement}</p>
      <h2 className={`mt-2 font-display text-base font-extrabold leading-tight sm:text-lg ${onPhoto}`}>
        {I58_MISSION.title}
      </h2>
      <p className={`mt-0.5 text-xs font-bold leading-tight sm:text-sm ${onPhoto}`}>{I58_MISSION.statement}</p>
    </section>
  );
}
