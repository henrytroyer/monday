import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GUIDELINES_FAITH_CONDUCT_BULLETS,
  GUIDELINES_FAITH_CONDUCT_HEADING,
  GUIDELINES_FAITH_DOCUMENT_TITLE,
  GUIDELINES_FAITH_PHOTO,
  GUIDELINES_FAITH_PURPOSE,
} from './guidelinesFaith.ts';

describe('guidelines & faith copy', () => {
  it('uses the short-term volunteer guidelines heading and purpose', () => {
    assert.equal(
      GUIDELINES_FAITH_DOCUMENT_TITLE,
      'Short-Term Volunteer Guidelines & Rules of Conduct',
    );
    assert.match(GUIDELINES_FAITH_PURPOSE, /not as a set of rigid rules/);
    assert.match(GUIDELINES_FAITH_PURPOSE, /framework to empower you in your mission/);
    assert.match(GUIDELINES_FAITH_PURPOSE, /Holy Spirit within each of us/);
  });

  it('includes the team-site personal conduct, including camp photos and Greek law', () => {
    assert.equal(GUIDELINES_FAITH_CONDUCT_HEADING, 'Personal Conduct');
    assert.equal(GUIDELINES_FAITH_CONDUCT_BULLETS.length, 8);
    assert.match(GUIDELINES_FAITH_CONDUCT_BULLETS[6]!, /social media or online/);
    assert.match(GUIDELINES_FAITH_CONDUCT_BULLETS[7]!, /Greek law/);
    assert.equal(GUIDELINES_FAITH_PHOTO, '/brand/our-approach.jpg');
  });
});
