import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assetIdsToRemoveFromVolunteerFile } from './removeMondayFile';

describe('assetIdsToRemoveFromVolunteerFile', () => {
  it('uses numeric file id', () => {
    assert.deepEqual(
      assetIdsToRemoveFromVolunteerFile({
        id: '2872738376',
        name: 'Passport.jpg',
        url: '/api/monday/assets/2872738376',
        isImage: true,
      }),
      ['2872738376'],
    );
  });

  it('falls back to asset id in url for synthetic profile id', () => {
    assert.deepEqual(
      assetIdsToRemoveFromVolunteerFile({
        id: 'profile-photo',
        name: 'Profile photo',
        url: '/api/monday/assets/1660350900?token=abc',
        isImage: true,
      }),
      ['1660350900'],
    );
  });

  it('expands merged itinerary source assets', () => {
    assert.deepEqual(
      assetIdsToRemoveFromVolunteerFile({
        id: 'itinerary-merged-1-2',
        name: 'Itinerary.pdf',
        url: '/api/monday/assets/merge/1,2',
        isImage: false,
        mergeSourceAssetIds: ['1', '2'],
      }),
      ['1', '2'],
    );
  });
});
