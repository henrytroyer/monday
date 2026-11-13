import { useState } from 'react';
import { InfoTopicCarousel } from '../components/InfoTopicCarousel';
import {
  GALINI_NAV,
  GALINI_RULES,
  GALINI_WIFI,
  type GaliniRule,
} from '../lib/galiniRules';
import { GENERAL_INFO_SECTION_LABEL } from '../lib/nav';

const GALINI_RULES_HEADER = '/brand/galini-rules-header.jpg?v=2';
const CARD_GRADIENT = 'bg-gradient-to-b from-[#667b96] via-[#647fa8] to-[#224a6d]';
const CARD_CLASS = `flex flex-col rounded-3xl px-5 py-5 text-white shadow-[0_16px_40px_rgba(27,54,93,0.18)] sm:px-6 sm:py-6 ${CARD_GRADIENT}`;

export function GaliniRulesScreen() {
  const [copied, setCopied] = useState(false);

  function copyPassword() {
    void navigator.clipboard.writeText(GALINI_WIFI.password).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => undefined,
    );
  }

  return (
    <InfoTopicCarousel
      header={<GaliniHeader />}
      ariaLabel="Galini rules"
      topics={GALINI_NAV}
      render={(index) => {
        const topic = GALINI_NAV[index];
        if (!topic) return null;
        if (topic.id === GALINI_WIFI.id) {
          return (
            <article className={CARD_CLASS}>
              <h2 className="font-display text-2xl font-extrabold text-white!">{GALINI_WIFI.title}</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white/15 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                    Network
                  </dt>
                  <dd className="mt-1 font-display text-2xl font-extrabold leading-tight text-white">
                    {GALINI_WIFI.networks.join(' or ')}
                  </dd>
                </div>
                <div className="rounded-xl bg-white/15 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                    Password
                  </dt>
                  <dd className="mt-1 font-display text-2xl font-extrabold tracking-wide text-white">
                    {GALINI_WIFI.password}
                  </dd>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="mt-3 min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-navy hover:bg-white/90"
                  >
                    {copied ? 'Copied' : 'Copy password'}
                  </button>
                </div>
              </dl>
            </article>
          );
        }
        const rule = GALINI_RULES.find((item) => item.id === topic.id);
        if (!rule) return null;
        return <RuleCard rule={rule} />;
      }}
    />
  );
}

function GaliniHeader() {
  return (
    <header className="relative">
      <img
        src={GALINI_RULES_HEADER}
        alt=""
        className="h-44 w-full object-cover object-center sm:h-52"
      />
      <h1 className="absolute left-3 top-3 w-fit rounded-2xl bg-white/95 px-5 py-3 font-display text-4xl font-extrabold leading-tight text-navy shadow-lg ring-1 ring-white/60 sm:left-4 sm:top-4 sm:px-6 sm:text-5xl">
        {GENERAL_INFO_SECTION_LABEL.galini}
      </h1>
    </header>
  );
}

function RuleCard({ rule }: { rule: GaliniRule }) {
  return (
    <article className={CARD_CLASS}>
      <h2 className="font-display text-2xl font-extrabold text-white!">{rule.title}</h2>
      <div className="mt-3">
        {rule.items.length === 1 ? (
          <p className="text-base leading-7 text-white">{rule.items[0]}</p>
        ) : (
          <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-white marker:text-white">
            {rule.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
