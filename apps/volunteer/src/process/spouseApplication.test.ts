import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  emptySpouseApplication,
  isSpouseApplicationComplete,
  SPOUSE_APPLICATION_BANNER,
  SPOUSE_INFO_HEADING,
  SPOUSE_JOINING_LABEL,
  SPOUSE_NAME_LABEL,
} from './spouseApplication.ts';

function yesDraft(
  overrides: Partial<ReturnType<typeof emptySpouseApplication>> = {},
) {
  return {
    ...emptySpouseApplication(),
    spouseJoining: 'yes' as const,
    name: 'Alex Miller',
    email: 'alex@example.com',
    phone: '5551234567',
    previousVolunteer: 'no' as const,
    birthdate: '1990-01-01',
    gender: 'female' as const,
    passportPhotoFileName: 'passport.jpg',
    passportNumber: 'X1234567',
    passportExpiration: '2030-01-01',
    updateProfilePhoto: 'yes' as const,
    profilePhotoFileName: 'id.jpg',
    testimony: 'Spouse testimony',
    languages: ['English'],
    skills: ['Cooking'],
    ...overrides,
  };
}

describe('spouse application copy', () => {
  it('renames the seventh process step', () => {
    const seventh = SHORT_TERM_STEP_DEFAULTS[6];
    assert.equal(seventh?.id, 'flight_info');
    assert.equal(seventh?.title, 'Spouse Application');
    assert.equal(seventh?.audience, 'volunteer');
  });

  it('includes the joining question and spouse section labels', () => {
    assert.equal(SPOUSE_APPLICATION_BANNER, 'Spouse Application');
    assert.equal(
      SPOUSE_JOINING_LABEL,
      'Do you have a spouse joining you as a volunteer?',
    );
    assert.equal(SPOUSE_INFO_HEADING, 'Spouse Information');
    assert.equal(SPOUSE_NAME_LABEL, 'Spouse Name');
  });
});

describe('spouse application gate', () => {
  it('allows Next as soon as the spouse is not joining', () => {
    assert.equal(isSpouseApplicationComplete(emptySpouseApplication()), false);
    assert.equal(
      isSpouseApplicationComplete({
        ...emptySpouseApplication(),
        spouseJoining: 'no',
      }),
      true,
    );
  });

  it('requires the screenshot fields when a spouse is joining', () => {
    assert.equal(
      isSpouseApplicationComplete({
        ...emptySpouseApplication(),
        spouseJoining: 'yes',
      }),
      false,
    );
    assert.equal(isSpouseApplicationComplete(yesDraft()), true);
  });

  it('requires last term of service only for a returning spouse', () => {
    assert.equal(
      isSpouseApplicationComplete(
        yesDraft({ previousVolunteer: 'yes', lastTermDate: '' }),
      ),
      false,
    );
    assert.equal(
      isSpouseApplicationComplete(
        yesDraft({ previousVolunteer: 'yes', lastTermDate: '2024-06-01' }),
      ),
      true,
    );
  });

  it('requires Other descriptions when Other is selected', () => {
    assert.equal(
      isSpouseApplicationComplete(yesDraft({ languages: ['Other'] })),
      false,
    );
    assert.equal(
      isSpouseApplicationComplete(
        yesDraft({ languages: ['Other'], otherLanguage: 'Dutch' }),
      ),
      true,
    );
  });
});
