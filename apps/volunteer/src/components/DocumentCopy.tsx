import { useCallback, useState } from 'react';
import type { MyInfoDocument } from '../lib/myInfo';
import { DOCUMENT_FIELDS } from '../lib/preparationDocuments';
import {
  downloadPreparationDocumentPdf,
  printPreparationDocument,
} from '../lib/preparationDocumentPdf';
import { PREVIEW_THUMB_CLASS, PreviewDialog } from './PreviewDialog';

const THUMB_WIDTH = 88;
const THUMB_HEIGHT = 112;

export function DocumentCopy({ document: record }: { document: MyInfoDocument }) {
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
        className={PREVIEW_THUMB_CLASS}
        style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
      >
        <DocumentMiniature kind={page.kind} name={page.name} date={page.date} />
      </button>
      {open ? (
        <PreviewDialog
          label={fields.title}
          onClose={close}
          onDownload={() => downloadPreparationDocumentPdf(record.id, draft)}
          onPrint={() => printPreparationDocument(record.id, draft)}
        >
          <DocumentPage {...page} />
        </PreviewDialog>
      ) : null}
    </>
  );
}

function DocumentMiniature({
  kind,
  name,
  date,
}: {
  kind: MyInfoDocument['id'];
  name: string;
  date: string;
}) {
  if (kind === 'safeguarding_certificate') {
    return (
      <span aria-hidden className="flex h-full flex-col items-center border-[3px] border-double border-navy px-1 py-1.5 text-center">
        <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-navy">i58</span>
        <span className="mt-1 line-clamp-3 font-display text-[9px] font-extrabold leading-tight text-navy">
          {name}
        </span>
        <span className="mt-1 text-[7px] font-semibold text-navy/70">{date}</span>
        <span className="mt-auto mb-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-crm-terracotta text-[6px] font-bold uppercase tracking-wider text-crm-terracotta">
          i58
        </span>
      </span>
    );
  }
  return (
    <span aria-hidden className="flex h-full flex-col text-left">
      <span className="bg-navy px-1.5 py-1.5 text-white">
        <span className="block text-[7px] font-bold uppercase tracking-[0.14em]">i58</span>
        <span className="mt-0.5 block font-display text-[8px] font-extrabold leading-tight">
          Background check
        </span>
      </span>
      <span className="px-1.5 pt-1.5 font-display text-[9px] font-extrabold leading-tight text-navy">
        {name}
      </span>
      <span className="px-1.5 text-[7px] font-semibold text-navy/70">{date}</span>
      <span className="mx-1.5 mt-1.5 h-px bg-sand" aria-hidden />
      <span className="mx-1.5 mt-1 h-px bg-sand" aria-hidden />
      <span className="mx-1.5 mt-1 h-px w-8 bg-sand" aria-hidden />
    </span>
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
