import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { VolunteerFile } from '../types/volunteer';
import {
  collectListedVolunteerFileKeys,
  excludeListedVolunteerFileDuplicates,
  isDuplicateVolunteerFile,
} from './volunteerFileDedup';

describe('volunteerFileDedup', () => {
  it('matches duplicates by monday asset id and url', () => {
    const listed = collectListedVolunteerFileKeys([
      {
        id: 'profile-photo',
        name: 'Profile photo',
        url: '/api/monday/assets/2872738376',
        isImage: true,
      },
    ]);

    const galleryCopy: VolunteerFile = {
      id: '2872738376',
      name: 'IMG_3889.heic',
      url: '/api/monday/assets/2872738376',
      isImage: true,
    };

    assert.equal(isDuplicateVolunteerFile(galleryCopy, listed), true);
  });

  it('keeps unrelated files in other documents', () => {
    const listed = collectListedVolunteerFileKeys([
      {
        id: '2872738348',
        name: 'Passport',
        url: '/api/monday/assets/2872738348',
        isImage: true,
      },
    ]);

    const candidates: VolunteerFile[] = [
      {
        id: '2872738450',
        name: 'IMG_4463.jpeg',
        url: '/api/monday/assets/2872738450',
        isImage: true,
      },
      {
        id: '2872738348',
        name: 'IMG_3889.heic',
        url: '/api/monday/assets/2872738348',
        isImage: true,
      },
    ];

    const other = excludeListedVolunteerFileDuplicates(candidates, listed);
    assert.equal(other.length, 1);
    assert.equal(other[0]?.name, 'IMG_4463.jpeg');
  });
});
