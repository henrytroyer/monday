import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Volunteer } from '../types/volunteer';
import {
  buildApplicationGanttModel,
  collectGanttLocationOptions,
  formatGanttWindowLabelFromScroll,
  GANTT_WINDOW_MONTHS,
  ganttScrollRatioByMonthIndex,
  ganttTimelineWidthPercent,
  matchesGanttLocation,
} from './applicationGantt';

function volunteer(partial: Partial<Volunteer> & Pick<Volunteer, 'id' | 'name'>): Volunteer {
  return {
    locationPreference: 'Lesvos',
    location: '',
    status: 'Approved',
    timelineId: '2026-summer',
    ...partial,
  };
}

describe('buildApplicationGanttModel', () => {
  it('builds dated rows sorted by start and skips missing dates', () => {
    const model = buildApplicationGanttModel([
      volunteer({
        id: 'b',
        name: 'Beth',
        termStart: '2026-08-01',
        termEnd: '2026-08-21',
      }),
      volunteer({
        id: 'a',
        name: 'Ann',
        termStart: '2026-07-01',
        termEnd: '2026-07-21',
      }),
      volunteer({
        id: 'c',
        name: 'Cara',
        timelineId: 'unknown-timeline',
      }),
    ]);

    assert.equal(model.rows.length, 2);
    assert.equal(model.rows[0]?.name, 'Ann');
    assert.equal(model.rows[1]?.name, 'Beth');
    assert.equal(model.skippedWithoutDates, 1);
    assert.ok(model.months.length >= GANTT_WINDOW_MONTHS);
  });

  it('spans the full term range so the UI can scroll a 3-month viewport', () => {
    const model = buildApplicationGanttModel([
      volunteer({
        id: 'early',
        name: 'Early',
        termStart: '2024-01-01',
        termEnd: '2024-01-20',
      }),
      volunteer({
        id: 'late',
        name: 'Late',
        termStart: '2027-11-01',
        termEnd: '2027-11-20',
      }),
      volunteer({
        id: 'mid',
        name: 'Mid',
        termStart: '2026-07-10',
        termEnd: '2026-08-05',
      }),
    ]);

    assert.ok(model.months.length > GANTT_WINDOW_MONTHS);
    assert.equal(model.rows.length, 3);
    assert.equal(model.hiddenOutsideWindow, 0);
    assert.equal(
      ganttTimelineWidthPercent(model.months.length),
      `${(model.months.length / GANTT_WINDOW_MONTHS) * 100}%`,
    );
  });
});

describe('gantt scroll helpers', () => {
  it('maps window start to a scroll ratio across months', () => {
    const model = buildApplicationGanttModel([
      volunteer({
        id: 'a',
        name: 'A',
        termStart: '2026-01-01',
        termEnd: '2026-01-10',
      }),
      volunteer({
        id: 'b',
        name: 'B',
        termStart: '2026-06-01',
        termEnd: '2026-06-10',
      }),
    ]);

    const start = model.months[0]?.startMs ?? 0;
    assert.equal(ganttScrollRatioByMonthIndex(start, model.months), 0);

    const mid = model.months[Math.floor(model.months.length / 2)]?.startMs;
    if (mid != null) {
      const ratio = ganttScrollRatioByMonthIndex(mid, model.months);
      assert.ok(ratio > 0 && ratio <= 1);
    }

    const label = formatGanttWindowLabelFromScroll(0, model.months);
    assert.match(label, /Jan/);
  });
});

describe('matchesGanttLocation', () => {
  it('matches confirmed or preferred location', () => {
    const v = volunteer({
      id: '1',
      name: 'Ann',
      locationPreference: 'Germany',
      location: 'Malakasa',
    });
    assert.equal(matchesGanttLocation(v, []), true);
    assert.equal(matchesGanttLocation(v, ['Malakasa']), true);
    assert.equal(matchesGanttLocation(v, ['Germany']), true);
    assert.equal(matchesGanttLocation(v, ['Lesvos']), false);
  });
});

describe('collectGanttLocationOptions', () => {
  it('dedupes location labels', () => {
    const options = collectGanttLocationOptions([
      volunteer({ id: '1', name: 'A', location: 'Lesvos' }),
      volunteer({ id: '2', name: 'B', location: 'Lesvos' }),
      volunteer({ id: '3', name: 'C', locationPreference: 'Germany' }),
    ]);
    assert.deepEqual(options, ['Germany', 'Lesvos']);
  });
});
