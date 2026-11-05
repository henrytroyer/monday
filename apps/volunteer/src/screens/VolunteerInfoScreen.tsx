import { useState, type ReactNode } from 'react';
import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { ServicePeriodTimeline } from '../components/ServicePeriodTimeline';
import { NOT_ON_FILE, myInfoFor, type MyInfoDocument } from '../lib/myInfo';
import { downloadPreparationDocumentPdf } from '../lib/preparationDocumentPdf';
import { servicePeriodFor } from '../lib/servicePeriod';
import { COORDINATOR_EMAIL } from '../lib/volunteerGuide';

export function VolunteerInfoScreen({
  me,
  onBack,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
}) {
  const info = myInfoFor(me);
  const servicePeriod = servicePeriodFor(me);
  const [copied, setCopied] = useState<string | null>(null);
  const lede = [info.location, info.term].filter((part) => part !== NOT_ON_FILE);

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

  return (
    <div>
      <BackButton onClick={onBack} />

      <section className="grid items-center gap-8 py-4 md:grid-cols-2 md:gap-12 md:py-8">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-navy sm:text-5xl">
            {info.name}
          </h1>
          {lede.length > 0 ? (
            <p className="mt-3 font-story text-lg leading-relaxed text-navy">{lede.join(' · ')}</p>
          ) : null}
          <dl className="mt-6 grid gap-4">
            <StoryLine label="Phone">
              <PhoneLink phone={info.phone} />
            </StoryLine>
            <StoryLine label="Email">
              <MailLink email={info.email} />
            </StoryLine>
            <StoryLine label="Birthday">{info.birthday}</StoryLine>
            <StoryLine label="Gender">{info.gender}</StoryLine>
            <StoryLine label="Home address">
              {info.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </StoryLine>
          </dl>
        </div>
        <img
          src={info.photo}
          alt=""
          className="mx-auto w-full max-w-sm rounded-[2rem] bg-white object-contain object-center shadow-sm md:max-w-none"
        />
      </section>

      <Band className="bg-[#e8eef3]">
        <ServicePeriodTimeline period={servicePeriod} />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          <FactTile label="Location" value={info.location} />
          <FactTile label="Length" value={info.length} />
          <FactTile label="Term" value={info.term} />
          <FactTile label="Home airport" value={info.airport} />
        </ul>
      </Band>

      <section className="py-14">
        <h2 className="text-center font-display text-3xl font-extrabold text-navy sm:text-4xl">
          Travel
        </h2>
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-0">
          <div className="md:pr-10">
            <h3 className="font-display text-2xl font-extrabold text-navy">Passport</h3>
            {info.passportPhoto ? (
              <img
                src={info.passportPhoto}
                alt="Passport"
                className="mt-4 w-full max-w-xs rounded-2xl border border-sand object-contain"
              />
            ) : (
              <p className="mt-4 font-story text-navy/70">Passport photo is not on file.</p>
            )}
            <dl className="mt-5 grid gap-4">
              <StoryLine label="Passport number">
                <CopyValue
                  id="passport"
                  value={info.passportNumber}
                  copied={copied}
                  onCopy={copy}
                />
              </StoryLine>
              <StoryLine label="Expiration">{info.passportExpiration}</StoryLine>
            </dl>
          </div>
          <div className="md:border-l md:border-navy/15 md:pl-10">
            <h3 className="font-display text-2xl font-extrabold text-navy">Flights</h3>
            {info.flights ? (
              <dl className="mt-5 grid gap-4">
                <StoryLine label="Record locator">
                  <CopyValue
                    id="locator"
                    value={info.flights.recordLocator}
                    copied={copied}
                    onCopy={copy}
                  />
                </StoryLine>
                <StoryLine label="Arrive on the field">
                  <span className="block">{info.flights.arrivalFlight}</span>
                  <span className="block">{info.flights.arrival}</span>
                </StoryLine>
                <StoryLine label="Return home">
                  <span className="block">{info.flights.returnFlight}</span>
                  <span className="block">{info.flights.returning}</span>
                </StoryLine>
              </dl>
            ) : (
              <p className="mt-4 font-story text-navy/70">Flight details are not on file yet.</p>
            )}
          </div>
        </div>
      </section>

      <Band className="bg-navy text-white">
        <h2 className="text-center font-display text-3xl font-extrabold text-white! sm:text-4xl">
          With you
        </h2>
        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {info.documents.map((document) => (
            <DocumentItem key={document.id} document={document} />
          ))}
          <PlainItem label="Medical" value={info.medical} />
          <PlainItem label="Languages" value={info.languages} />
          <PlainItem label="Skills" value={info.skills} />
          <PlainItem label="Family with you" value={info.family} />
        </ul>
      </Band>

      <div className="flex justify-center py-12">
        <a
          href={`mailto:${COORDINATOR_EMAIL}`}
          className="rounded-full bg-crm-terracotta px-8 py-3 text-sm font-semibold tracking-wide text-white hover:brightness-95"
        >
          Questions? Message us
        </a>
      </div>
    </div>
  );
}

function Band({ className, children }: { className: string; children: ReactNode }) {
  return (
    <section className={`relative left-1/2 w-screen -translate-x-1/2 px-5 py-14 ${className}`}>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

function StoryLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-display text-lg font-extrabold text-navy">{label}</dt>
      <dd className="font-story text-base leading-relaxed text-navy">{children}</dd>
    </div>
  );
}

function FactTile({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-3xl bg-white px-6 py-7 text-center">
      <h3 className="font-display text-2xl font-extrabold text-navy">{label}</h3>
      <p className={`mt-2 font-story text-lg leading-relaxed ${value === NOT_ON_FILE ? 'text-navy/50' : 'text-navy'}`}>
        {value}
      </p>
    </li>
  );
}

function PlainItem({ label, value }: { label: string; value: string }) {
  return (
    <li>
      <h3 className="font-display text-xl font-extrabold text-white!">{label}</h3>
      <p className={`mt-1 font-story text-base leading-relaxed ${value === NOT_ON_FILE ? 'text-white/60' : 'text-white/90'}`}>
        {value}
      </p>
    </li>
  );
}

function DocumentItem({ document }: { document: MyInfoDocument }) {
  return (
    <li>
      <h3 className="font-display text-xl font-extrabold text-white!">{document.title}</h3>
      <p className={`mt-1 font-story text-base ${document.onFile ? 'text-white' : 'text-white/70'}`}>
        {document.statusLabel}
      </p>
      {document.draft ? (
        <button
          type="button"
          onClick={() => {
            if (document.draft) downloadPreparationDocumentPdf(document.id, document.draft);
          }}
          className="mt-2 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4"
        >
          Download
        </button>
      ) : null}
    </li>
  );
}

function PhoneLink({ phone }: { phone: string }) {
  if (phone === NOT_ON_FILE) return phone;
  const digits = phone.replace(/\D/g, '');
  return (
    <a href={`tel:${digits}`} className="hover:underline">
      {phone}
    </a>
  );
}

function MailLink({ email }: { email: string }) {
  if (email === NOT_ON_FILE) return email;
  return (
    <a href={`mailto:${email}`} className="break-all hover:underline">
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
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>{value}</span>
      <button
        type="button"
        onClick={() => onCopy(id, value)}
        className="font-display text-xs font-bold tracking-wide text-navy underline decoration-navy/30 underline-offset-4"
      >
        {copied === id ? 'Copied' : 'Copy'}
      </button>
    </span>
  );
}
