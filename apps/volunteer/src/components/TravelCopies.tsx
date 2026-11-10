import { useCallback, useState } from 'react';
import type { MyInfoFlights } from '../lib/myInfo';
import {
  downloadItinerary,
  downloadPassportImage,
  itineraryDirections,
  printItinerary,
  printPassport,
} from '../lib/recordCopy';
import { PREVIEW_THUMB_CLASS, PreviewDialog } from './PreviewDialog';

const PASSPORT_THUMB_WIDTH = 168;
const ITINERARY_THUMB = { width: 88, height: 112 };

export function PassportImage({
  src,
  number,
  expiration,
}: {
  src: string;
  number: string;
  expiration: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View passport"
        aria-haspopup="dialog"
        className="shrink-0 rounded-2xl bg-gradient-to-b from-white to-sand p-1.5 shadow-[0_10px_22px_rgba(27,54,93,0.16)] ring-1 ring-navy/20 transition hover:ring-crm-terracotta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        style={{ width: PASSPORT_THUMB_WIDTH }}
      >
        <span className="block overflow-hidden rounded-xl bg-navy ring-1 ring-white">
          <img
            src={src}
            alt=""
            className="h-[104px] w-full object-cover object-center contrast-110 saturate-125"
          />
        </span>
      </button>
      {open ? (
        <PreviewDialog
          label="Passport"
          wide
          onClose={close}
          onDownload={() => downloadPassportImage(src)}
          onPrint={() => printPassport(src, number, expiration)}
        >
          <img src={src} alt="Passport" className="w-full rounded-sm bg-white" />
        </PreviewDialog>
      ) : null}
    </>
  );
}

export function ItineraryImage({ flights }: { flights: MyInfoFlights }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const routes = itineraryDirections(flights);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View itinerary"
        aria-haspopup="dialog"
        className={PREVIEW_THUMB_CLASS}
        style={ITINERARY_THUMB}
      >
        <ItineraryMiniature flights={flights} />
      </button>
      {open ? (
        <PreviewDialog
          label="Itinerary"
          onClose={close}
          onDownload={() => downloadItinerary(flights)}
          onPrint={() => printItinerary(flights)}
        >
          <article className="bg-white px-5 py-5 text-navy">
            <p className="text-xs font-bold uppercase tracking-[0.28em]">i58</p>
            <p className="mt-2 font-display text-2xl font-extrabold">Itinerary</p>
            <div className="mt-3 h-0.5 w-12 bg-crm-terracotta" />
            <p className="mt-4 font-display text-lg font-extrabold">{flights.passenger}</p>
            <p className="text-sm tracking-wide">Record locator {flights.recordLocator}</p>
            {routes.map((direction) => (
              <section key={direction.title} className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/55">
                  {direction.title}
                </p>
                <ul className="mt-2 space-y-3">
                  {direction.legs.map((leg) => (
                    <li key={`${leg.flight}-${leg.date}`}>
                      <p className="text-sm font-semibold">
                        {leg.airline} {leg.flight}
                      </p>
                      <p className="text-sm text-navy/75">{leg.date}</p>
                      <p className="text-sm">
                        {leg.fromCity} ({leg.fromCode}) {leg.departs}
                        <span className="text-navy/45"> to </span>
                        {leg.toCity} ({leg.toCode}) {leg.arrives}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </article>
        </PreviewDialog>
      ) : null}
    </>
  );
}

function ItineraryMiniature({ flights }: { flights: MyInfoFlights }) {
  const routes = itineraryDirections(flights);
  return (
    <span aria-hidden className="flex h-full flex-col text-left text-navy">
      <span className="bg-navy px-1.5 py-1.5 text-white">
        <span className="block text-[7px] font-bold uppercase tracking-[0.14em]">i58</span>
        <span className="mt-0.5 block font-display text-[8px] font-extrabold leading-tight">
          Itinerary
        </span>
      </span>
      <span className="flex flex-col gap-1 px-1.5 pt-1.5">
        {routes.map((direction) => {
          const first = direction.legs[0];
          const last = direction.legs.at(-1);
          if (!first || !last) return null;
          return (
            <span key={direction.title} className="block leading-tight">
              <span className="block text-[8px] font-extrabold">
                {first.fromCode} – {last.toCode}
              </span>
              <span className="block text-[7px] text-navy/70">
                {last.airline} {last.flight}
              </span>
            </span>
          );
        })}
      </span>
      <span className="mt-auto px-1.5 pb-1.5 text-[7px] font-semibold tracking-wide">
        {flights.recordLocator}
      </span>
    </span>
  );
}
