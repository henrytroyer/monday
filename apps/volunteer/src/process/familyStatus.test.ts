import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  CHILDREN_18_HEADING,
  CHILDREN_COMING_LABEL,
  emptyFamilyStatus,
  FAMILY_STATUS_BANNER,
  isFamilyStatusComplete,
  MARITAL_STATUS_LABEL,
  MARITAL_STATUS_OPTIONS,
} from './familyStatus.ts';

describe('family status copy', () => {
  it('renames the sixth process step', () => {
    const sixth = SHORT_TERM_STEP_DEFAULTS[5];
    assert.equal(sixth?.id, 'approved');
    assert.equal(sixth?.title, 'Family Status');
    assert.equal(sixth?.audience, 'volunteer');
  });

  it('includes the labels from the source form', () => {
    assert.equal(FAMILY_STATUS_BANNER, 'Family Status');
    assert.equal(MARITAL_STATUS_LABEL, 'Marital Status');
    assert.equal(
      CHILDREN_COMING_LABEL,
      'Do you have children that will be coming with you?',
    );
    assert.equal(CHILDREN_18_HEADING, 'Children 18yrs+');
    assert.deepEqual(
      MARITAL_STATUS_OPTIONS.map((option) => option.label),
      ['Single', 'Dating', 'Engaged', 'Married'],
    );
  });
});

describe('family status gate', () => {
  it('requires marital status and children answer before Next', () => {
    const empty = emptyFamilyStatus();
    assert.equal(isFamilyStatusComplete(empty), false);
    assert.equal(
      isFamilyStatusComplete({
        maritalStatus: 'single',
        childrenComing: 'no',
        familyMembers: '',
      }),
      true,
    );
  });

  it('requires the family-member list when children are coming', () => {
    assert.equal(
      isFamilyStatusComplete({
        maritalStatus: 'married',
        childrenComing: 'yes',
        familyMembers: '',
      }),
      false,
    );
    assert.equal(
      isFamilyStatusComplete({
        maritalStatus: 'married',
        childrenComing: 'yes',
        familyMembers: 'Jane, 3, Female',
      }),
      true,
    );
  });
});
