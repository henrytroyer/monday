import { InfoTopicCarousel } from '../components/InfoTopicCarousel';
import { GENERAL_INFO_SECTION_LABEL } from '../lib/nav';
import { ORIENTATION_SECTIONS, type OrientationSection } from '../lib/orientationInfo';

const ORIENTATION_INFO_HEADER = '/brand/orientation-info-header.jpg';
const CARD_GRADIENT = 'bg-gradient-to-b from-[#667b96] via-[#647fa8] to-[#224a6d]';
const CARD_CLASS = `flex flex-col rounded-3xl px-5 py-5 text-white shadow-[0_16px_40px_rgba(27,54,93,0.18)] sm:px-6 sm:py-6 ${CARD_GRADIENT}`;

export function OrientationInfoScreen() {
  return (
    <InfoTopicCarousel
      header={<OrientationHeader />}
      ariaLabel="Orientation topics"
      topics={ORIENTATION_SECTIONS.map((section) => ({ id: section.id, label: section.nav }))}
      render={(index) => {
        const section = ORIENTATION_SECTIONS[index];
        if (!section) return null;
        return (
          <article className={CARD_CLASS}>
            <h2 className="font-display text-2xl font-extrabold text-white!">{section.title}</h2>
            <div className="mt-3">
              <SectionBody section={section} />
            </div>
          </article>
        );
      }}
    />
  );
}

function OrientationHeader() {
  return (
    <header className="relative">
      <img
        src={ORIENTATION_INFO_HEADER}
        alt=""
        className="h-44 w-full object-cover object-center sm:h-52"
      />
      <h1 className="absolute left-3 top-3 w-fit rounded-2xl bg-white/95 px-5 py-3 font-display text-4xl font-extrabold leading-tight text-navy shadow-lg ring-1 ring-white/60 sm:left-4 sm:top-4 sm:px-6 sm:text-5xl">
        {GENERAL_INFO_SECTION_LABEL.orientation}
      </h1>
    </header>
  );
}

function SectionBody({ section }: { section: OrientationSection }) {
  if (section.kind === 'access') {
    return (
      <>
        <p className="text-base leading-7 text-white">{section.body}</p>
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
            <li key={event.title} className="rounded-xl bg-white/15 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                {event.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-white">{event.detail}</p>
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
          <li key={chat.name} className="rounded-xl bg-white/15 px-4 py-3">
            <p className="font-display text-lg font-extrabold text-white">{chat.name}</p>
            <p className="mt-1 text-sm leading-6 text-white/90">{chat.description}</p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
            {section.aside.title}
          </p>
          <dl className="mt-2 grid max-w-md grid-cols-2 gap-3">
            {section.aside.items.map((item) => (
              <div key={item.label} className="rounded-xl bg-white/15 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                  {item.label}
                </dt>
                <dd className="mt-1 font-display text-xl font-extrabold text-white">{item.value}</dd>
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
    return <p className="text-base leading-7 text-white">{items[0]}</p>;
  }
  return (
    <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-white marker:text-white">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function CodeBlock({ label, code, note }: { label: string; code: string; note?: string }) {
  return (
    <div className="mt-4 rounded-xl bg-white/15 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">{label}</p>
      <p className="font-display text-3xl font-extrabold tracking-[0.06em] text-white">{code}</p>
      {note ? <p className="mt-1 text-sm leading-6 text-white/90">{note}</p> : null}
    </div>
  );
}
