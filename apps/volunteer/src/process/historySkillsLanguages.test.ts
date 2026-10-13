import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  emptyHistorySkillsLanguages,
  HEAR_ABOUT_LABEL,
  HEAR_ABOUT_OPTIONS,
  HISTORY_BANNER,
  isHistorySkillsLanguagesComplete,
  LANGUAGES_BANNER,
  MEDICAL_LABEL,
  needsReferralName,
  SKILLS_BANNER,
} from './historySkillsLanguages.ts';

describe('history / skills / languages copy', () => {
  it('renames the fifth process step', () => {
    const fifth = SHORT_TERM_STEP_DEFAULTS[4];
    assert.equal(fifth?.id, 'child_safeguarding');
    assert.equal(fifth?.title, 'History / Skills / Languages');
    assert.equal(fifth?.audience, 'volunteer');
  });

  it('includes the section banners and hear-about choices from the source form', () => {
    assert.equal(HISTORY_BANNER, 'History');
    assert.equal(SKILLS_BANNER, 'Skills');
    assert.equal(LANGUAGES_BANNER, 'Languages');
    assert.equal(MEDICAL_LABEL, 'Medical Condition / Allergy');
    assert.equal(HEAR_ABOUT_LABEL, 'How did you hear about i58?');
    assert.deepEqual(
      HEAR_ABOUT_OPTIONS.map((option) => option.label),
      [
        'Church Presentation/missions conference',
        'Friend',
        'Online',
        'Sibling/family member',
      ],
    );
  });
});

describe('history / skills / languages gate', () => {
  const filled = {
    ...emptyHistorySkillsLanguages(),
    medical: 'None',
    travelledInternationally: 'no' as const,
    heardAbout: ['online'],
    whyVolunteer: 'I want to serve.',
    testimony: 'I follow Jesus.',
    occupation: 'Teacher',
    skills: ['Teaching'],
    leadership: 'no' as const,
    languages: ['English'],
  };

  it('requires history, skills, and languages before Next', () => {
    assert.equal(isHistorySkillsLanguagesComplete(emptyHistorySkillsLanguages()), false);
    assert.equal(isHistorySkillsLanguagesComplete(filled), true);
  });

  it('requires a referral name when Friend or Sibling/family member is chosen', () => {
    assert.equal(needsReferralName(['friend']), true);
    assert.equal(
      isHistorySkillsLanguagesComplete({
        ...filled,
        heardAbout: ['friend'],
        friendName: '',
      }),
      false,
    );
    assert.equal(
      isHistorySkillsLanguagesComplete({
        ...filled,
        heardAbout: ['friend'],
        friendName: 'Anna',
      }),
      true,
    );
  });
});
