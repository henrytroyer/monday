import { useState } from 'react';
import { InfoTopicCarousel, type InfoTopic } from '../components/InfoTopicCarousel';
import { GENERAL_INFO_SECTION_LABEL } from '../lib/nav';
import {
  APARTMENT_CARE,
  MAILING_ADDRESS,
  MAILING_ADDRESS_LEAD,
  MAILING_ADDRESS_LINES,
  MAILING_ADDRESS_NOTE,
  PRACTICAL_PLACES,
  type PracticalTopic,
} from '../lib/practicalInfo';

type PracticalSlide = InfoTopic & {
  place?: string;
  topic?: PracticalTopic;
  kind: 'topic' | 'mail';
};

const PRACTICAL_INFO_HEADER = '/brand/practical-info-header.jpg';
const CARD_GRADIENT = 'bg-gradient-to-b from-[#667b96] via-[#647fa8] to-[#224a6d]';
const CARD_CLASS = `flex min-h-[22rem] flex-col rounded-3xl px-6 py-7 text-white shadow-[0_16px_40px_rgba(27,54,93,0.18)] sm:px-8 sm:py-8 ${CARD_GRADIENT}`;

const TITLE_COUNTS = new Map<string, number>();
for (const place of PRACTICAL_PLACES) {
  for (const topic of place.topics) {
    TITLE_COUNTS.set(topic.title, (TITLE_COUNTS.get(topic.title) ?? 0) + 1);
  }
}

const PRACTICAL_SLIDES: readonly PracticalSlide[] = [
  ...PRACTICAL_PLACES.flatMap((place) =>
    place.topics.map((topic) => ({
      id: `${place.id}-${topic.id}`,
      label: (TITLE_COUNTS.get(topic.title) ?? 0) > 1 ? `${place.name} ${topic.title}` : topic.title,
      place: place.name,
      topic,
      kind: 'topic' as const,
    })),
  ),
  {
    id: APARTMENT_CARE.id,
    label: APARTMENT_CARE.title,
    topic: APARTMENT_CARE,
    kind: 'topic',
  },
  { id: 'mail', label: 'Mailing address', kind: 'mail' },
];

export function PracticalInfoScreen() {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    void navigator.clipboard.writeText(MAILING_ADDRESS).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => undefined,
    );
  }

  return (
    <InfoTopicCarousel
      header={<PracticalHeader />}
      ariaLabel="Practical info topics"
      topics={PRACTICAL_SLIDES}
      render={(index) => {
        const slide = PRACTICAL_SLIDES[index];
        if (!slide) return null;
        if (slide.kind === 'mail') {
          return (
            <article className={CARD_CLASS}>
              <h2 className="font-display text-3xl font-extrabold text-white!">Mailing address</h2>
              <p className="mt-5 text-base leading-7 text-white">{MAILING_ADDRESS_LEAD}</p>
              <address className="mt-4 font-display text-2xl font-extrabold leading-8 text-white not-italic">
                {MAILING_ADDRESS_LINES.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              <button
                type="button"
                onClick={copyAddress}
                className="mt-5 w-fit min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-navy hover:bg-white/90"
              >
                {copied ? 'Copied' : 'Copy address'}
              </button>
              <p className="mt-5 rounded-xl bg-white/15 px-4 py-3 text-sm leading-6 text-white">
                {MAILING_ADDRESS_NOTE}
              </p>
            </article>
          );
        }
        if (!slide.topic) return null;
        return <TopicCard topic={slide.topic} place={slide.place} />;
      }}
    />
  );
}

function PracticalHeader() {
  return (
    <header className="relative">
      <img
        src={PRACTICAL_INFO_HEADER}
        alt=""
        className="h-44 w-full object-cover object-center sm:h-52"
      />
      <h1 className="absolute left-3 top-3 w-fit rounded-2xl bg-white/95 px-5 py-3 font-display text-4xl font-extrabold leading-tight text-navy shadow-lg ring-1 ring-white/60 sm:left-4 sm:top-4 sm:px-6 sm:text-5xl">
        {GENERAL_INFO_SECTION_LABEL.practical}
      </h1>
    </header>
  );
}

function TopicCard({ topic, place }: { topic: PracticalTopic; place?: string }) {
  return (
    <article className={CARD_CLASS}>
      {place ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">{place}</p>
      ) : null}
      <h2 className={`font-display text-3xl font-extrabold text-white! ${place ? 'mt-1' : ''}`}>
        {topic.title}
      </h2>
      <div className="mt-5">
        {topic.note ? (
          <p className="rounded-xl bg-white/15 px-4 py-3 text-sm leading-6 text-white">
            <span className="font-semibold">Please note. </span>
            {topic.note}
          </p>
        ) : null}
        {topic.spots ? (
          <ul className={`${topic.note ? 'mt-4' : ''} grid gap-3 sm:grid-cols-2`}>
            {topic.spots.map((spot) => (
              <li key={spot.name} className="rounded-xl bg-white/15 px-4 py-3">
                <p className="font-display text-lg font-extrabold text-white">{spot.name}</p>
                <p className="mt-1 text-sm leading-6 text-white/90">{spot.detail}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {topic.body ? <p className="text-base leading-7 text-white">{topic.body}</p> : null}
        {topic.hours ? (
          <p className="mt-3 text-sm font-semibold leading-6 text-white">{topic.hours}</p>
        ) : null}
        {topic.reminders ? (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {topic.reminders.map((reminder) => (
              <li key={reminder.title} className="rounded-xl bg-white/15 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                  {reminder.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-white">{reminder.body}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
