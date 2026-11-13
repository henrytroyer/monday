import type { SVGProps } from 'react';
import { tornWashClassName, tornWashStyle } from '../components/TornWash';
import { VISION_VALUES_TITLE } from '../lib/nav';
import { I58_MISSION, I58_VISION } from '../lib/volunteerGuide';
import {
  CORE_VALUE_STATEMENTS,
  MISSION_MARK,
  VALUES_MARK,
  VISION_MARK,
  VISION_VALUES_PHOTO,
} from '../lib/visionValues';

const VALUE_CARDS = [
  { tab: 'bg-navy', title: 'text-navy', Icon: FaithIcon },
  { tab: 'bg-crm-terracotta', title: 'text-crm-terracotta', Icon: PassionIcon },
  { tab: 'bg-[#667b96]', title: 'text-[#667b96]', Icon: FocusIcon },
  { tab: 'bg-crm-slate', title: 'text-crm-slate', Icon: IntegrityIcon },
] as const;

export function VisionValuesScreen() {
  const [lead, rest] = VISION_VALUES_TITLE.split(' & ');

  return (
    <div>
      <section className="relative left-1/2 z-0 -mt-8 w-screen -translate-x-1/2">
        <div className="relative h-[22rem] overflow-hidden sm:h-[26rem]">
          <img
            src={VISION_VALUES_PHOTO}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/35 to-transparent" />
          <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col justify-center px-5">
            <h1 className="font-display max-w-md text-5xl font-extrabold leading-[0.95] text-navy sm:text-6xl">
              {lead}
              <span className="block">& {rest}</span>
            </h1>
          </div>
        </div>
      </section>

      <section className="relative left-1/2 w-screen -translate-x-1/2 border-t-2 border-white bg-gradient-to-b from-[#647c96] from-50% to-[#1f4a6d]">
        <div className="mx-auto max-w-3xl space-y-10 px-5 pt-12 pb-20 text-center sm:pt-16 sm:pb-24">
          <Statement title={I58_VISION.title} text={I58_VISION.statement} mark={VISION_MARK} />
          <Statement title={I58_MISSION.title} text={I58_MISSION.statement} mark={MISSION_MARK} />
        </div>
      </section>

      <section
        className={`relative left-1/2 z-10 -mt-[4.25rem] w-screen -translate-x-1/2 px-5 pt-[calc(4.25rem+3.5rem)] pb-16 ${tornWashClassName}`}
        style={tornWashStyle}
      >
        <div className="mx-auto max-w-5xl">
        <h2 className="flex items-center justify-center gap-3 font-display text-[1.85rem] font-extrabold leading-tight tracking-wide">
          <img src={VALUES_MARK} alt="" className="h-14 w-14 shrink-0 object-contain" />
          <span className="text-crm-terracotta">Our Core Values</span>
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-16">
          {CORE_VALUE_STATEMENTS.map((item, index) => {
            const tone = VALUE_CARDS[index]!;
            const Icon = tone.Icon;
            return (
              <article
                key={item.title}
                className="relative rounded-[1.25rem] border border-navy/10 bg-white px-5 pt-9 pb-5 shadow-[0_14px_32px_rgba(27,54,93,0.12)]"
              >
                <span
                  className={`absolute top-0 left-1/2 flex h-12 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-t-2xl rounded-b-lg text-white ${tone.tab}`}
                >
                  <Icon />
                </span>
                <h3 className="text-center font-display text-base font-extrabold tracking-wide sm:text-[clamp(1rem,1.7vw,1.35rem)]">
                  <span className={tone.title}>{item.title}</span>
                </h3>
                <p className="mt-2 text-sm leading-5 text-navy sm:text-[clamp(0.8rem,1.25vw,1rem)] sm:leading-snug">{item.body}</p>
              </article>
            );
          })}
        </div>
        </div>
      </section>
    </div>
  );
}

const tabIcon: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-6 w-6',
  'aria-hidden': true,
};

function FaithIcon() {
  return (
    <svg {...tabIcon}>
      <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
      <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" />
      <path d="M16 17h4" />
      <path d="M4 13h4" />
    </svg>
  );
}

function PassionIcon() {
  return (
    <svg {...tabIcon}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function FocusIcon() {
  return (
    <svg {...tabIcon}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IntegrityIcon() {
  return (
    <svg {...tabIcon}>
      <path d="M12 3l7 4v5c0 4.2-2.8 7.2-7 9-4.2-1.8-7-4.8-7-9V7l7-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function Statement({ title, text, mark }: { title: string; text: string; mark: string }) {
  return (
    <div>
      <h2 className="flex items-center justify-center gap-3 font-display text-[1.85rem] font-extrabold leading-tight">
        <img src={mark} alt="" className="h-14 w-14 shrink-0 object-contain" />
        <span className="text-white">{title}</span>
      </h2>
      <p className="mt-3 font-story text-lg font-light leading-8 text-white">{text}</p>
    </div>
  );
}
