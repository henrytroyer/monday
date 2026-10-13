import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  emptyProfilePhoto,
  ID_PHOTO_LABEL,
  ID_PHOTO_REQUIREMENTS,
  ID_PHOTO_REQUIREMENTS_HEADING,
  isProfilePhotoComplete,
  PROFILE_PHOTO_BANNER,
} from './profilePhoto.ts';

describe('profile photo copy', () => {
  it('renames the fourth process step', () => {
    const fourth = SHORT_TERM_STEP_DEFAULTS[3];
    assert.equal(fourth?.id, 'background_check');
    assert.equal(fourth?.title, 'Profile Photo');
    assert.equal(fourth?.audience, 'volunteer');
  });

  it('includes the labels from the source form', () => {
    assert.equal(PROFILE_PHOTO_BANNER, 'Profile Photo');
    assert.equal(ID_PHOTO_REQUIREMENTS_HEADING, 'ID Photo Requirements:');
    assert.equal(ID_PHOTO_LABEL, 'ID Photo');
    assert.equal(ID_PHOTO_REQUIREMENTS.length, 3);
    assert.match(
      ID_PHOTO_REQUIREMENTS[0]?.parts.map((part) => part.text).join('') ?? '',
      /Required- Plain neutral background/,
    );
    assert.equal(
      ID_PHOTO_REQUIREMENTS[1]?.parts.find((part) => part.bold)?.text,
      'head and shoulders',
    );
  });
});

describe('profile photo gate', () => {
  it('requires an ID photo before Next', () => {
    assert.equal(isProfilePhotoComplete(emptyProfilePhoto()), false);
    assert.equal(
      isProfilePhotoComplete({ photoFileName: 'id-photo.jpg' }),
      true,
    );
  });
});
