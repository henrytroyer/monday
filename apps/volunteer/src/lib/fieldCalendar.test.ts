import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PREVIEW_FIELD_CALENDAR_EVENTS,
  buildCalendarMonth,
  calendarMonthTitle,
  calendarTodayIso,
  shiftCalendarMonth,
} from './fieldCalendar.ts';

describe('field calendar', () => {
  it('opens October 2026 on Thursday and keeps Sunday first', () => {
    const weeks = buildCalendarMonth(2026, 10, []);
    assert.equal(weeks[0]?.[0]?.day, null);
    assert.equal(weeks[0]?.[4]?.day, 1);
    assert.equal(weeks[4]?.[6]?.day, 31);
    assert.equal(weeks.flat().filter((cell) => cell.day !== null).length, 31);
  });

  it('names the month in the calendar heading', () => {
    assert.equal(calendarMonthTitle(2026, 10), 'OCTOBER 2026');
  });

  it('places the staff retreat across October 2 through 6', () => {
    const weeks = buildCalendarMonth(2026, 10);
    const retreatDays = weeks
      .flat()
      .filter((cell) => cell.items.some((item) => item.id === 'retreat'));
    assert.deepEqual(
      retreatDays.map((cell) => cell.day),
      [2, 3, 4, 5, 6],
    );
    assert.equal(retreatDays[0]?.items[0]?.continues, false);
    assert.equal(retreatDays[1]?.items[0]?.continues, true);
    assert.equal(retreatDays[1]?.items[1]?.title, "Theo's Birthday");
  });

  it('keeps Sports Night ahead of Preston’s birthday on the first', () => {
    const first = buildCalendarMonth(2026, 10)
      .flat()
      .find((cell) => cell.day === 1);
    assert.deepEqual(
      first?.items.map((item) => item.title),
      ['Sports Night', "Preston's Birthday"],
    );
  });

  it('leaves a month with no preview events empty', () => {
    const november = buildCalendarMonth(2026, 11, PREVIEW_FIELD_CALENDAR_EVENTS);
    assert.equal(
      november.flat().some((cell) => cell.items.length > 0),
      false,
    );
  });

  it('reads today from the local calendar', () => {
    assert.equal(calendarTodayIso(new Date(2026, 9, 23)), '2026-10-23');
  });

  it('steps across the year boundary', () => {
    assert.deepEqual(shiftCalendarMonth(2026, 10, 1), { year: 2026, month: 11 });
    assert.deepEqual(shiftCalendarMonth(2026, 1, -1), { year: 2025, month: 12 });
  });
});
