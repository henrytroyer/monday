import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { progressConnectorTone } from './stepConnector.ts';

describe('progress connector', () => {
  const steps = [
    { id: 'done', fill: 100 },
    { id: 'current', fill: 40 },
    { id: 'next', fill: 0 },
    { id: 'later', fill: 0 },
  ];

  it('colors the arrow into the step being worked on', () => {
    assert.equal(progressConnectorTone(steps, steps[0], steps[1], 'orange'), 'orange');
  });

  it('colors the arrow into the next empty step when the one before it is finished', () => {
    const finished = [
      { id: 'done', fill: 100 },
      { id: 'next', fill: 0 },
    ];
    assert.equal(progressConnectorTone(finished, finished[0], finished[1], 'orange'), 'orange');
  });

  it('leaves later arrows quiet', () => {
    assert.equal(progressConnectorTone(steps, steps[1], steps[2], 'orange'), 'muted');
    assert.equal(progressConnectorTone(steps, steps[2], steps[3], 'orange'), 'muted');
  });
});
