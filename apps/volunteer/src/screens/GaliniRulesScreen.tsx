import { useState } from 'react';
import {
  GALINI_INTRO,
  GALINI_NAV,
  GALINI_RULES,
  GALINI_WIFI,
  type GaliniRule,
} from '../lib/galiniRules';
import { GENERAL_INFO_SECTION_LABEL } from '../lib/nav';

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
    <div className="pb-8">
      <h1 className="font-display max-w-3xl text-4xl font-extrabold leading-tight text-navy sm:text-5xl">
        {GENERAL_INFO_SECTION_LABEL.galini}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-navy">{GALINI_INTRO}</p>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
        {GALINI_NAV.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm ring-1 ring-sand/80 hover:bg-crm-indigo-50"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <section id={GALINI_WIFI.id} className="mt-8 scroll-mt-36">
        <article className="rounded-2xl bg-white px-5 py-6 shadow-sm ring-1 ring-sand/80 sm:px-6">
          <h2 className="font-display text-3xl font-extrabold text-crm-terracotta">{GALINI_WIFI.title}</h2>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-crm-indigo-50 px-4 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/55">Network</dt>
              <dd className="mt-1 font-display text-2xl font-extrabold leading-tight text-navy">
                {GALINI_WIFI.networks.join(' or ')}
              </dd>
            </div>
            <div className="rounded-xl bg-crm-indigo-50 px-4 py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/55">Password</dt>
              <dd className="mt-1 font-display text-2xl font-extrabold tracking-wide text-navy">
                {GALINI_WIFI.password}
              </dd>
              <button
                type="button"
                onClick={copyPassword}
                className="mt-3 min-h-11 rounded-full bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-dark"
              >
                {copied ? 'Copied' : 'Copy password'}
              </button>
            </div>
          </dl>
        </article>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {GALINI_RULES.map((rule) => (
          <RuleCard key={rule.id} rule={rule} />
        ))}
      </div>
    </div>
  );
}

function RuleCard({ rule }: { rule: GaliniRule }) {
  return (
    <div className={rule.wide ? 'md:col-span-2' : undefined}>
      <article
        id={rule.id}
        className="scroll-mt-36 rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-sand/80 sm:px-6"
      >
        <h2 className="font-display text-xl font-extrabold text-navy">{rule.title}</h2>
        <span className="mt-2 block h-0.5 w-10 rounded-full bg-crm-terracotta" aria-hidden="true" />
        {rule.items.length === 1 ? (
          <p className="mt-4 text-base leading-7 text-navy">{rule.items[0]}</p>
        ) : (
          <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-navy">
            {rule.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
