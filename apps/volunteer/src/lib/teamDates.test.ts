import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER } from '../mock/fixtures.ts';
import {
  assignedTeamDates,
  backgroundCheckAvailability,
  daysBetween,
  fieldPortalOpensAt,
  formatTeamDate,
} from './teamDates.ts';

describe('team dates', () => {
  it('reads Jane’s preview itinerary when Monday dates are missing', () => {
    const dates = assignedTeamDates(JANE_MILLER);
    assert.equal(dates.departsHome?.toISOString().slice(0, 10), '2026-06-05');
    assert.equal(dates.arrivesField?.toISOString().slice(0, 10), '2026-06-06');
    assert.equal(dates.departsField?.toISOString().slice(0, 10), '2026-08-28');
  });

  it('prefers assigned Monday dates over the preview itinerary', () => {
    const dates = assignedTeamDates({
      ...JANE_MILLER,
      teamDates: {
        departsHome: '2026-12-01',
        arrivesField: '2026-12-02',
        departsField: '2027-02-20',
      },
    });
    assert.equal(dates.departsHome?.toISOString().slice(0, 10), '2026-12-01');
    assert.equal(dates.arrivesField?.toISOString().slice(0, 10), '2026-12-02');
    assert.equal(dates.departsField?.toISOString().slice(0, 10), '2027-02-20');
  });

  it('leaves a term with no itinerary undated', () => {
    const dates = assignedTeamDates({ ...JANE_MILLER, term: 'Fall 2027' });
    assert.equal(dates.departsHome, null);
    assert.equal(dates.arrivesField, null);
    assert.equal(dates.departsField, null);
  });

  it('opens Sterling three months before departure', () => {
    const before = backgroundCheckAvailability(JANE_MILLER, new Date(2026, 2, 4));
    const onDay = backgroundCheckAvailability(JANE_MILLER, new Date(2026, 2, 5));
    assert.equal(before.open, false);
    assert.equal(before.note, 'Sterling Volunteers opens on March 5, 2026.');
    assert.equal(onDay.open, true);
    assert.equal(onDay.note, '');
    assert.equal(
      backgroundCheckAvailability({ ...JANE_MILLER, term: 'Fall 2027' }).note,
      'Sterling Volunteers opens three months before you depart. Your departure date is not on file yet.',
    );
  });

  it('opens the field portal the day after departure', () => {
    const opens = fieldPortalOpensAt(JANE_MILLER);
    assert.equal(opens?.toISOString(), '2026-06-06T00:00:00.000Z');
    assert.equal(fieldPortalOpensAt({ ...JANE_MILLER, term: 'Fall 2027' }), null);
    assert.equal(formatTeamDate(opens!), 'June 6, 2026');
    const start = assignedTeamDates(JANE_MILLER).arrivesField!;
    const end = assignedTeamDates(JANE_MILLER).departsField!;
    assert.equal(daysBetween(start, end), 83);
  });
});
