import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { FieldCalendar } from './FieldCalendar';
import { CAMP_SCHEDULE_ROWS, CLEANING_AREAS } from '../lib/fieldSchedules';

type ScheduleId = 'camp' | 'birthdays' | 'cleaning';

const SCHEDULES: { id: ScheduleId; label: string }[] = [
  { id: 'camp', label: 'Camp Schedule' },
  { id: 'birthdays', label: 'i58 Birthdays & Events' },
  { id: 'cleaning', label: 'Cleaning Schedule' },
];

export function FieldScheduleBar() {
  const [open, setOpen] = useState<ScheduleId | null>(null);

  function toggle(id: ScheduleId) {
    setOpen((current) => (current === id ? null : id));
  }

  return (
    <>
      <div className="grid grid-cols-3 rounded-2xl bg-white/95 text-center shadow-lg ring-1 ring-white/60 backdrop-blur">
        {SCHEDULES.map((schedule, index) => (
          <div
            key={schedule.id}
            className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5"
          >
            <div className="flex items-center justify-center gap-4">
              <p className="text-center text-lg font-semibold leading-tight text-navy">
                {schedule.label}
              </p>
              <button
                type="button"
                aria-label={schedule.label}
                aria-expanded={open === schedule.id}
                onClick={() => toggle(schedule.id)}
                className="shrink-0 rounded-full"
              >
                <ScheduleMark id={schedule.id} />
              </button>
            </div>
            {index < SCHEDULES.length - 1 ? (
              <span
                className="absolute top-1/2 right-0 h-8 w-0.5 -translate-y-1/2 bg-navy/60"
                aria-hidden
              />
            ) : null}
          </div>
        ))}
      </div>
      {open ? <ScheduleDialog id={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function ScheduleDialog({ id, onClose }: { id: ScheduleId; onClose: () => void }) {
  const titleId = useId();
  const wide = id === 'birthdays';

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/45 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id === 'birthdays' ? 'field-calendar-title' : titleId}
        className={`relative max-h-full w-full overflow-y-auto rounded-3xl bg-[#e8eef3] px-4 py-5 shadow-lg sm:px-8 ${
          wide ? 'max-w-5xl' : 'max-w-3xl'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full px-2 py-1 text-sm font-semibold text-navy hover:bg-white"
        >
          Close
        </button>
        {id === 'birthdays' ? <FieldCalendar /> : null}
        {id === 'camp' ? (
          <>
            <h2 id={titleId} className="pr-16 text-center font-display text-2xl font-semibold text-navy">
              Camp Schedule
            </h2>
            <div className="mt-5 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-white/70">
              <table className="w-full min-w-[32rem] text-left text-sm text-navy">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="px-3 py-2 font-semibold">Day</th>
                    <th className="px-3 py-2 font-semibold">Time</th>
                    <th className="px-3 py-2 font-semibold">Activity</th>
                    <th className="px-3 py-2 font-semibold">Place</th>
                  </tr>
                </thead>
                <tbody>
                  {CAMP_SCHEDULE_ROWS.map((row) => (
                    <tr key={row.id} className="border-t border-navy/15">
                      <td className="px-3 py-2 font-semibold">{row.day}</td>
                      <td className="px-3 py-2">{row.time}</td>
                      <td className="px-3 py-2">{row.activity}</td>
                      <td className="px-3 py-2">{row.place}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        {id === 'cleaning' ? (
          <>
            <h2 id={titleId} className="pr-16 text-center font-display text-2xl font-semibold text-navy">
              Cleaning Schedule
            </h2>
            <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-white/70">
              <table className="w-full text-left text-sm text-navy">
                <tbody>
                  {CLEANING_AREAS.map((area) => (
                    <AreaRows key={area.id} title={area.title} rows={area.rows} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function AreaRows({
  title,
  rows,
}: {
  title: string;
  rows: readonly { id: string; name: string; detail: string; timing?: string }[];
}) {
  return (
    <>
      <tr>
        <th colSpan={2} className="bg-[#8ecfc6] px-3 py-2 text-center font-display text-base font-semibold text-navy">
          {title}
        </th>
      </tr>
      {rows.map((row) => (
        <tr key={row.id} className="border-t border-navy/10">
          <td className="w-36 px-3 py-3 align-top font-semibold sm:w-44">{row.name}</td>
          <td className="px-3 py-3">
            {row.detail}
            {row.timing ? <span className="text-crm-terracotta"> | {row.timing}</span> : null}
          </td>
        </tr>
      ))}
    </>
  );
}

const SCHEDULE_MARKS: Record<ScheduleId, string> = {
  camp: '/brand/camp-schedule.png?v=edge',
  birthdays: '/brand/birthdays-events.png?v=edge',
  cleaning: '/brand/cleaning-schedule.png?v=original',
};

function ScheduleMark({ id }: { id: ScheduleId }) {
  return (
    <img
      src={SCHEDULE_MARKS[id]}
      alt=""
      className="h-16 w-16 rounded-full object-cover shadow-[0_6px_16px_rgba(15,30,55,0.35)]"
    />
  );
}
