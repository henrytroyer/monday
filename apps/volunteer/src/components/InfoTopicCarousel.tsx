import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { stepOrientation } from '../lib/orientationInfo';
import { CORE_VALUES_WASH } from '../lib/visionValues';

export type InfoTopic = {
  id: string;
  label: string;
};

export function InfoTopicCarousel({
  title,
  header,
  intro,
  ariaLabel,
  topics,
  render,
  footer,
}: {
  title?: string;
  header?: ReactNode;
  intro?: string;
  ariaLabel: string;
  topics: readonly InfoTopic[];
  render: (index: number) => ReactNode;
  footer?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const count = topics.length;
  const topic = topics[index] ?? topics[0];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!topic) return null;

  function show(next: number) {
    setIndex(stepOrientation(next, 0, count));
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + 1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(index - 1);
    }
  }

  return (
    <div
      className="relative left-1/2 -my-8 w-screen -translate-x-1/2 bg-[#f7f7f7] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${CORE_VALUES_WASH})` }}
      onKeyDown={onKey}
    >
      {header}
      <div className={`mx-auto min-h-[calc(100dvh-12rem)] w-full max-w-5xl px-5 ${header ? 'pb-8' : 'py-8'}`}>
        {header || !title ? null : (
          <h1 className="font-display max-w-3xl text-4xl font-extrabold leading-tight text-navy sm:text-5xl">
            {title}
          </h1>
        )}
        {intro ? <p className="mt-4 max-w-2xl text-lg leading-8 text-navy">{intro}</p> : null}

        <nav aria-label={ariaLabel} className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {topics.map((item, topicIndex) => {
              const current = topicIndex === index;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={current ? 'true' : undefined}
                    onClick={() => show(topicIndex)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      current
                        ? 'bg-navy text-white'
                        : 'bg-white text-navy shadow-sm ring-1 ring-sand/80 hover:bg-crm-indigo-50'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section aria-roledescription="carousel" aria-label={ariaLabel} className="mt-6">
          <p className="sr-only" aria-live="polite">
            {topic.label}, {index + 1} of {count}
          </p>
          <div id={topic.id}>{render(index)}</div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Previous topic"
              onClick={() => show(index - 1)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-dark"
            >
              <Chevron direction="previous" />
              Previous
            </button>
            <p className="text-sm font-semibold text-navy">
              {index + 1} / {count}
            </p>
            <button
              type="button"
              aria-label="Next topic"
              onClick={() => show(index + 1)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-dark"
            >
              Next
              <Chevron direction="next" />
            </button>
          </div>
        </section>
        {footer ? <div className="mt-8">{footer}</div> : null}
      </div>
    </div>
  );
}

function Chevron({ direction }: { direction: 'previous' | 'next' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === 'previous' ? 'M15 6 9 12l6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}
