import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER } from '../mock/fixtures.ts';
import { serviceMonths, servicePeriodFor, serviceProgress, serviceRatioLabel } from './servicePeriod.ts';

describe('service period', () => {
  const arrival = new Date(Date.UTC(2026, 5, 6));
  const departure = new Date(Date.UTC(2026, 8, 6));

  it('keeps a short-term service period at three months', () => {
    assert.equal(serviceMonths(JANE_MILLER), 3);
    assert.equal(
      serviceMonths({
        ...JANE_MILLER,
        termOfService: {
          locationPreferences: [],
          lengthOfTerm: '3-months',
          otherTerm: '',
          preferredDates: '',
          nearbyAirport: '',
        },
      }),
      3,
    );
  });

  it('uses a stated other length when the term is not three months', () => {
    assert.equal(
      serviceMonths({
        ...JANE_MILLER,
        termOfService: {
          locationPreferences: [],
          lengthOfTerm: 'other',
          otherTerm: '6 months',
          preferredDates: '',
          nearbyAirport: '',
        },
      }),
      6,
    );
  });

  it('places today on the line from arrival through three months later', () => {
    assert.equal(serviceProgress(arrival, departure, new Date(Date.UTC(2026, 4, 1))), 0);
    assert.equal(serviceProgress(arrival, departure, arrival), 0);
    assert.equal(serviceProgress(arrival, departure, new Date(Date.UTC(2026, 6, 22))), 50);
    assert.equal(serviceProgress(arrival, departure, departure), 100);
    assert.equal(serviceProgress(arrival, departure, new Date(Date.UTC(2026, 10, 2))), 100);
  });

  it('marks a Summer 2026 volunteer complete after the assigned departure', () => {
    const period = servicePeriodFor(JANE_MILLER, new Date(Date.UTC(2026, 10, 2)));
    assert.equal(period.months, 3);
    assert.equal(period.days, 83);
    assert.equal(period.served, 83);
    assert.equal(period.start?.toISOString().slice(0, 10), '2026-06-06');
    assert.equal(period.end?.toISOString().slice(0, 10), '2026-08-28');
    assert.equal(period.progress, 100);
    assert.equal(serviceRatioLabel(period), '83 days / 83 days = 100%');
  });

  it('counts days already served against the full term', () => {
    const period = servicePeriodFor(JANE_MILLER, new Date(2026, 6, 6));
    assert.equal(period.days, 83);
    assert.equal(period.served, 30);
    assert.equal(period.progress, 36);
    assert.equal(serviceRatioLabel(period), '30 days / 83 days = 36%');
  });

  it('stays at zero days served until arrival', () => {
    const period = servicePeriodFor(JANE_MILLER, new Date(2026, 5, 6));
    assert.equal(period.served, 0);
    assert.equal(period.progress, 0);
    assert.equal(serviceRatioLabel(period), '0 days / 83 days = 0%');
  });

  it('leaves the bar at the start when the term has no arrival date', () => {
    const period = servicePeriodFor(
      { ...JANE_MILLER, term: 'Fall 2027' },
      new Date(Date.UTC(2026, 10, 2)),
    );
    assert.equal(period.start, null);
    assert.equal(period.end, null);
    assert.equal(period.days, 0);
    assert.equal(period.served, 0);
    assert.equal(period.progress, 0);
    assert.equal(serviceRatioLabel(period), null);
  });
});
