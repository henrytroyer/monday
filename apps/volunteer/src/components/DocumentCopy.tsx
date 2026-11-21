import { useCallback, useState } from 'react';
import type { MyInfoDocument } from '../lib/myInfo';
import { DOCUMENT_FIELDS } from '../lib/preparationDocuments';
import {
  downloadPreparationDocumentPdf,
  printPreparationDocument,
} from '../lib/preparationDocumentPdf';
import { CertificatePdfThumb } from './CertificatePdfThumb';
import { PreviewDialog } from './PreviewDialog';

export function DocumentCopy({
  document: record,
  volunteerName = 'Volunteer',
}: {
  document: MyInfoDocument;
  volunteerName?: string;
}) {
  const draft = record.draft;
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (!draft) return null;
  const fields = DOCUMENT_FIELDS[record.id];
  const page = {
    kind: record.id,
    title: fields.title,
    nameLabel: fields.nameLabel,
    name: draft.name || fields.title,
    dateLabel: fields.dateLabel,
    date: draft.date,
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${fields.title}`}
        aria-haspopup="dialog"
        className="shrink-0 rounded bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <CertificatePdfThumb kaya={page.kind === 'safeguarding_certificate'} />
      </button>
      {open ? (
        <PreviewDialog
          label={fields.title}
          onClose={close}
          onDownload={() => downloadPreparationDocumentPdf(record.id, draft, volunteerName)}
          onPrint={() => printPreparationDocument(record.id, draft)}
        >
          <DocumentPage {...page} />
        </PreviewDialog>
      ) : null}
    </>
  );
}

type DocumentPageProps = {
  kind: MyInfoDocument['id'];
  title: string;
  nameLabel: string;
  name: string;
  dateLabel: string;
  date: string;
};

function DocumentPage({ kind, title, nameLabel, name, dateLabel, date }: DocumentPageProps) {
  const certificate = kind === 'safeguarding_certificate';
  return (
    <article
      className={`flex flex-col bg-white text-navy ${
        certificate ? 'border-[6px] border-double border-navy px-8 py-8' : 'border border-sand'
      }`}
    >
      {certificate ? (
        <header className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em]">i58</p>
          <p className="mt-4 font-display text-3xl font-extrabold leading-tight">
            {title}
          </p>
          <div className="mx-auto mt-4 h-0.5 w-14 bg-crm-terracotta" />
        </header>
      ) : (
        <header className="bg-navy px-7 py-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-white">i58</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold leading-tight text-white">
            {title}
          </p>
        </header>
      )}
      <div className={certificate ? 'mt-8 text-center' : 'px-7 pt-6'}>
        {certificate ? null : <div className="h-0.5 w-12 bg-crm-terracotta" />}
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/55 ${
            certificate ? '' : 'mt-6'
          }`}
        >
          {certificate ? 'Certificate holder' : nameLabel}
        </p>
        <p className={`mt-1 font-display font-extrabold ${certificate ? 'text-4xl' : 'text-2xl'}`}>
          {name}
        </p>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/55">
          {dateLabel}
        </p>
        <p className="mt-1 text-base font-semibold">{date}</p>
        {certificate ? (
          <div className="mx-auto mt-8 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-crm-terracotta text-[11px] font-bold uppercase tracking-[0.16em] text-crm-terracotta">
            i58
          </div>
        ) : (
          <div className="mt-8 space-y-2.5" aria-hidden>
            <div className="h-px bg-sand" />
            <div className="h-px bg-sand" />
            <div className="h-px w-2/3 bg-sand" />
          </div>
        )}
      </div>
      <p
        className={`mt-8 text-sm font-semibold text-[#1f9d55] ${
          certificate ? 'text-center' : 'px-7 pb-7'
        }`}
      >
        On file with i58
      </p>
    </article>
  );
}
