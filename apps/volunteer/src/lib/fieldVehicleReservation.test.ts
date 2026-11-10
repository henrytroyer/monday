import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { vehicleSeatLabel } from './fieldService.ts';
import {
  buildVehicleReservation,
  reservationMatchesPick,
  saveVehicleReservation,
} from './fieldVehicleReservation.ts';

describe('vehicle reservation', () => {
  it('names the seat count as seats for that many people', () => {
    assert.equal(vehicleSeatLabel(5), 'seats 5 people');
    assert.equal(vehicleSeatLabel(9), 'seats 9 people');
  });

  it('keeps the volunteer id on the reservation staff can read', () => {
    const reservation = buildVehicleReservation(
      {
        volunteerId: 'jane.miller@example.com',
        volunteerName: 'Jane Miller',
        vehicleId: 'micra',
        lengthId: 'hour-1',
        date: '2026-11-13',
        slotId: '2026-11-13-9',
        startLabel: '9:00 AM',
        endLabel: '10:00 AM',
      },
      new Date('2026-11-09T18:00:00.000Z'),
    );

    assert.equal(reservation.volunteerId, 'jane.miller@example.com');
    assert.equal(reservation.submittedAt, '2026-11-09T18:00:00.000Z');
    assert.equal(
      reservationMatchesPick(reservation, {
        volunteerId: 'jane.miller@example.com',
        vehicleId: 'micra',
        lengthId: 'hour-1',
        date: '2026-11-13',
        slotId: '2026-11-13-9',
      }),
      true,
    );
  });

  it('replaces an earlier reservation for the same volunteer and length', () => {
    const first = buildVehicleReservation(
      {
        volunteerId: 'jane.miller@example.com',
        volunteerName: 'Jane Miller',
        vehicleId: 'micra',
        lengthId: 'hour-1',
        date: '2026-11-13',
        slotId: '2026-11-13-9',
        startLabel: '9:00 AM',
        endLabel: '10:00 AM',
      },
      new Date('2026-11-09T18:00:00.000Z'),
    );
    const second = buildVehicleReservation(
      {
        ...first,
        date: '2026-11-14',
        slotId: '2026-11-14-8',
        startLabel: '8:00 AM',
        endLabel: '9:00 AM',
      },
      new Date('2026-11-09T18:05:00.000Z'),
    );
    const saved = saveVehicleReservation([first], second);
    assert.deepEqual(
      saved.map((item) => item.slotId),
      ['2026-11-14-8'],
    );
    assert.equal(saved[0]?.volunteerId, 'jane.miller@example.com');
  });
});