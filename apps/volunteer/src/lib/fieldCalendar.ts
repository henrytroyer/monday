/**
 * Field-home calendar. The events below are preview copy until a backend
 * supplies birthdays and special events.
 */

export const FIELD_CALENDAR_TITLE = 'i58 Birthdays & Special Events';

export const CALENDAR_WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type FieldCalendarTone = 'navy' | 'teal' | 'terracotta' | 'span';

export type FieldCalendarEvent = {
  id: string;
  title: string;
  /** Inclusive start, YYYY-MM-DD. */
  start: string;
  /** Inclusive end, YYYY-MM-DD. A single day omits this. */
  end?: string;
  tone: FieldCalendarTone;
};

/** The month shown until a volunteer opens another one. */
export const PREVIEW_FIELD_CALENDAR_MONTH = { year: 2026, month: 10 } as const;

export const PREVIEW_FIELD_CALENDAR_EVENTS: readonly FieldCalendarEvent[] = [
  { id: 'sports-1', title: 'Sports Night', start: '2026-10-01', tone: 'navy' },
  { id: 'bday-preston', title: "Preston's Birthday", start: '2026-10-01', tone: 'teal' },
  {
    id: 'retreat',
    title: 'Staff Retreat -->',
    start: '2026-10-02',
    end: '2026-10-06',
    tone: 'span',
  },
  { id: 'bday-theo', title: "Theo's Birthday", start: '2026-10-03', tone: 'teal' },
  { id: 'sports-8', title: 'Sports Night', start: '2026-10-08', tone: 'navy' },
  { id: 'bday-missy', title: "Missy's Birthday", start: '2026-10-08', tone: 'teal' },
  { id: 'bday-teresa', title: "Teresa's Birthday", start: '2026-10-08', tone: 'teal' },
  { id: 'long-10', title: 'Long-term Night', start: '2026-10-10', tone: 'navy' },
  { id: 'solo-12', title: 'Solo Night', start: '2026-10-12', tone: 'navy' },
  { id: 'bday-joy', title: "Joy's Birthday", start: '2026-10-12', tone: 'teal' },
  { id: 'debrief-13', title: 'Team Debrief', start: '2026-10-13', tone: 'terracotta' },
  { id: 'worship-13', title: 'Worship Night', start: '2026-10-13', tone: 'teal' },
  { id: 'sports-15', title: 'Sports Night', start: '2026-10-15', tone: 'navy' },
  { id: 'bday-laya', title: "Laya's Birthday", start: '2026-10-15', tone: 'teal' },
  { id: 'debrief-19', title: 'Team Debrief', start: '2026-10-19', tone: 'terracotta' },
  { id: 'solo-19', title: 'Solo Night', start: '2026-10-19', tone: 'navy' },
  { id: 'worship-20', title: 'Worship Night', start: '2026-10-20', tone: 'teal' },
  { id: 'bday-elias', title: "Elias' Birthday", start: '2026-10-20', tone: 'teal' },
  { id: 'sports-22', title: 'Sports Night', start: '2026-10-22', tone: 'navy' },
  { id: 'long-24', title: 'Long-term Night', start: '2026-10-24', tone: 'navy' },
  { id: 'bday-jason', title: "Jason's Birthday", start: '2026-10-25', tone: 'teal' },
  { id: 'solo-26', title: 'Solo Night', start: '2026-10-26', tone: 'navy' },
  { id: 'debrief-27', title: 'Team Debrief', start: '2026-10-27', tone: 'terracotta' },
  { id: 'worship-27', title: 'Worship Night', start: '2026-10-27', tone: 'teal' },
  { id: 'sports-29', title: 'Sports Night', start: '2026-10-29', tone: 'navy' },
  { id: 'guys-30', title: 'Guys/Girls Night', start: '2026-10-30', tone: 'navy' },
];

export type CalendarDayItem = FieldCalendarEvent & {
  /** True on every day of a span after the day it starts. */
  continues: boolean;
};

export type CalendarCell = {
  date: string | null;
  day: number | null;
  items: CalendarDayItem[];
};

/** Local calendar day as YYYY-MM-DD, so “today” matches the volunteer’s date. */
export function calendarTodayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calendarMonthTitle(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}

export function shiftCalendarMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const next = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function itemsOn(date: string, events: readonly FieldCalendarEvent[]): CalendarDayItem[] {
  const items = events.flatMap((event) => {
    const end = event.end ?? event.start;
    if (date < event.start || date > end) return [];
    return [{ ...event, continues: date !== event.start }];
  });
  return items.sort((a, b) => Number(b.tone === 'span') - Number(a.tone === 'span'));
}

/** Sunday-first weeks. Blank cells pad the first and last week. */
export function buildCalendarMonth(
  year: number,
  month: number,
  events: readonly FieldCalendarEvent[] = PREVIEW_FIELD_CALENDAR_EVENTS,
): CalendarCell[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ date: null, day: null, items: [] });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = isoDate(year, month, day);
    cells.push({ date, day, items: itemsOn(date, events) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null, items: [] });
  }

  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}
