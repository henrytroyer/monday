import { useEffect } from 'react';
import { GENERAL_INFO_SECTION_LABEL } from '../lib/nav';
import { COORDINATOR_EMAIL } from '../lib/volunteerGuide';
import {
  ORIENTATION_CLOSING,
  ORIENTATION_CODES,
  ORIENTATION_LEAD,
  ORIENTATION_SECTIONS,
  type OrientationSection,
} from '../lib/orientationInfo';

const CLOSING_LINK = 'reach out to us';

export function OrientationInfoScreen() {
  const [closingBefore, closingAfter] = ORIENTATION_CLOSING.split(CLOSING_LINK);
  const rows = sectionRows(ORIENTATION_SECTIONS);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pb-8">
      <h1 className="font-display max-w-3xl text-4xl font-extrabold leading-tight text-navy sm:text-5xl">
        {GENERAL_INFO_SECTION_LABEL.orientation}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-navy">{ORIENTATION_LEAD}</p>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
        {ORIENTATION_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm ring-1 ring-sand/80 hover:bg-crm-indigo-50"
          >
            {section.nav}
          </a>
        ))}
      </nav>

      <section aria-label="Access codes" className="mt-8 grid gap-4 sm:grid-cols-3">
        {ORIENTATION_CODES.map((entry) => (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            className="rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-sand/80"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/45">
              {entry.label}
            </p>
            <p className="mt-1 font-display text-3xl font-extrabold tracking-[0.06em] text-navy">
              {entry.code}
            </p>
            <p className="mt-1 text-sm text-navy/70">{entry.detail}</p>
          </a>
        ))}
      </section>

      {rows.map((row) => (
        <div
          key={row.map((section) => section.id).join('-')}
          className={`mt-14 grid gap-8 ${row.length > 1 ? 'md:grid-cols-2' : ''}`}
        >
          {row.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              <h2 className="font-display text-3xl font-extrabold text-crm-terracotta">
                {section.title}
              </h2>
              <article className="mt-6 rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-sand/80 sm:px-6">
                <SectionBody section={section} />
              </article>
            </section>
          ))}
        </div>
      ))}

      <article className="mt-14 rounded-2xl bg-white px-5 py-6 shadow-sm ring-1 ring-sand/80 sm:px-6">
        <p className="text-base leading-7 text-navy">
          {closingBefore}<a href={`mailto:${COORDINATOR_EMAIL}`} className="font-semibold text-navy underline">{CLOSING_LINK}</a>{closingAfter}
        </p>
      </article>
    </div>
  );
}

function sectionRows(sections: readonly OrientationSection[]): OrientationSection[][] {
  const rows: OrientationSection[][] = [];
  let pair: OrientationSection[] = [];
  for (const section of sections) {
    if (section.span === 'full') {
      if (pair.length > 0) {
        rows.push(pair);
        pair = [];
      }
      rows.push([section]);
      continue;
    }
    pair.push(section);
    if (pair.length === 2) {
      rows.push(pair);
      pair = [];
    }
  }
  if (pair.length > 0) rows.push(pair);
  return rows;
}

function SectionBody({ section }: { section: OrientationSection }) {
  if (section.kind === 'access') {
    return (
      <>
        <p className="text-base leading-7 text-navy">{section.body}</p>
        <CodeBlock label={section.codeLabel} code={section.code} note={section.note} />
      </>
    );
  }

  if (section.kind === 'events') {
    return (
      <>
        <CopyList items={section.items} />
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {section.events.map((event) => (
            <li key={event.title} className="rounded-xl bg-sand/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/55">
                {event.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-navy">{event.detail}</p>
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (section.kind === 'chats') {
    return (
      <ul className="grid gap-3 sm:grid-cols-2">
        {section.chats.map((chat) => (
          <li key={chat.name} className="rounded-xl bg-crm-indigo-50 px-4 py-3">
            <p className="font-display text-lg font-extrabold text-navy">{chat.name}</p>
            <p className="mt-1 text-sm leading-6 text-navy">{chat.description}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <CopyList items={section.items} />
      {section.aside ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/45">
            {section.aside.title}
          </p>
          <dl className="mt-2 grid max-w-md grid-cols-2 gap-3">
            {section.aside.items.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-amber-400 bg-advise-wash px-4 py-3"
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-advise-amber">
                  {item.label}
                </dt>
                <dd className="mt-1 font-display text-xl font-extrabold text-navy">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </>
  );
}

function CopyList({ items }: { items: readonly string[] }) {
  if (items.length === 1) {
    return <p className="text-base leading-7 text-navy">{items[0]}</p>;
  }
  return (
    <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-navy">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function CodeBlock({ label, code, note }: { label: string; code: string; note?: string }) {
  return (
    <div className="mt-4 rounded-xl bg-crm-indigo-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/50">{label}</p>
      <p className="font-display text-3xl font-extrabold tracking-[0.06em] text-navy">{code}</p>
      {note ? <p className="mt-1 text-sm leading-6 text-navy/80">{note}</p> : null}
    </div>
  );
}
