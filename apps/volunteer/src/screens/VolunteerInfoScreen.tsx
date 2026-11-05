import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { ServicePeriodTimeline } from '../components/ServicePeriodTimeline';
import { NOT_ON_FILE, myInfoFor, type MyInfoDocument } from '../lib/myInfo';
import { GERMANY_GREETING_BACKDROP, HOME_GREETING_BACKDROP } from '../lib/nav';
import { downloadPreparationDocumentPdf } from '../lib/preparationDocumentPdf';
import { servicePeriodFor } from '../lib/servicePeriod';
import { COORDINATOR_EMAIL } from '../lib/volunteerGuide';

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'service', label: 'Service' },
  { id: 'passport', label: 'Passport' },
  { id: 'flights', label: 'Flights' },
  { id: 'documents', label: 'Documents' },
  { id: 'health', label: 'Health' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const FOOTER_BLUE = '#667b96';

export function VolunteerInfoScreen({ me }: { me: VolunteerApplicationStatus }) {
  const info = myInfoFor(me);
  const servicePeriod = servicePeriodFor(me);
  const [copied, setCopied] = useState<string | null>(null);
  const [active, setActive] = useState<SectionId>('profile');
  const ignoreScroll = useRef(0);
  const cover = /germany/i.test(info.location)
    ? GERMANY_GREETING_BACKDROP
    : HOME_GREETING_BACKDROP;
  const onFile = info.documents.filter((document) => document.onFile).length;
  const role = [info.location, info.term].filter((part) => part !== NOT_ON_FILE).join(' · ');

  useEffect(() => {
    const nodes = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (Date.now() < ignoreScroll.current) return;
        const id = visible?.target.id;
        if (id && SECTIONS.some((section) => section.id === id)) {
          setActive(id as SectionId);
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.15, 0.4] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function copy(id: string, value: string) {
    if (!value || value === NOT_ON_FILE) return;
    void navigator.clipboard.writeText(value).then(
      () => {
        setCopied(id);
        window.setTimeout(() => {
          setCopied((current) => (current === id ? null : current));
        }, 1500);
      },
      () => undefined,
    );
  }

  function jump(id: SectionId) {
    ignoreScroll.current = Date.now() + 800;
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-x-4">
      <div
        className="relative left-1/2 w-screen -translate-x-1/2 pt-4 pb-[calc((100vw-min(100vw,72rem))/2+1.25rem)] lg:col-span-2"
        style={{ backgroundColor: FOOTER_BLUE }}
      >
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-4 px-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-4">
        <aside className="lg:sticky lg:top-24">
          <nav aria-label="Your records" className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-sand/70">
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-navy/45">
              Your records
            </p>
            <ul className="flex gap-1 overflow-x-auto lg:flex-col">
              {SECTIONS.map((section) => {
                const current = active === section.id;
                return (
                  <li key={section.id} className="shrink-0">
                    <button
                      type="button"
                      aria-current={current ? 'true' : undefined}
                      onClick={() => jump(section.id)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                        current ? 'bg-navy text-white' : 'text-navy hover:bg-crm-indigo-50'
                      }`}
                    >
                      <RecordIcon id={section.id} />
                      {section.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

          <section className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sand/70">
            <img src={cover} alt="" className="h-36 w-full object-cover object-center sm:h-44" />
            <div className="px-5 pb-5 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <img
                    src={info.photo}
                    alt=""
                    className="-mt-12 h-24 w-24 shrink-0 rounded-full bg-white object-cover object-[center_18%] ring-4 ring-white"
                  />
                  <div className="min-w-0 pb-1">
                    <h1 className="font-display text-2xl font-extrabold leading-tight text-navy sm:text-3xl">
                      {info.name}
                    </h1>
                    {role ? <p className="mt-0.5 text-sm text-navy/70">{role}</p> : null}
                  </div>
                </div>
                <a
                  href={`mailto:${COORDINATOR_EMAIL}`}
                  className="inline-flex w-fit rounded-full bg-crm-terracotta px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
                >
                  Message us
                </a>
              </div>
              <dl className="mt-5 grid grid-cols-3 border-t border-sand/80 pt-4 text-center">
                <Stat label="Length" value={info.length} />
                <Stat label="Term" value={info.term} />
                <Stat
                  label="Documents"
                  value={onFile === 0 ? NOT_ON_FILE : onFile === 1 ? '1 on file' : `${onFile} on file`}
                />
              </dl>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-4 min-w-0 lg:col-start-2">
        <div>
            <InfoCard id="service" title="Service">
              <ServicePeriodTimeline period={servicePeriod} labelled={false} />
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Detail label="Location" value={info.location} />
                <Detail label="Length" value={info.length} />
                <Detail label="Term" value={info.term} />
                <Detail label="Home airport" value={info.airport} />
              </dl>
            </InfoCard>
          </div>

          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <InfoCard id="profile" title="Introduction">
              <dl className="grid gap-3">
                <IntroRow label="Phone">
                  <PhoneLink phone={info.phone} />
                </IntroRow>
                <IntroRow label="Email">
                  <MailLink email={info.email} />
                </IntroRow>
                <IntroRow label="Birthday">{info.birthday}</IntroRow>
                <IntroRow label="Gender">{info.gender}</IntroRow>
                <IntroRow label="Home address">
                  {info.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </IntroRow>
              </dl>
            </InfoCard>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard id="passport" title="Passport">
                  {info.passportPhoto ? (
                    <img
                      src={info.passportPhoto}
                      alt="Passport"
                      className="mb-4 w-full rounded-xl border border-sand object-contain"
                    />
                  ) : (
                    <p className="mb-3 text-sm text-navy/60">Passport photo is not on file.</p>
                  )}
                  <dl className="grid gap-3">
                    <Detail label="Passport number">
                      <CopyValue
                        id="passport"
                        value={info.passportNumber}
                        copied={copied}
                        onCopy={copy}
                      />
                    </Detail>
                    <Detail label="Expiration" value={info.passportExpiration} />
                  </dl>
                </InfoCard>

                <InfoCard id="flights" title="Flights">
                  {info.flights ? (
                    <dl className="grid gap-3">
                      <Detail label="Record locator">
                        <CopyValue
                          id="locator"
                          value={info.flights.recordLocator}
                          copied={copied}
                          onCopy={copy}
                        />
                      </Detail>
                      <Detail label="Arrive on the field">
                        <span className="block">{info.flights.arrivalFlight}</span>
                        <span className="block text-navy/75">{info.flights.arrival}</span>
                      </Detail>
                      <Detail label="Return home">
                        <span className="block">{info.flights.returnFlight}</span>
                        <span className="block text-navy/75">{info.flights.returning}</span>
                      </Detail>
                    </dl>
                  ) : (
                    <p className="text-sm text-navy/60">Flight details are not on file yet.</p>
                  )}
                </InfoCard>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard id="documents" title="Documents">
                  <ul className="grid gap-3">
                    {info.documents.map((document) => (
                      <DocumentRow key={document.id} document={document} />
                    ))}
                  </ul>
                </InfoCard>

                <InfoCard id="health" title="Health and team">
                  <dl className="grid gap-3">
                    <Detail label="Medical" value={info.medical} />
                    <Detail label="Languages" value={info.languages} />
                    <Detail label="Skills" value={info.skills} />
                    <Detail label="Family with you" value={info.family} />
                  </dl>
                </InfoCard>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}

function InfoCard({
  id,
  title,
  children,
}: {
  id: SectionId;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand/70">
      <h2 className="font-display text-lg font-extrabold text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/45">{label}</dt>
      <dd className={`mt-1 text-sm font-semibold ${value === NOT_ON_FILE ? 'text-navy/45' : 'text-navy'}`}>
        {value}
      </dd>
    </div>
  );
}

function IntroRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/45">{label}</dt>
      <dd className="mt-0.5 text-sm text-navy">{children}</dd>
    </div>
  );
}

function Detail({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  const text = children ?? value;
  const muted = value === NOT_ON_FILE;
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/45">{label}</dt>
      <dd className={`mt-0.5 text-sm ${muted ? 'text-navy/45' : 'text-navy'}`}>{text}</dd>
    </div>
  );
}

function DocumentRow({ document }: { document: MyInfoDocument }) {
  return (
    <li className="rounded-xl bg-crm-surface px-3 py-3">
      <p className="font-semibold text-navy">{document.title}</p>
      <p className={`mt-0.5 text-sm ${document.onFile ? 'text-[#1f9d55]' : 'text-navy/60'}`}>
        {document.statusLabel}
      </p>
      {document.draft ? (
        <button
          type="button"
          onClick={() => {
            if (document.draft) downloadPreparationDocumentPdf(document.id, document.draft);
          }}
          className="mt-2 text-sm font-semibold text-navy underline decoration-sand underline-offset-2"
        >
          Download
        </button>
      ) : null}
    </li>
  );
}

function PhoneLink({ phone }: { phone: string }) {
  if (phone === NOT_ON_FILE) return phone;
  return (
    <a href={`tel:${phone.replace(/\D/g, '')}`} className="font-medium hover:underline">
      {phone}
    </a>
  );
}

function MailLink({ email }: { email: string }) {
  if (email === NOT_ON_FILE) return email;
  return (
    <a href={`mailto:${email}`} className="break-all font-medium hover:underline">
      {email}
    </a>
  );
}

function CopyValue({
  id,
  value,
  copied,
  onCopy,
}: {
  id: string;
  value: string;
  copied: string | null;
  onCopy: (id: string, value: string) => void;
}) {
  if (value === NOT_ON_FILE) return value;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-medium tracking-wide">{value}</span>
      <button
        type="button"
        onClick={() => onCopy(id, value)}
        className="rounded-full bg-crm-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-navy hover:bg-sand/70"
      >
        {copied === id ? 'Copied' : 'Copy'}
      </button>
    </span>
  );
}

function RecordIcon({ id }: { id: SectionId }) {
  const path = {
    profile: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z',
    service: 'M4 7h16v2H4zm0 4h10v2H4zm0 4h16v2H4z',
    passport: 'M6 3h9a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6zm4 4a2.5 2.5 0 1 0 2.5 2.5A2.5 2.5 0 0 0 10 7zm-3 9c.4-2 2-3 3.5-3s3.1 1 3.5 3z',
    flights: 'M3 13l18-6-4 8-5 1-2 4-2-5-5-2z',
    documents: 'M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V7h3.5z',
    health: 'M11 4h2v5h5v2h-5v5h-2v-5H6V9h5z',
  }[id];
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path fill="currentColor" d={path} />
    </svg>
  );
}
