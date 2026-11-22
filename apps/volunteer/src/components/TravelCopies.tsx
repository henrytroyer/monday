import { useCallback, useState } from 'react';
import type { MyInfoFlights } from '../lib/myInfo';
import {
  downloadItinerary,
  downloadPassportImage,
  printItinerary,
  printPassport,
} from '../lib/recordCopy';
import { itineraryBannerSrc, itinerarySheetLeg } from '../lib/flightItinerary';
import { ItineraryForm } from './ItineraryForm';
import { PREVIEW_THUMB_CLASS, PreviewDialog } from './PreviewDialog';

const PASSPORT_THUMB_WIDTH = 168;
const ITINERARY_THUMB = { width: 88, height: 112 };

export function ItineraryBanner({ place, compact = false }: { place: string; compact?: boolean }) {
  return (
    <span
      className={`relative block overflow-hidden ${
        compact ? 'h-full w-full' : 'h-48 w-full rounded-2xl sm:h-60'
      }`}
    >
      <img
        src={itineraryBannerSrc(place)}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${
          /germany/i.test(place) ? 'object-[center_42%]' : 'object-[center_12%]'
        }`}
      />
      <span className="absolute inset-0 bg-black/20" aria-hidden />
      <span className="relative flex h-full flex-col items-center justify-center px-2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
        <span
          className={`font-script leading-none ${
            compact ? '-mb-1 text-[15px]' : '-mb-3 text-5xl sm:-mb-5 sm:text-6xl'
          }`}
        >
          Travel
        </span>
        <span
          className={
            compact
              ? 'text-[7px] font-light tracking-[0.12em]'
              : 'text-2xl font-light tracking-[0.22em] sm:text-5xl'
          }
        >
          ITINERARY
        </span>
      </span>
    </span>
  );
}

export function PassportImage({
  src,
  number,
  expiration,
  volunteerName = 'Volunteer',
}: {
  src: string;
  number: string;
  expiration: string;
  volunteerName?: string;
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
          onDownload={() => downloadPassportImage(src, volunteerName)}
          onPrint={() => printPassport(src, number, expiration)}
        >
          <img src={src} alt="Passport" className="w-full rounded-sm bg-white" />
        </PreviewDialog>
      ) : null}
    </>
  );
}

export function ItineraryImage({ flights, place }: { flights: MyInfoFlights; place: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View itinerary"
        aria-haspopup="dialog"
        className={`${PREVIEW_THUMB_CLASS} rounded-lg`}
        style={ITINERARY_THUMB}
      >
        <ItineraryBanner place={place} compact />
      </button>
      {open ? (
        <PreviewDialog
          label="Itinerary"
          wide
          onClose={close}
          onDownload={() => downloadItinerary(flights)}
          onPrint={() => printItinerary(flights)}
        >
          <article className="overflow-hidden rounded-2xl bg-white text-navy">
            <ItineraryBanner place={place} />
            <ItineraryForm
              recordLocator={flights.recordLocator}
              legs={flights.legs.map((leg) => itinerarySheetLeg(leg))}
            />
          </article>
        </PreviewDialog>
      ) : null}
    </>
  );
}
