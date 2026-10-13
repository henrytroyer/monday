import { CRISIS_FACTS, CRISIS_TITLE } from '../lib/volunteerGuide';

export function CrisisReminder() {
  return (
    <section className="mt-6 text-center">
      <h2 className="font-display text-xl font-semibold tracking-tight text-crm-terracotta">
        {CRISIS_TITLE}
      </h2>
      <span className="mx-auto mt-1 block h-0.5 w-12 bg-crm-terracotta" aria-hidden />
      <ul className="mt-5 flex flex-col items-center gap-4">
        {CRISIS_FACTS.map((fact) => (
          <li key={fact.icon} className="flex max-w-md items-start justify-center gap-3">
            <CrisisIcon name={fact.icon} />
            <p className="text-center text-sm leading-relaxed text-navy">{fact.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CrisisIcon({ name }: { name: (typeof CRISIS_FACTS)[number]['icon'] }) {
  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-crm-terracotta">
      {name === 'displaced' ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path
            fill="currentColor"
            d="M13 2 4 14h7l-1 8 10-14h-7l0-6z"
          />
        </svg>
      ) : null}
      {name === 'hosted' ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path
            fill="currentColor"
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2c.7 0 2.2 1.6 2.8 5H9.2C9.8 5.6 11.3 4 12 4Zm-4 7h8c-.1 1.1-.4 2.1-.8 3H8.8c-.4-.9-.7-1.9-.8-3Zm.2 5h7.6c-.7 2.2-1.9 3.6-3.8 3.6S8.9 18.2 8.2 16Z"
          />
        </svg>
      ) : null}
      {name === 'years' ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path
            fill="currentColor"
            d="M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-6 9.5c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5V15H6v-1.5ZM4 17h16v2H4v-2Zm2 3h12v1H6v-1Z"
          />
        </svg>
      ) : null}
    </span>
  );
}
