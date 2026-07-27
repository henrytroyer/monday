import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LongtermVolunteer } from '../types/longtermVolunteer';
import {
  buildLongtermCoupleDisplayName,
  mergeLongtermCouples,
  nameMentionedInFamilyText,
  normalizeLongtermHomeAddress,
  sharedLongtermLastName,
  shouldMergeLongtermCouple,
  visibleLongtermVolunteers,
} from './mergeLongtermCouples.js';

function lv(
  partial: Partial<LongtermVolunteer> & Pick<LongtermVolunteer, 'id' | 'name'>,
): LongtermVolunteer {
  return {
    locationPreference: 'Lesvos',
    location: '—',
    status: 'approved',
    timelineId: 'long-term',
    onField: false,
    ...partial,
  };
}

describe('normalizeLongtermHomeAddress', () => {
  it('matches lane and ln variants', () => {
    assert.equal(
      normalizeLongtermHomeAddress('17 Pine Lane, Willow Street, PA, USA'),
      normalizeLongtermHomeAddress('17 Pine Ln, Willow Street, PA, USA'),
    );
  });
});

describe('shouldMergeLongtermCouple', () => {
  it('merges married applicants with the same home address', () => {
    const amy = lv({
      id: '1',
      name: 'Amy Wagler',
      maritalStatus: 'Married',
      homeAddress: '17 Pine Lane, Willow Street, PA, USA',
      pipelineStage: 'Clearances',
    });
    const brandon = lv({
      id: '2',
      name: 'Brandon Wagler',
      maritalStatus: 'Married',
      homeAddress: '17 Pine Ln, Willow Street, PA, USA',
      pipelineStage: 'Clearances',
    });

    assert.equal(shouldMergeLongtermCouple(amy, brandon).merge, true);
  });

  it('merges married applicants with shared last name on same team', () => {
    const nick = lv({
      id: '3',
      name: 'Nick Bontrager',
      maritalStatus: 'Married',
      pipelineStage: 'Lesvos Team',
      onField: true,
      fieldLocation: 'Lesvos',
    });
    const lisa = lv({
      id: '4',
      name: 'Lisa Bontrager',
      maritalStatus: 'Married',
      pipelineStage: 'Lesvos Team',
      onField: true,
      fieldLocation: 'Lesvos',
    });

    assert.equal(shouldMergeLongtermCouple(nick, lisa).merge, true);
  });

  it('does not merge unrelated married volunteers', () => {
    const a = lv({
      id: '5',
      name: 'Person A',
      maritalStatus: 'Married',
      pipelineStage: 'Lesvos Team',
    });
    const b = lv({
      id: '6',
      name: 'Person B',
      maritalStatus: 'Married',
      pipelineStage: 'Malakasa Team',
    });

    assert.equal(shouldMergeLongtermCouple(a, b).merge, false);
  });

  it('merges same-team same-last-name when marital status is empty', () => {
    const savvas = lv({
      id: '7',
      name: 'Savvas Emmanouilidis',
      pipelineStage: 'Lesvos Team',
      onField: true,
      fieldLocation: 'Lesvos',
    });
    const joy = lv({
      id: '8',
      name: 'Joy Emmanouilidis',
      pipelineStage: 'Lesvos Team',
      onField: true,
      fieldLocation: 'Lesvos',
    });

    assert.equal(shouldMergeLongtermCouple(savvas, joy).merge, true);
  });

  it('does not merge same-last-name relatives who are not married', () => {
    const erik = lv({
      id: '9',
      name: 'Erik Esh',
      maritalStatus: 'Engaged',
      pipelineStage: 'Term Ended',
    });
    const mary = lv({
      id: '10',
      name: 'Mary Esh',
      pipelineStage: 'Archive',
    });

    assert.equal(shouldMergeLongtermCouple(erik, mary).merge, false);
  });

  it('does not merge siblings when one is single on a different team', () => {
    const aaron = lv({
      id: '11',
      name: 'Aaron Good',
      pipelineStage: 'Term Ended',
    });
    const cambri = lv({
      id: '12',
      name: 'Cambri Good',
      maritalStatus: 'Single',
      pipelineStage: 'Neustadt Team',
      onField: true,
      fieldLocation: 'Neustadt',
    });

    assert.equal(shouldMergeLongtermCouple(aaron, cambri).merge, false);
  });
});

describe('nameMentionedInFamilyText', () => {
  it('matches full name mentions in family list text', () => {
    const text = 'Amy Wagler, 29, Female --Darci Wagler, 2, Female';
    assert.equal(nameMentionedInFamilyText(text, 'Amy Wagler'), true);
  });
});

describe('mergeLongtermCouples', () => {
  it('hides partner row and adds couple preview on primary', () => {
    const merged = mergeLongtermCouples([
      lv({
        id: '10',
        name: 'Amy Wagler',
        maritalStatus: 'Married',
        homeAddress: '17 Pine Lane, Willow Street, PA, USA',
        email: 'amy@example.com',
        pipelineStage: 'Clearances',
      }),
      lv({
        id: '20',
        name: 'Brandon Wagler',
        maritalStatus: 'Married',
        homeAddress: '17 Pine Ln, Willow Street, PA, USA',
        email: 'brandon@example.com',
        profilePhotoUrl: 'https://example.com/brandon.jpg',
        pipelineStage: 'Clearances',
      }),
    ]);

    const visible = visibleLongtermVolunteers(merged);
    assert.equal(visible.length, 1);
    assert.equal(visible[0]?.couplePreview?.partnerItemId, '20');
    assert.equal(visible[0]?.partnerItemId, '20');
    assert.match(visible[0]?.name ?? '', /Amy.*Brandon/);
  });
});

describe('sharedLongtermLastName', () => {
  it('matches hyphenated married last names', () => {
    assert.equal(
      sharedLongtermLastName(
        'Cierra Grace Miller-Stoltzfus',
        'Seth Stoltzfus',
      ),
      true,
    );
  });
});

describe('buildLongtermCoupleDisplayName', () => {
  it('uses shared last name format when surnames match', () => {
    assert.equal(
      buildLongtermCoupleDisplayName('Amy Wagler', 'Brandon Wagler'),
      'Amy & Brandon Wagler',
    );
  });
});
