/**
 * mapFilloutShortTermToBundle.test.ts — ST Fillout → volunteer/parent/pastor bundle.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FILLOUT_SHORT_TERM_SOURCE_LABEL,
  mapFilloutShortTermToBundle,
  type FilloutSubmission,
} from './mapFilloutShortTermToBundle';

function q(name: string, value: unknown) {
  return { name, value };
}

describe('mapFilloutShortTermToBundle', () => {
  it('maps volunteer, parent, and pastor with demographics', () => {
    const submission: FilloutSubmission = {
      submissionId: 'sub-1',
      submissionTime: '2026-08-09T04:32:06.738Z',
      questions: [
        q('Your Full Name (No middle name, please)', 'Miranda Buckingham'),
        q('Your Email', 'miranda@example.com'),
        q('Phone Number', '+14842699391'),
        q('Birthdate', '2005-12-07'),
        q('Street Number and Name', '164 Bricker rd'),
        q('City', 'Bernville'),
        q('State/Providence', 'Pa'),
        q('Postal Code', '19506'),
        q('Country', 'USA'),
        q('Parents Names', 'Jamin and Kellie'),
        q("Parent's Email", 'parents@example.com'),
        q("Parent's Phone Number", '+14842694874'),
        q("Pastor's first and last name", 'Jonathan Wagner'),
        q("Pastor's Email", 'pastor@example.com'),
        q("Pastor's Phone", '+14842699391'),
        q('Church Name', 'Christ Ambassadors'),
        q('Full Name of Emergency Contact', 'Kellie Buckingham'),
        q('Emergency Contact Phone Number', '+14842564165'),
      ],
    };

    const bundle = mapFilloutShortTermToBundle(submission);
    assert.equal(bundle.sourceLabel, FILLOUT_SHORT_TERM_SOURCE_LABEL);
    assert.equal(bundle.sourceItemId, 'sub-1');
    assert.equal(bundle.volunteer.name, 'Miranda Buckingham');
    assert.equal(bundle.volunteer.email, 'miranda@example.com');
    assert.deepEqual(bundle.volunteer.tags, ['volunteer']);
    assert.equal(bundle.volunteer.demographics?.address, '164 Bricker rd');
    assert.equal(bundle.volunteer.demographics?.dateOfBirth, '2005-12-07');
    assert.equal(bundle.parents?.name, 'Jamin and Kellie');
    assert.equal(bundle.parents?.email, 'parents@example.com');
    assert.deepEqual(bundle.parents?.tags, ['parent']);
    assert.equal(bundle.pastor?.name, 'Jonathan Wagner');
    assert.equal(bundle.pastor?.church, 'Christ Ambassadors');
    assert.deepEqual(bundle.pastor?.tags, ['pastor']);
    assert.equal(bundle.emergency?.name, 'Kellie Buckingham');
    assert.equal(bundle.spouse, undefined);
    assert.equal(bundle.newPastor, undefined);
  });

  it('omits parent and pastor when name and email are absent', () => {
    const bundle = mapFilloutShortTermToBundle({
      submissionId: 'sub-2',
      questions: [
        q('Your Full Name (No middle name, please)', 'Solo Volunteer'),
        q('Your Email', 'solo@example.com'),
      ],
    });
    assert.equal(bundle.volunteer.name, 'Solo Volunteer');
    assert.equal(bundle.parents, undefined);
    assert.equal(bundle.pastor, undefined);
  });

  it('maps spouse when Spouse Name present (married couple)', () => {
    const bundle = mapFilloutShortTermToBundle({
      submissionId: 'sub-couple',
      questions: [
        q('Your Full Name (No middle name, please)', 'Jane Smith'),
        q('Your Email', 'jane@example.com'),
        q('Gender', 'Female'),
        q('Marital Status', 'Married'),
        q('Spouse Name', 'Jack Smith'),
        q('Spouse Email', 'jack@example.com'),
        q('Spouse Phone Number', '+15551212'),
        q('Spouse Gender', 'Male'),
        q('Spouse Birthdate', '1990-01-02'),
      ],
    });
    assert.equal(bundle.volunteer.name, 'Jane Smith');
    assert.equal(bundle.volunteer.gender, 'Female');
    assert.equal(bundle.spouse?.name, 'Jack Smith');
    assert.equal(bundle.spouse?.email, 'jack@example.com');
    assert.equal(bundle.spouse?.gender, 'Male');
    assert.equal(bundle.spouse?.demographics?.dateOfBirth, '1990-01-02');
    assert.deepEqual(bundle.spouse?.tags, ['volunteer']);
  });
});
