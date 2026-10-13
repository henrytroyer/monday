import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER } from '../mock/fixtures.ts';
import { nextVolunteerAction } from './nextAction.ts';
import {
  processFlowCell,
  processFlowConnector,
  processFlowTone,
} from './processFlow.ts';

describe('processFlowTone', () => {
  const currentId = nextVolunteerAction(JANE_MILLER)?.id;

  it('shades Jane’s finished, active, and remaining steps', () => {
    const tones = JANE_MILLER.steps.map((step) => processFlowTone(step, currentId));
    assert.equal(JANE_MILLER.steps[0]?.title, 'Getting Started');
    assert.equal(tones[0], 'done');
    assert.equal(tones[1], 'current');
    assert.equal(tones[2], 'done');
    assert.equal(tones[3], 'current');
    assert.equal(JANE_MILLER.steps[3]?.title, 'Profile Photo');
    assert.ok(tones.slice(4).every((tone) => tone === 'todo'));
  });
});

describe('processFlow path', () => {
  it('snakes so each dotted line goes to the next step', () => {
    const cells = Array.from({ length: 10 }, (_, index) => processFlowCell(index));
    assert.deepEqual(cells, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 1, col: 1 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 3, col: 2 },
    ]);
    assert.deepEqual(
      Array.from({ length: 10 }, (_, index) => processFlowConnector(index, 10)),
      [
        'right',
        'right',
        'down',
        'left',
        'left',
        'down',
        'right',
        'right',
        'down',
        null,
      ],
    );
  });
});
