import { useState, type ReactNode } from 'react';
import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { DocumentCopy } from '../components/DocumentCopy';
import { ItineraryImage, PassportImage } from '../components/TravelCopies';
import { NOT_ON_FILE, myInfoFor, type MyInfoDocument } from '../lib/myInfo';
import { GERMANY_GREETING_BACKDROP, HOME_GREETING_BACKDROP } from '../lib/nav';
import { DOCUMENT_FIELDS } from '../lib/preparationDocuments';
import { downloadPreparationDocumentPdf } from '../lib/preparationDocumentPdf';
import { COORDINATOR_EMAIL } from '../lib/volunteerGuide';

type SectionId = 'profile' | 'passport' | 'flights' | 'documents';

export function VolunteerInfoScreen({ me }: { me: VolunteerApplicationStatus }) {
  const info = myInfoFor(me);
  const [copied, setCopied] = useState<string | null>(null);
  const [openDocument, setOpenDocument] = useState<string | null>(null);
  const cover = /germany/i.test(info.location)
    ? GERMANY_GREETING_BACKDROP
    : HOME_GREETING_BACKDROP;
  const onFile = info.documents.filter((document) => document.onFile).length;
  const role = [info.location, info.term].filter((part) => part !== NOT_ON_FILE).join(' · ');

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
      <div className="relative left-1/2 w-screen -translate-x-1/2">
        <section id="profile" className="min-w-0 bg-white">
          <img src={cover} alt="" className="h-36 w-full object-cover object-center sm:h-44" />
          <div className="mx-auto w-full max-w-6xl px-5 pb-5 sm:px-6">
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
              <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-sand/80 pt-5">
                <Stat label="Length" value={info.length} />
                <Stat label="Term" value={info.term} />
                <Stat
                  label="Documents"
                  value={onFile === 0 ? NOT_ON_FILE : onFile === 1 ? '1 on file' : `${onFile} on file`}
                />
              </dl>
              <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-sand/80 pt-5 sm:grid-cols-3">
                <IntroRow label="Phone">
                  <PhoneLink phone={info.phone} />
                </IntroRow>
                <IntroRow label="Email">
                  <MailLink email={info.email} />
                </IntroRow>
                <IntroRow label="Birthday">{info.birthday}</IntroRow>
                <IntroRow label="Gender">{info.gender}</IntroRow>
                <IntroRow label="Home address" className="sm:col-span-2">
                  {info.address.join(', ')}
                </IntroRow>
              </dl>
            </div>
        </section>
      </div>

      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-gradient-to-b from-[#667b96] via-[#647fa8] to-[#224a6d] px-8 py-12 md:px-12 md:py-16">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 md:gap-4">
          <InfoCard id="documents" title="Documents">
            <ul className="grid gap-3 sm:grid-cols-2">
              {info.documents.map((document) => (
                <DocumentSnapshot
                  key={document.id}
                  document={document}
                  open={openDocument === document.id}
                  onToggle={() =>
                    setOpenDocument((current) => (current === document.id ? null : document.id))
                  }
                />
              ))}
            </ul>
          </InfoCard>

          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <InfoCard id="passport" title="Passport">
                  <RecordSnapshot
                    thumb={
                      info.passportPhoto ? (
                        <PassportImage
                          src={info.passportPhoto}
                          number={info.passportNumber}
                          expiration={info.passportExpiration}
                        />
                      ) : null
                    }
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy/45">
                      Passport
                    </p>
                    <div className="mt-2 h-px w-10 bg-crm-terracotta" />
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy/45">
                      Passport number
                    </p>
                    <div className="font-display text-base font-extrabold leading-tight text-navy">
                      <CopyValue
                        id="passport"
                        value={info.passportNumber}
                        copied={copied}
                        onCopy={copy}
                      />
                    </div>
                    {info.passportPhoto ? null : (
                      <p className="mt-3 text-sm text-navy/60">Passport photo is not on file.</p>
                    )}
                  </RecordSnapshot>
                </InfoCard>

                <InfoCard id="flights" title="Flights">
                  {info.flights ? (
                    <RecordSnapshot thumb={<ItineraryImage flights={info.flights} />}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy/45">
                        Flights
                      </p>
                      <div className="mt-2 h-px w-10 bg-crm-terracotta" />
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy/45">
                        Record locator
                      </p>
                      <div className="font-display text-base font-extrabold leading-tight text-navy">
                        <CopyValue
                          id="locator"
                          value={info.flights.recordLocator}
                          copied={copied}
                          onCopy={copy}
                        />
                      </div>
                    </RecordSnapshot>
                  ) : (
                    <p className="text-sm text-navy/60">Flight details are not on file yet.</p>
                  )}
                </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordSnapshot({ children, thumb }: { children: ReactNode; thumb?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-crm-surface p-3">
      <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-sand/80">
        <div className="min-w-0 flex-1">{children}</div>
        {thumb}
      </div>
    </div>
  );
}

function InfoCard({
  id,
  title,
  children,
  className = '',
}: {
  id: SectionId;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 rounded-2xl bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,32,56,0.16)] md:px-5 md:py-5 ${className}`}
    >
      <h2 className="font-display text-xl font-bold leading-tight text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-crm-terracotta">{label}</dt>
      <dd className={`mt-1 text-sm font-semibold ${value === NOT_ON_FILE ? 'text-navy/45' : 'text-navy'}`}>
        {value}
      </dd>
    </div>
  );
}

function IntroRow({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-navy">{label}</dt>
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

function DocumentSnapshot({
  document,
  open,
  onToggle,
}: {
  document: MyInfoDocument;
  open: boolean;
  onToggle: () => void;
}) {
  const fields = DOCUMENT_FIELDS[document.id];
  const draft = document.draft;
  return (
    <li className="flex flex-col rounded-2xl bg-crm-surface p-3">
      <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-sand/80">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy/45">
            {fields.title}
          </p>
          <div className="mt-2 h-px w-10 bg-crm-terracotta" />
          {draft ? (
            <p className="mt-3 font-display text-base font-extrabold leading-tight text-navy">
              {draft.name || document.title}
            </p>
          ) : (
            <p className="mt-3 text-sm text-navy/60">Nothing has been uploaded yet.</p>
          )}
          <p className={`mt-3 text-xs font-semibold ${document.onFile ? 'text-[#1f9d55]' : 'text-navy/60'}`}>
            {document.statusLabel}
          </p>
          {draft ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={onToggle}
              className="mt-3 inline-flex rounded-full bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
            >
              {open ? 'Close' : 'Open'}
            </button>
          ) : null}
        </div>
        <DocumentCopy document={document} />
      </div>
      {open && draft ? (
        <dl className="mt-3 grid gap-2 px-1">
          <Detail label={fields.nameLabel} value={draft.name || NOT_ON_FILE} />
          <Detail label={fields.dateLabel} value={draft.date || NOT_ON_FILE} />
          <Detail
            label={fields.confirmLabel}
            value={draft.confirmed === 'yes' ? 'Yes' : NOT_ON_FILE}
          />
          {draft.fileName ? <Detail label="File" value={draft.fileName} /> : null}
          <div>
            <button
              type="button"
              onClick={() => downloadPreparationDocumentPdf(document.id, draft)}
              className="text-sm font-semibold text-navy underline decoration-sand underline-offset-2"
            >
              Download
            </button>
          </div>
        </dl>
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
      <span className="font-display text-base font-extrabold leading-tight tracking-wide">{value}</span>
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
