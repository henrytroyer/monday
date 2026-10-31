import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GUIDE_FACTS } from './volunteerGuide.ts';
import { teamTrainingDetails } from './teamTraining.ts';

describe('team training', () => {
  it('uses the public service-training fact', () => {
    const fact = GUIDE_FACTS.find((item) => item.title === 'Service Training');
    const details = teamTrainingDetails();
    assert.equal(details.summary, fact?.detail);
    assert.match(details.summary, /Lancaster, PA/);
    assert.match(details.summary, /Lodging and meals provided/);
    assert.equal(details.place, 'Lancaster, PA');
    assert.equal(details.length, '2 days');
    assert.match(details.dates, /3 June/);
    assert.match(details.dates, /4 June 2026/);
  });
});
