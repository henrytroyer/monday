import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { VehicleReservation } from '../contract/volunteerApi';
import { calendarTodayIso, shiftCalendarMonth } from '../lib/fieldCalendar';
import {
  FIELD_FEEDBACK_FORM,
  FIELD_SERVICE_WAYS,
  FIELD_TEAM_PHOTOS,
  FIELD_VEHICLE_BOOKING,
  vehicleSeatLabel,
  type FieldServiceWay,
  type FieldServiceWayId,
  type FieldVehicle,
} from '../lib/fieldService';
import {
  VEHICLE_BOOKING_MONTH,
  vehicleCalendarWeeks,
  vehicleChoiceLabel,
  vehicleDateLabel,
  vehicleDayHasOpening,
  vehicleDaySlots,
  vehicleMonthTitle,
} from '../lib/fieldVehicleCalendar';
import {
  buildVehicleReservation,
  reservationMatchesPick,
} from '../lib/fieldVehicleReservation';

const VEHICLE_SWATCH: Record<FieldVehicle['id'], string> = {
  micra: 'bg-[#2f6fad]',
  van: 'bg-[#7eb6d9]',
};

export function FieldServiceWays({
  volunteerId,
  volunteerName,
  reservations,
  onReserve,
}: {
  volunteerId: string;
  volunteerName: string;
  reservations: readonly VehicleReservation[];
  onReserve: (reservation: VehicleReservation) => void;
}) {
  const vehicle = FIELD_SERVICE_WAYS.find((way) => way.id === 'vehicle');
  const others = FIELD_SERVICE_WAYS.filter((way) => way.id !== 'vehicle');
  const [openTool, setOpenTool] = useState<Exclude<FieldServiceWayId, 'vehicle'> | null>(null);
  const closeTool = useCallback(() => setOpenTool(null), []);

  return (
    <section
      aria-label="Field tools"
      className="relative left-1/2 flex w-screen -translate-x-1/2 justify-center bg-[#e5ecf2] px-4 py-8"
    >
      <div className="flex w-full max-w-5xl flex-col items-center gap-4 md:gap-5">
        {vehicle ? (
          <VehicleBookingCard
            title={vehicle.title}
            volunteerId={volunteerId}
            volunteerName={volunteerName}
            reservations={reservations}
            onReserve={onReserve}
          />
        ) : null}
        <ul className="grid w-full items-stretch gap-4 sm:grid-cols-2 md:gap-5">
          {others.map((way) => {
            if (way.id !== 'photos' && way.id !== 'feedback') return null;
            const toolId = way.id;
            return (
              <ServiceWayCard
                key={toolId}
                way={way}
                open={openTool === toolId}
                onOpen={() => setOpenTool(toolId)}
              />
            );
          })}
        </ul>
      </div>
      {openTool === 'photos' ? <TeamPhotosDialog onClose={closeTool} /> : null}
      {openTool === 'feedback' ? <FeedbackDialog onClose={closeTool} /> : null}
    </section>
  );
}

type VehicleTimePick = {
  date: string;
  slotId: string;
};

function bookingKey(vehicleId: string, lengthId: string) {
  return `${vehicleId}:${lengthId}`;
}

function VehicleBookingCard({
  title,
  volunteerId,
  volunteerName,
  reservations,
  onReserve,
}: {
  title: string;
  volunteerId: string;
  volunteerName: string;
  reservations: readonly VehicleReservation[];
  onReserve: (reservation: VehicleReservation) => void;
}) {
  const booking = FIELD_VEHICLE_BOOKING;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, VehicleTimePick>>({});
  const openVehicleId = openKey?.split(':')[0];
  const openLengthId = openKey?.split(':')[1];
  const chosenVehicle = booking.vehicles.find((vehicle) => vehicle.id === openVehicleId);
  const chosenLength = booking.lengths.find((length) => length.id === openLengthId);

  const closeDialog = useCallback(() => setOpenKey(null), []);

  function selectLength(vehicleId: string, lengthId: string) {
    const key = bookingKey(vehicleId, lengthId);
    setOpenKey((current) => (current === key ? null : key));
  }

  return (
    <article className="w-full rounded-2xl bg-white px-5 py-5 shadow-[0_10px_28px_rgba(27,54,93,0.06)] md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="min-w-0 font-display text-xl font-bold leading-tight text-navy">{title}</h2>
        <a
          href={booking.phoneHref}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-crm-terracotta px-5 text-sm font-semibold text-white shadow-sm hover:brightness-95"
        >
          <PhoneIcon />
          {booking.phoneDisplay}
        </a>
      </div>

      <ul className="mt-5 grid gap-4 md:grid-cols-2">
        {booking.vehicles.map((vehicle) => (
          <li key={vehicle.id} className="rounded-2xl bg-[#f7f4ef] p-4 ring-1 ring-navy/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold leading-tight text-navy">{vehicle.name}</h3>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${VEHICLE_SWATCH[vehicle.id]}`}
                      aria-hidden
                    />
                    {vehicle.color}
                  </span>
                  <span className="text-navy/35" aria-hidden>
                    ·
                  </span>
                  <span className="font-semibold tracking-wide">{vehicle.plate}</span>
                </p>
              </div>
              <p className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-semibold text-navy ring-1 ring-navy/10">
                {vehicleSeatLabel(vehicle.people)}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label={`${vehicle.name} length`}>
              {booking.lengths.map((length) => {
                const key = bookingKey(vehicle.id, length.id);
                const selected = openKey === key;
                const pick = picks[key];
                const slot = pick
                  ? vehicleDaySlots(vehicle.id, length.id, pick.date).find(
                      (item) => item.id === pick.slotId,
                    )
                  : null;
                return (
                  <button
                    key={length.id}
                    type="button"
                    aria-expanded={selected}
                    aria-haspopup="dialog"
                    onClick={() => selectLength(vehicle.id, length.id)}
                    className={`flex h-full min-h-11 flex-col items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold ${
                      selected
                        ? 'bg-navy text-white'
                        : 'bg-white text-navy ring-1 ring-navy/10 hover:ring-navy/30'
                    }`}
                  >
                    <span className="block">{length.label}</span>
                    {slot && pick ? (
                      <span className={`mt-0.5 block text-[11px] font-medium ${selected ? 'text-white/85' : 'text-navy/70'}`}>
                        {vehicleChoiceLabel(pick.date, slot.startLabel)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {openKey && chosenVehicle && chosenLength ? (
        <VehicleBookingDialog
          vehicleId={chosenVehicle.id}
          vehicleName={chosenVehicle.name}
          lengthId={chosenLength.id}
          lengthLabel={chosenLength.label}
          pick={picks[openKey] ?? null}
          volunteerId={volunteerId}
          volunteerName={volunteerName}
          reservations={reservations}
          onChoose={(pick) => setPicks((current) => ({ ...current, [openKey]: pick }))}
          onReserve={onReserve}
          onClose={closeDialog}
        />
      ) : null}
    </article>
  );
}

function VehicleBookingDialog({
  vehicleId,
  vehicleName,
  lengthId,
  lengthLabel,
  pick,
  volunteerId,
  volunteerName,
  reservations,
  onChoose,
  onReserve,
  onClose,
}: {
  vehicleId: string;
  vehicleName: string;
  lengthId: string;
  lengthLabel: string;
  pick: VehicleTimePick | null;
  volunteerId: string;
  volunteerName: string;
  reservations: readonly VehicleReservation[];
  onChoose: (pick: VehicleTimePick) => void;
  onReserve: (reservation: VehicleReservation) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [cursor, setCursor] = useState<{ year: number; month: number }>(VEHICLE_BOOKING_MONTH);
  const [date, setDate] = useState<string | null>(pick?.date ?? null);
  const [slotId, setSlotId] = useState<string | null>(pick?.slotId ?? null);
  const weeks = vehicleCalendarWeeks(cursor.year, cursor.month);
  const title = vehicleMonthTitle(cursor.year, cursor.month);
  const today = calendarTodayIso();
  const slots = date ? vehicleDaySlots(vehicleId, lengthId, date) : null;
  const chosenSlot = slots?.find((slot) => slot.id === slotId && slot.available) ?? null;
  const reserved =
    chosenSlot != null &&
    date != null &&
    reservations.some((reservation) =>
      reservationMatchesPick(reservation, {
        volunteerId,
        vehicleId,
        lengthId,
        date,
        slotId: chosenSlot.id,
      }),
    );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  function move(delta: number) {
    setCursor((current) => shiftCalendarMonth(current.year, current.month, delta));
  }

  function selectDate(next: string) {
    setDate(next);
    setSlotId(pick?.date === next ? pick.slotId : null);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/45 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-full w-full max-w-4xl overflow-y-auto rounded-3xl bg-[#e8eef3] px-5 py-5 shadow-lg sm:px-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="pr-16 text-center font-display text-2xl font-semibold text-navy">
          {vehicleName} · {lengthLabel}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full px-2 py-1 text-sm font-semibold text-navy hover:bg-white"
        >
          Close
        </button>
        <p className="mt-1 text-center text-sm text-navy/70">Choose a day, then a time.</p>
        <div className="mt-5 grid items-start gap-5 md:grid-cols-[17.5rem_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[17.5rem] md:mx-0">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => move(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-navy hover:bg-white"
            >
              <MonthChevron direction="previous" />
            </button>
            <p className="font-display text-base font-semibold text-navy">{title}</p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => move(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-navy hover:bg-white"
            >
              <MonthChevron direction="next" />
            </button>
          </div>
          <div role="grid" aria-label={title} className="mt-2 grid grid-cols-7 gap-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((weekday) => (
              <div
                key={weekday}
                role="columnheader"
                className="py-1 text-[11px] font-semibold tracking-wide text-navy/50"
              >
                {weekday}
              </div>
            ))}
            {weeks.flat().map((cell, index) => {
              if (!cell.date || cell.day === null) {
                return <span key={`blank-${index}`} role="gridcell" />;
              }
              const dayDate = cell.date;
              const past = dayDate < today;
              const open = !past && vehicleDayHasOpening(vehicleId, lengthId, dayDate);
              const selected = dayDate === date;
              return (
                <button
                  key={dayDate}
                  type="button"
                  role="gridcell"
                  disabled={past}
                  aria-pressed={selected}
                  aria-label={vehicleDateLabel(dayDate)}
                  onClick={() => selectDate(dayDate)}
                  className={`relative flex h-10 items-center justify-center rounded-full text-sm ${
                    selected
                      ? 'bg-navy font-semibold text-white'
                      : past
                        ? 'text-navy/30'
                        : 'text-navy hover:bg-white'
                  }`}
                >
                  {cell.day}
                  <span
                    className={`absolute bottom-1 h-1 w-1 rounded-full ${
                      open ? (selected ? 'bg-white' : 'bg-crm-terracotta') : 'bg-transparent'
                    }`}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-navy/60">A dot marks a day with an open time.</p>
        </div>
        <div aria-live="polite">
          {slots && date ? (
            <DayTimetable
              date={date}
              slots={slots}
              slotId={slotId}
              onSelect={(nextSlotId) => {
                setSlotId(nextSlotId);
                onChoose({ date, slotId: nextSlotId });
              }}
            />
          ) : (
            <p className="rounded-xl bg-white px-4 py-6 text-sm text-navy/70 ring-1 ring-navy/10">
              Select a day to see the hours.
            </p>
          )}
          {chosenSlot && date ? (
            <div className="mt-4">
              <button
                type="button"
                disabled={reserved}
                onClick={() =>
                  onReserve(
                    buildVehicleReservation({
                      volunteerId,
                      volunteerName,
                      vehicleId,
                      lengthId,
                      date,
                      slotId: chosenSlot.id,
                      startLabel: chosenSlot.startLabel,
                      endLabel: chosenSlot.endLabel,
                    }),
                  )
                }
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-crm-terracotta px-5 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:cursor-default disabled:bg-navy disabled:hover:brightness-100"
              >
                {reserved ? 'Reserved' : 'Reserve vehicle'}
              </button>
              {reserved ? (
                <p className="mt-2 text-center text-sm text-navy/75">
                  Reserved for {volunteerName}.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}

function DayTimetable({
  date,
  slots,
  slotId,
  onSelect,
}: {
  date: string;
  slots: ReturnType<typeof vehicleDaySlots>;
  slotId: string | null;
  onSelect: (slotId: string) => void;
}) {
  return (
    <div>
      <h3 className="font-display text-base font-bold text-navy">{vehicleDateLabel(date)}</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {slots.map((slot) => {
          const chosen = slot.id === slotId;
          return (
            <li key={slot.id}>
              <button
                type="button"
                disabled={!slot.available}
                aria-pressed={slot.available ? chosen : undefined}
                onClick={() => onSelect(slot.id)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                  chosen
                    ? 'bg-navy font-semibold text-white'
                    : slot.available
                      ? 'bg-white text-navy ring-1 ring-navy/10 hover:ring-navy/30'
                      : 'cursor-not-allowed bg-white/55 text-navy/40'
                }`}
              >
                <span className="font-semibold">
                  {slot.startLabel}
                  <span className="font-medium"> – {slot.endLabel}</span>
                </span>
                <span className={chosen ? 'text-white' : slot.available ? 'font-semibold text-crm-terracotta' : ''}>
                  {chosen ? 'Chosen' : slot.available ? 'Open' : 'Booked'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MonthChevron({ direction }: { direction: 'previous' | 'next' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === 'previous' ? 'M15 6 9 12l6 6' : 'M9 6l6 6-6 6'}
      />
    </svg>
  );
}

function ServiceWayCard({
  way,
  open,
  onOpen,
}: {
  way: FieldServiceWay;
  open: boolean;
  onOpen: () => void;
}) {
  return (
    <li className="h-full">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onOpen}
        className="flex h-full w-full items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 text-left shadow-[0_10px_28px_rgba(27,54,93,0.06)] ring-navy/10 hover:ring-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <span className="min-w-0">
          <span className="block font-display text-xl font-bold leading-tight text-navy">{way.title}</span>
          {way.body ? (
            <span className="mt-1.5 block text-sm font-medium leading-5 text-navy/75">{way.body}</span>
          ) : null}
        </span>
        {way.id === 'photos' ? <PhotoCollage /> : <FeedbackFileMiniature />}
      </button>
    </li>
  );
}

const TEAM_PHOTO_COLLAGE = [
  { src: '/brand/volunteer.jpg', className: 'left-0 top-4 -rotate-6' },
  { src: '/brand/field-home-coast.jpg', className: 'left-8 top-0 rotate-3' },
  { src: '/brand/greece.jpg', className: 'bottom-0 left-4 rotate-2' },
] as const;

function PhotoCollage() {
  return (
    <span aria-hidden className="relative h-24 w-28 shrink-0">
      {TEAM_PHOTO_COLLAGE.map((photo) => (
        <img
          key={photo.src}
          src={photo.src}
          alt=""
          className={`absolute h-14 w-[4.25rem] rounded-sm object-cover shadow-md ring-2 ring-white ${photo.className}`}
        />
      ))}
    </span>
  );
}

function FeedbackFileMiniature() {
  return (
    <span aria-hidden className="flex w-[6.75rem] shrink-0 flex-col gap-1 rounded-md bg-[#f8e4df] p-1.5">
      <span className="overflow-hidden rounded bg-white shadow-sm">
        <span className="block h-1 bg-crm-terracotta" />
        <span className="block px-1.5 pb-1 pt-1 font-display text-[8px] font-bold leading-none text-[#202124]">
          i58 Feedback Form
        </span>
        <span className="mx-1.5 mb-1 block h-px bg-[#202124]/25" />
        <span className="mx-1.5 mb-1 block h-px w-8 bg-[#202124]/20" />
      </span>
      <span className="rounded bg-white px-1.5 py-1 shadow-sm">
        <span className="block h-px bg-[#202124]/30" />
        <span className="mt-1 block h-px w-8 bg-[#202124]/20" />
      </span>
      <span className="rounded bg-white px-1.5 py-1 shadow-sm">
        <span className="block h-px bg-[#202124]/30" />
        <span className="mt-1 block h-px w-6 bg-[#202124]/20" />
      </span>
      <span className="mt-0.5 block h-2.5 w-8 rounded-sm bg-crm-terracotta" />
    </span>
  );
}

function ToolDialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/45 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative max-h-full w-full overflow-y-auto rounded-3xl bg-[#e8eef3] px-5 py-5 shadow-lg sm:px-8 ${
          wide ? 'max-w-5xl' : 'max-w-xl'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="pr-16 text-center font-display text-2xl font-semibold text-navy">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full px-2 py-1 text-sm font-semibold text-navy hover:bg-white"
        >
          Close
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

const PHOTO_TILES = [
  { id: 'dinner', label: 'Team dinner', className: 'sm:col-span-2 bg-[#c4784a]' },
  { id: 'candles', label: 'Candlelight', className: 'bg-[#8d4e32]' },
  { id: 'gathering', label: 'Gathering', className: 'bg-[#d7a15a]' },
  { id: 'meal', label: 'Team meal', className: 'sm:col-span-2 bg-[#a85b3c]' },
  { id: 'table', label: 'Long table', className: 'sm:col-span-2 bg-[#6e4634]' },
  { id: 'center', label: 'Centerpiece', className: 'sm:col-span-2 bg-[#c45a3a]' },
  { id: 'talk', label: 'Conversation', className: 'sm:col-span-2 bg-[#3f4d62]' },
] as const;

function TeamPhotosDialog({ onClose }: { onClose: () => void }) {
  return (
    <ToolDialog title={FIELD_TEAM_PHOTOS.title} onClose={onClose} wide>
      <p className="mt-1 text-center text-sm text-navy/70">{FIELD_TEAM_PHOTOS.range}</p>
      <p className="mt-3 flex justify-center">
        <span className="rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">Shared</span>
      </p>
      <p className="mt-3 text-center text-sm text-navy/70">
        Placeholder album. The shared camp photos will open here.
      </p>
      <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-6">
        {PHOTO_TILES.map((tile) => (
          <li
            key={tile.id}
            className={`flex aspect-[4/3] items-end rounded-xl p-3 text-white ${tile.className}`}
          >
            <span className="text-sm font-semibold">{tile.label}</span>
          </li>
        ))}
      </ul>
    </ToolDialog>
  );
}

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const form = FIELD_FEEDBACK_FORM;
  const [answers, setAnswers] = useState<string[]>(() => form.questions.map(() => ''));
  const [sent, setSent] = useState(false);

  return (
    <ToolDialog title={form.title} onClose={onClose}>
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="h-2 bg-crm-terracotta" />
        <div className="px-5 py-5">
          <ul className="space-y-2 text-sm leading-6 text-navy">
            {form.intro.map((line) => (
              <li key={line}>-{line}</li>
            ))}
          </ul>
        </div>
      </div>
      {sent ? (
        <p className="mt-4 rounded-2xl bg-white px-5 py-5 text-sm leading-6 text-navy shadow-sm">
          Thanks. This preview kept your note on this page. A reload clears it.
        </p>
      ) : (
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
          }}
        >
          {form.questions.map((question, index) => (
            <label key={question} className="block rounded-2xl bg-white px-5 py-5 shadow-sm">
              <span className="text-sm font-medium leading-6 text-navy">{question}</span>
              <textarea
                value={answers[index] ?? ''}
                onChange={(event) =>
                  setAnswers((current) =>
                    current.map((answer, answerIndex) =>
                      answerIndex === index ? event.target.value : answer,
                    ),
                  )
                }
                rows={2}
                placeholder="Your answer"
                className="mt-4 w-full resize-y border-0 border-b border-navy/25 bg-transparent px-0 py-1 text-sm text-navy outline-none placeholder:text-navy/40 focus:border-navy"
              />
            </label>
          ))}
          <div className="flex items-center justify-between gap-3">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-crm-terracotta px-5 text-sm font-semibold text-white hover:brightness-95"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => setAnswers(form.questions.map(() => ''))}
              className="text-sm font-semibold text-crm-terracotta hover:underline"
            >
              Clear form
            </button>
          </div>
          <p className="text-xs text-navy/60">Preview only. A reload clears it.</p>
        </form>
      )}
    </ToolDialog>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

