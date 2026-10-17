import { LOOKING_FOR_PHOTO } from '../lib/nav';
import { LOOKING_FOR_TITLE } from '../lib/volunteerGuide';

export function LookingFor() {
  return (
    <section className="relative left-1/2 -mb-8 w-screen -translate-x-1/2 bg-[#d5dde3]">
      <img src={LOOKING_FOR_PHOTO} alt={LOOKING_FOR_TITLE} className="block w-full" />
    </section>
  );
}
