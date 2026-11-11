import { useState } from 'react';
import { GENERAL_INFO_SECTION_LABEL } from '../lib/nav';
import {
  APARTMENT_CARE,
  MAILING_ADDRESS,
  MAILING_ADDRESS_LEAD,
  MAILING_ADDRESS_LINES,
  MAILING_ADDRESS_NOTE,
  PRACTICAL_INFO_INTRO,
  PRACTICAL_NAV,
  PRACTICAL_PLACES,
  type PracticalTopic,
} from '../lib/practicalInfo';

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
    <div className="pb-8">
      <h1 className="font-display max-w-3xl text-4xl font-extrabold leading-tight text-navy sm:text-5xl">
        {GENERAL_INFO_SECTION_LABEL.practical}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-navy">{PRACTICAL_INFO_INTRO}</p>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
        {PRACTICAL_NAV.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm ring-1 ring-sand/80 hover:bg-crm-indigo-50"
          >
            {item.label}
          </a>
        ))}
      </nav>

      {PRACTICAL_PLACES.map((place) => (
        <section key={place.id} id={place.id} className="mt-14 scroll-mt-36">
          <h2 className="font-display text-3xl font-extrabold text-crm-terracotta">{place.name}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {place.topics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </section>
      ))}

      <section id={APARTMENT_CARE.id} className="mt-14 scroll-mt-36">
        <h2 className="font-display text-3xl font-extrabold text-crm-terracotta">
          {APARTMENT_CARE.title}
        </h2>
        <article className="mt-6 rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-sand/80 sm:px-6">
          <p className="text-base leading-7 text-navy">{APARTMENT_CARE.body}</p>
        </article>
      </section>

      <section id="mail" className="mt-14 scroll-mt-36">
        <h2 className="font-display text-3xl font-extrabold text-crm-terracotta">Mailing address</h2>
        <article className="mt-6 rounded-2xl bg-white px-5 py-6 shadow-sm ring-1 ring-sand/80 sm:px-6">
          <p className="text-base leading-7 text-navy">{MAILING_ADDRESS_LEAD}</p>
          <address className="mt-4 font-display text-xl font-extrabold leading-8 text-navy not-italic">
            {MAILING_ADDRESS_LINES.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <button
            type="button"
            onClick={copyAddress}
            className="mt-4 min-h-11 rounded-full bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-dark"
          >
            {copied ? 'Copied' : 'Copy address'}
          </button>
          <p className="mt-5 rounded-xl border border-amber-400 bg-advise-wash px-4 py-3 text-sm leading-6 text-advise-amber">
            {MAILING_ADDRESS_NOTE}
          </p>
        </article>
      </section>
    </div>
  );
}

function TopicCard({ topic }: { topic: PracticalTopic }) {
  return (
    <article
      className={`rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-sand/80 sm:px-6 ${
        topic.wide ? 'md:col-span-2' : ''
      }`}
    >
      <h3 className="font-display text-xl font-extrabold text-navy">{topic.title}</h3>
      <span className="mt-2 block h-0.5 w-10 rounded-full bg-crm-terracotta" aria-hidden="true" />
      {topic.note ? (
        <p className="mt-4 rounded-xl border border-amber-400 bg-advise-wash px-4 py-3 text-sm leading-6 text-advise-amber">
          <span className="font-semibold">Please note. </span>
          {topic.note}
        </p>
      ) : null}
      {topic.spots ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {topic.spots.map((spot) => (
            <li key={spot.name} className="rounded-xl bg-crm-indigo-50 px-4 py-3">
              <p className="font-display text-lg font-extrabold text-navy">{spot.name}</p>
              <p className="mt-1 text-sm leading-6 text-navy">{spot.detail}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {topic.body ? <p className="mt-4 text-base leading-7 text-navy">{topic.body}</p> : null}
      {topic.hours ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-navy">{topic.hours}</p>
      ) : null}
      {topic.reminders ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {topic.reminders.map((reminder) => (
            <li key={reminder.title} className="rounded-xl bg-sand/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/55">
                {reminder.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-navy">{reminder.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
