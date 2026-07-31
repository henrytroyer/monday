import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  archiveVolunteerFileName,
  isArchivedVolunteerFileName,
  stripArchivedVolunteerFilePrefix,
} from './archivedVolunteerFiles';

describe('archivedVolunteerFiles', () => {
  it('detects and applies the Old- prefix without doubling', () => {
    assert.equal(isArchivedVolunteerFileName('Old - Profile - a.jpg'), true);
    assert.equal(isArchivedVolunteerFileName('Profile - a.jpg'), false);
    assert.equal(
      archiveVolunteerFileName('Profile - a.jpg'),
      'Old - Profile - a.jpg',
    );
    assert.equal(
      archiveVolunteerFileName('Old - Profile - a.jpg'),
      'Old - Profile - a.jpg',
    );
  });

  it('strips the Old- prefix for display', () => {
    assert.equal(
      stripArchivedVolunteerFilePrefix('Old - Passport - scan.jpg'),
      'Passport - scan.jpg',
    );
  });
});
