import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER } from '../mock/fixtures.ts';
import { emptyGeneralInformation } from '../process/generalInformation.ts';
import { emptyPassportDetails } from '../process/passportDetails.ts';
import { emptySpouseApplication } from '../process/spouseApplication.ts';
import {
  generalInformationProgress,
  gettingStartedProgress,
  passportDetailsProgress,
  spouseApplicationProgress,
  stepFillPercent,
} from './formProgress.ts';

describe('form progress', () => {
  it('counts saved Getting Started fields', () => {
    assert.equal(
      gettingStartedProgress({
        fullName: 'Sam Rivera',
        firstName: '',
        email: '',
        previousVolunteer: '',
      }),
      25,
    );
    assert.equal(
      gettingStartedProgress({
        fullName: 'Sam Rivera',
        firstName: 'Sam',
        email: 'sam@example.com',
        previousVolunteer: 'no',
      }),
      100,
    );
  });

  it('counts two of eight general information fields as 25 percent', () => {
    assert.equal(
      generalInformationProgress({
        ...emptyGeneralInformation(),
        gender: 'female',
        birthdate: '1998-04-02',
      }),
      25,
    );
  });

  it('counts one of three passport fields', () => {
    assert.equal(
      passportDetailsProgress({
        ...emptyPassportDetails(),
        passportNumber: 'X123',
      }),
      33,
    );
  });

  it('treats a spouse who is not joining as finished', () => {
    assert.equal(
      spouseApplicationProgress({ ...emptySpouseApplication(), spouseJoining: 'no' }),
      100,
    );
  });

  it('keeps a submitted step full and ignores an unsaved account name', () => {
    assert.equal(stepFillPercent(JANE_MILLER, 'application_received'), 100);
    assert.equal(stepFillPercent(JANE_MILLER, 'pastor_reference'), 0);
    assert.equal(
      stepFillPercent(
        {
          ...JANE_MILLER,
          steps: JANE_MILLER.steps.map((step) =>
            step.id === 'in_review' ? { ...step, status: 'not_started' as const } : step,
          ),
          passportDetails: { ...emptyPassportDetails(), passportNumber: 'X123' },
        },
        'in_review',
      ),
      33,
    );
  });
});
