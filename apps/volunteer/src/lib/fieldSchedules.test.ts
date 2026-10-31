import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FIELD_CALENDAR_TITLE } from './fieldCalendar.ts';
import { CAMP_SCHEDULE_ROWS, CLEANING_AREAS } from './fieldSchedules.ts';

describe('field schedules', () => {
  it('names the birthday calendar for the field bar', () => {
    assert.equal(FIELD_CALENDAR_TITLE, 'i58 Birthdays & Events');
  });

  it('gives every camp row a day, time, activity, and place', () => {
    assert.ok(CAMP_SCHEDULE_ROWS.length >= 5);
    for (const row of CAMP_SCHEDULE_ROWS) {
      assert.ok(row.day);
      assert.ok(row.time);
      assert.ok(row.activity);
      assert.ok(row.place);
    }
    assert.equal(CAMP_SCHEDULE_ROWS[0]?.activity, 'Team meeting');
  });

  it('keeps the house cleaning areas and the sheet tasks', () => {
    assert.deepEqual(
      CLEANING_AREAS.map((area) => area.title),
      ['Cornerstone Laundry Area', 'Vehicles', 'Brick'],
    );
    const rows = CLEANING_AREAS.flatMap((area) => area.rows);
    assert.equal(rows.find((row) => row.id === 'travis')?.timing, 'Once a week');
    assert.match(rows.find((row) => row.id === 'jacob')?.detail ?? '', /vacuum interior/);
    assert.equal(rows.find((row) => row.id === 'jamison')?.name, 'Jamison');
    assert.match(rows.find((row) => row.id === 'upstairs-floors')?.detail ?? '', /^Vacuum floors/);
    assert.equal(
      rows.find((row) => row.id === 'rose')?.timing,
      'Monday, Wednesday, and Friday',
    );
  });
});
