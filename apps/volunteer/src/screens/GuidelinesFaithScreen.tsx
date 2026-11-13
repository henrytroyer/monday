import type { ReactNode, SVGProps } from 'react';
import { SectionWave } from '../components/SectionWave';
import {
  GUIDELINES_FAITH_CONDUCT_BULLETS,
  GUIDELINES_FAITH_CONDUCT_HEADING,
  GUIDELINES_FAITH_PHOTO,
  GUIDELINES_FAITH_PURPOSE,
} from '../lib/guidelinesFaith';
import {
  AGREEMENT_NOTE,
  DRESS_CODE_BRACELET_NOTE,
  DRESS_CODE_GENERAL_BULLETS,
  DRESS_CODE_GENERAL_HEADING,
  DRESS_CODE_HEADING,
  DRESS_CODE_LADIES_BULLETS,
  DRESS_CODE_LADIES_HEADING,
  DRESS_CODE_MEN_BULLETS,
  DRESS_CODE_MEN_HEADING,
} from '../process/guidelines';

export function GuidelinesFaithScreen() {
  return (
    <div className="pb-16">
      <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2">
        <div className="relative h-[22rem] overflow-hidden sm:h-[26rem]">
          <img
            src={GUIDELINES_FAITH_PHOTO}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/35 to-transparent" />
          <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col justify-center px-5">
            <h1 className="font-display max-w-md text-5xl font-extrabold leading-[0.95] text-navy sm:text-6xl">
              Guidelines
              <span className="block">& Faith</span>
            </h1>
          </div>
        </div>
      </section>

      <section className="relative left-1/2 w-screen -translate-x-1/2 border-t-2 border-white bg-gradient-to-b from-[#647c96] from-50% to-[#1f4a6d]">
        <blockquote className="mx-auto max-w-3xl px-5 pt-12 pb-20 text-center text-xl font-semibold leading-9 text-white sm:pt-16 sm:pb-24 sm:text-2xl sm:leading-10">
          “{GUIDELINES_FAITH_PURPOSE}”
        </blockquote>
        <SectionWave className="pointer-events-none absolute inset-x-0 bottom-0 h-[4.25rem] w-full text-crm-white" />
      </section>

      <ApproachBlock heading={GUIDELINES_FAITH_CONDUCT_HEADING} icon={<PeopleIcon />}>
        <BulletList items={GUIDELINES_FAITH_CONDUCT_BULLETS} />
      </ApproachBlock>

      <ApproachBlock heading={DRESS_CODE_HEADING} icon={<ShirtIcon />}>
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          <div className="rounded-2xl bg-rose-50 px-5 py-5">
            <h3 className="font-display text-center text-2xl font-extrabold text-navy">
              {DRESS_CODE_LADIES_HEADING.replace(/:$/, '')}
            </h3>
            <BulletList items={DRESS_CODE_LADIES_BULLETS} />
          </div>
          <div className="rounded-2xl bg-sky-50 px-5 py-5">
            <h3 className="font-display text-center text-2xl font-extrabold text-navy">
              {DRESS_CODE_MEN_HEADING.replace(/:$/, '')}
            </h3>
            <BulletList items={DRESS_CODE_MEN_BULLETS} />
          </div>
        </div>
        <p className="mt-5 rounded-2xl bg-slate-100 px-5 py-4 text-base leading-7 text-navy">
          {DRESS_CODE_BRACELET_NOTE}.
        </p>
      </ApproachBlock>

      <ApproachBlock heading={DRESS_CODE_GENERAL_HEADING} icon={<HeartIcon />}>
        <BulletList items={DRESS_CODE_GENERAL_BULLETS} />
        <p className="mt-8 text-base leading-7 text-navy">{AGREEMENT_NOTE}.</p>
      </ApproachBlock>
    </div>
  );
}

function ApproachBlock({
  heading,
  icon,
  children,
}: {
  heading: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto mt-14 max-w-3xl scroll-mt-28 sm:mt-20">
      <div className="flex items-center justify-center gap-4">
        <h2 className="font-display text-[1.85rem] font-extrabold leading-tight text-crm-terracotta">
          {heading}
        </h2>
        <span className="flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-full bg-white shadow-[0_4px_18px_rgba(27,54,93,0.1)]">
          {icon}
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-3 pl-5 text-base leading-7 text-navy">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

const iconProps: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-8 w-8 text-crm-terracotta',
  'aria-hidden': true,
};

function PeopleIcon() {
  return (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ShirtIcon() {
  return (
    <svg {...iconProps}>
      <path d="M15 4l6 2v5h-3v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8H3V6l6-2a3 3 0 0 0 6 0" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
