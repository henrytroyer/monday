import { useState } from 'react';
import { I58_MARK } from '../lib/nav';
import {
  CALENDAR_WEEKDAYS,
  FIELD_CALENDAR_TITLE,
  PREVIEW_FIELD_CALENDAR_EVENTS,
  PREVIEW_FIELD_CALENDAR_MONTH,
  buildCalendarMonth,
  calendarMonthTitle,
  calendarTodayIso,
  shiftCalendarMonth,
  type CalendarDayItem,
  type FieldCalendarTone,
} from '../lib/fieldCalendar';

const TONE_CLASS: Record<Exclude<FieldCalendarTone, 'span'>, string> = {
  navy: 'text-navy',
  teal: 'text-[#5883a6]',
  terracotta: 'text-crm-terracotta',
};

export function FieldCalendar() {
  const [cursor, setCursor] = useState<{ year: number; month: number }>(
    PREVIEW_FIELD_CALENDAR_MONTH,
  );
  const weeks = buildCalendarMonth(cursor.year, cursor.month, PREVIEW_FIELD_CALENDAR_EVENTS);
  const title = calendarMonthTitle(cursor.year, cursor.month);
  const today = calendarTodayIso();

  function move(delta: number) {
    setCursor((current) => shiftCalendarMonth(current.year, current.month, delta));
  }

  return (
    <section aria-labelledby="field-calendar-title" className="mx-auto w-full pb-4">
      <h2 id="field-calendar-title" className="font-display text-2xl font-semibold text-navy">
        {FIELD_CALENDAR_TITLE}
      </h2>
      <div className="mt-3 w-full overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-sand">
        <div className="min-w-[36rem] px-2 py-2 sm:px-3">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <img src={I58_MARK} alt="" className="h-8 w-auto" />
            <div className="flex items-center justify-center gap-1">
              <MonthButton label="Previous month" onClick={() => move(-1)} direction="previous" />
              <h3 className="font-display text-lg font-semibold tracking-[0.14em] text-navy sm:text-xl">
                {title}
              </h3>
              <MonthButton label="Next month" onClick={() => move(1)} direction="next" />
            </div>
            <span className="h-8 w-8" aria-hidden />
          </div>

          <div
            role="grid"
            aria-label={title}
            className="mt-2 grid grid-cols-7 border border-navy"
          >
            {CALENDAR_WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                role="columnheader"
                className="border border-navy bg-navy px-0.5 py-1 text-center text-[9px] font-semibold tracking-[0.08em] text-white sm:text-[10px]"
              >
                {weekday.toUpperCase()}
              </div>
            ))}
            {weeks.flat().map((cell, index) => {
              const isToday = cell.date === today;
              return (
                <div
                  key={cell.date ?? `blank-${index}`}
                  role="gridcell"
                  aria-current={isToday ? 'date' : undefined}
                  className={`min-h-16 border border-navy/80 p-1 ${
                    isToday ? 'bg-[#1f9d55]/20' : 'bg-white'
                  }`}
                >
                  {cell.day ? (
                    <>
                      <p className="text-xs text-navy">{cell.day}</p>
                      <div className="mt-0.5 flex flex-col gap-0.5">
                        {cell.items.map((item) => (
                          <CalendarItem key={item.id} item={item} />
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarItem({ item }: { item: CalendarDayItem }) {
  if (item.tone === 'span') {
    return (
      <p className="-mx-1 h-4 truncate bg-[#eccec1] px-1 text-[10px] leading-4 text-crm-terracotta">
        {item.continues ? '' : item.title}
      </p>
    );
  }
  return <p className={`text-[10px] leading-tight ${TONE_CLASS[item.tone]}`}>{item.title}</p>;
}

function MonthButton({
  label,
  onClick,
  direction,
}: {
  label: string;
  onClick: () => void;
  direction: 'previous' | 'next';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-navy hover:bg-sand/50"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path
          d={direction === 'previous' ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
