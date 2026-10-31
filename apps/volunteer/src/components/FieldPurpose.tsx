import { I58_MISSION, I58_VISION } from '../lib/volunteerGuide';

export function FieldPurpose() {
  return (
    <section
      aria-label="Vision and mission"
      className="text-white! [text-shadow:0_1px_2px_rgba(15,23,42,0.95),0_0_10px_rgba(15,23,42,0.75)]"
    >
      <h2 className="font-display text-xl font-bold leading-none text-white!">{I58_VISION.title}</h2>
      <p className="mt-0.5 text-sm font-semibold leading-tight text-white!">{I58_VISION.statement}</p>
      <h2 className="mt-1.5 font-display text-xl font-bold leading-none text-white!">{I58_MISSION.title}</h2>
      <p className="mt-0.5 text-sm font-semibold leading-tight text-white!">{I58_MISSION.statement}</p>
    </section>
  );
}
