import { VISION_VALUES_TITLE } from '../lib/nav';
import { I58_MISSION, I58_VISION } from '../lib/volunteerGuide';
import {
  CORE_VALUES_MARK,
  CORE_VALUE_STATEMENTS,
  MISSION_VISION_MARK,
  VISION_VALUES_PHOTO,
} from '../lib/visionValues';
import { SectionDivider } from '../components/SectionDivider';

const MARK_CANVAS = '#dddad6';

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
          <SectionDivider className="absolute inset-x-0 bottom-0 text-crm-white" />
        </div>
      </section>

      <section
        className="relative left-1/2 mt-10 w-screen -translate-x-1/2"
        style={{ background: MARK_CANVAS }}
      >
        <div className="mx-auto grid w-full max-w-5xl items-center gap-8 px-5 py-10 md:grid-cols-[17rem_1fr] md:gap-12">
        <img
          src={MISSION_VISION_MARK}
          alt="Vision and mission"
          className="mx-auto w-full max-w-[16.75rem]"
        />
        <div className="space-y-8">
          <Statement title={I58_VISION.title} text={I58_VISION.statement} />
          <Statement title={I58_MISSION.title} text={I58_MISSION.statement} />
        </div>
        </div>
      </section>

      <section className="relative left-1/2 mt-16 w-screen -translate-x-1/2">
        <SectionDivider className="text-[#dddad6]" />
        <div className="pb-16" style={{ background: MARK_CANVAS }}>
          <div className="mx-auto grid w-full max-w-5xl items-center gap-8 px-5 lg:grid-cols-[24rem_1fr] lg:gap-12">
            <img
              src={CORE_VALUES_MARK}
              alt="Our core values: Honesty, Integrity, Trust, Focus, Faith, and Passion."
              className="mx-auto w-full max-w-sm"
            />
            <div className="space-y-8">
              {CORE_VALUE_STATEMENTS.map((item) => (
                <article key={item.title}>
                  <h3 className="font-display text-2xl font-extrabold text-navy">{item.title}</h3>
                  <p className="mt-2 text-base leading-7 text-navy">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Statement({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="font-display text-[1.85rem] font-extrabold leading-tight text-navy">{title}</h2>
      <p className="mt-3 font-story text-lg font-light leading-8 text-navy">{text}</p>
    </div>
  );
}
