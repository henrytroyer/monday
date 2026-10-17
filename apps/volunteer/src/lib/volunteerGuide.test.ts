import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CRISIS_FACTS, CRISIS_TITLE, GUIDE_VALUES, LOOKING_FOR_TITLE } from './volunteerGuide.ts';

describe('crisis reminder copy', () => {
  it('names the three public displacement facts', () => {
    assert.equal(CRISIS_TITLE, 'A Crisis Calling Us to Action');
    assert.equal(CRISIS_FACTS.length, 3);
    assert.match(CRISIS_FACTS[0]!.detail, /117 million/);
    assert.match(CRISIS_FACTS[1]!.detail, /70%/);
    assert.match(CRISIS_FACTS[2]!.detail, /two-thirds/);
  });
});

describe('who we are looking for', () => {
  it('uses the six public volunteer qualities', () => {
    assert.equal(LOOKING_FOR_TITLE, "Who We're Looking For");
    assert.deepEqual(
      GUIDE_VALUES.map((value) => value.title),
      [
        'Team-Oriented',
        'Flexible',
        'Teachable',
        'Compassionate',
        'Respectful',
        'Encouraging',
      ],
    );
  });
});
