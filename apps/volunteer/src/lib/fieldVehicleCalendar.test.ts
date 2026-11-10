import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  vehicleCalendarWeeks,
  vehicleChoiceLabel,
  vehicleDateLabel,
  vehicleDayHasOpening,
  vehicleDaySlots,
} from './fieldVehicleCalendar.ts';

describe('vehicle booking calendar', () => {
  it('opens November 2026 on Sunday', () => {
    const weeks = vehicleCalendarWeeks(2026, 11);
    assert.equal(weeks[0]?.[0]?.date, '2026-11-01');
    assert.equal(weeks.flat().filter((day) => day.date).length, 30);
  });

  it('names the selected day', () => {
    assert.equal(vehicleDateLabel('2026-11-09'), 'Monday, November 9');
    assert.equal(vehicleChoiceLabel('2026-11-09', '8:00 AM'), 'Nov 9, 8:00 AM');
  });

  it('keeps Sunday closed for every hour tag', () => {
    for (const vehicleId of ['micra', 'van']) {
      for (const lengthId of ['hour-1', 'hour-4']) {
        assert.equal(vehicleDayHasOpening(vehicleId, lengthId, '2026-11-15'), false);
      }
    }
  });

  it('gives each hour tag its own open times on a Monday', () => {
    const micraHour = vehicleDaySlots('micra', 'hour-1', '2026-11-09');
    const vanHour = vehicleDaySlots('van', 'hour-1', '2026-11-09');
    const micraBlock = vehicleDaySlots('micra', 'hour-4', '2026-11-09');
    const vanBlock = vehicleDaySlots('van', 'hour-4', '2026-11-09');

    assert.equal(micraHour.find((slot) => slot.startLabel === '8:00 AM')?.available, true);
    assert.equal(micraHour.find((slot) => slot.startLabel === '10:00 AM')?.available, false);
    assert.equal(vanHour.find((slot) => slot.startLabel === '8:00 AM')?.available, true);
    assert.equal(vanHour.find((slot) => slot.startLabel === '3:00 PM')?.available, true);
    assert.equal(vanHour.find((slot) => slot.startLabel === '4:00 PM')?.available, false);
    assert.deepEqual(
      micraBlock.map((slot) => [slot.startLabel, slot.endLabel, slot.available]),
      [
        ['8:00 AM', '12:00 PM', true],
        ['12:00 PM', '4:00 PM', false],
        ['4:00 PM', '8:00 PM', false],
      ],
    );
    assert.deepEqual(
      vanBlock.map((slot) => [slot.startLabel, slot.available]),
      [
        ['8:00 AM', false],
        ['12:00 PM', true],
        ['4:00 PM', false],
      ],
    );
  });
});