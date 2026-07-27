import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { VolunteerFile } from '../types/volunteer';
import type { MondayColumnValue } from './mapMondayToCrm';
import {
  assetIdFromProtectedUrl,
  excludeGalleryDuplicatesOfColumnFiles,
  mergeVolunteerGalleryFiles,
  mapMondayGalleryAssets,
  mondayAssetProxyUrl,
  mondayMergedAssetsProxyUrl,
  parseAssetIdFromColumn,
  parseMondayFileColumn,
  resolveColumnFileUrl,
  resolvePassportFile,
  resolveProfilePhotoUrl,
} from './mondayFileColumns';

const PROXY = '/api/monday';

function profilePhotoColumn(assetId: number): MondayColumnValue {
  return {
    id: 'profile',
    type: 'file',
    text: `https://example.monday.com/protected_static/resources/${assetId}/IMG_4885.jpg`,
    value: JSON.stringify({
      files: [{ name: 'IMG_4885.jpg', assetId, isImage: 'true' }],
    }),
    column: { title: 'Profile Photo' },
  };
}

function passportColumn(assetId: number, name = 'passport.jpg'): MondayColumnValue {
  return {
    id: 'passport',
    type: 'file',
    text: `https://example.monday.com/protected_static/resources/${assetId}/${name}`,
    value: JSON.stringify({
      files: [{ name, assetId, isImage: 'true' }],
    }),
    column: { title: 'Passport Photo' },
  };
}

describe('mondayAssetProxyUrl', () => {
  it('builds proxy asset URL when base is provided', () => {
    assert.equal(
      mondayAssetProxyUrl('2932688738', PROXY),
      '/api/monday/assets/2932688738',
    );
  });
});

describe('mondayMergedAssetsProxyUrl', () => {
  it('builds merge URL for multiple asset ids', () => {
    assert.equal(
      mondayMergedAssetsProxyUrl(['111', '222'], PROXY),
      '/api/monday/assets/merge/111,222',
    );
  });
});

describe('assetIdFromProtectedUrl', () => {
  it('extracts asset id from protected static URL', () => {
    assert.equal(
      assetIdFromProtectedUrl(
        'https://i58-team.monday.com/protected_static/11110361/resources/2932688738/IMG_4885.jpg',
      ),
      '2932688738',
    );
  });
});

describe('parseAssetIdFromColumn', () => {
  it('reads asset id from column JSON value', () => {
    assert.equal(parseAssetIdFromColumn(profilePhotoColumn(3056047455)), '3056047455');
  });
});

describe('resolveColumnFileUrl', () => {
  it('returns proxy URL for asset id in JSON', () => {
    assert.equal(
      resolveColumnFileUrl(profilePhotoColumn(2932688738), PROXY),
      '/api/monday/assets/2932688738',
    );
  });

  it('returns proxy URL for protected static text', () => {
    const col: MondayColumnValue = {
      id: 'x',
      type: 'file',
      text: 'https://example.com/protected_static/resources/999/file.jpg',
      value: null,
      column: { title: 'Profile Photo' },
    };
    assert.equal(resolveColumnFileUrl(col, PROXY), '/api/monday/assets/999');
  });
});

describe('resolveProfilePhotoUrl', () => {
  it('prefers Profile Photo column over Files gallery', () => {
    const profile = profilePhotoColumn(111);
    const files: MondayColumnValue = {
      id: 'files',
      type: 'file',
      text: '',
      value: JSON.stringify({
        files: [{ name: 'other.jpg', assetId: 222, isImage: 'true' }],
      }),
      column: { title: 'Files' },
    };
    assert.equal(
      resolveProfilePhotoUrl(profile, files, PROXY),
      '/api/monday/assets/111',
    );
  });
});

describe('resolvePassportFile', () => {
  it('uses primary passport column', () => {
    const file = resolvePassportFile(passportColumn(444), undefined, PROXY);
    assert.equal(file?.url, '/api/monday/assets/444');
    assert.match(file?.name ?? '', /passport/i);
  });

  it('falls back to alternate passport column', () => {
    const alt = passportColumn(555, 'new-passport.jpg');
    alt.column = { title: 'Please upload New Passport' };
    const file = resolvePassportFile(undefined, alt, PROXY);
    assert.equal(file?.url, '/api/monday/assets/555');
  });
});

describe('mapMondayGalleryAssets', () => {
  it('maps item gallery assets to proxy-backed volunteer files', () => {
    const files = mapMondayGalleryAssets(
      [
        {
          id: '2986887415',
          name: 'Traveler Receipt (AC7ZK9).pdf',
          file_extension: '.pdf',
        },
      ],
      PROXY,
    );
    assert.equal(files.length, 1);
    assert.equal(files[0]?.name, 'Traveler Receipt (AC7ZK9).pdf');
    assert.equal(files[0]?.url, '/api/monday/assets/2986887415');
    assert.equal(files[0]?.isImage, false);
  });
});

describe('excludeGalleryDuplicatesOfColumnFiles', () => {
  it('drops gallery uploads that repeat column profile or passport files', () => {
    const columnFiles: VolunteerFile[] = [
      {
        id: '2872738376',
        name: 'IMG_3889.heic',
        url: '/api/monday/assets/2872738376',
        isImage: true,
      },
      {
        id: '2872738348',
        name: 'IMG_3889.heic',
        url: '/api/monday/assets/2872738348',
        isImage: true,
      },
    ];
    const galleryFiles = mapMondayGalleryAssets(
      [
        { id: '2872738376', name: 'IMG_3889.heic' },
        { id: '2872738348', name: 'IMG_3889.heic' },
        { id: '2872738450', name: 'IMG_4463.jpeg' },
      ],
      PROXY,
    );

    const filtered = excludeGalleryDuplicatesOfColumnFiles(
      galleryFiles,
      columnFiles,
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.name, 'IMG_4463.jpeg');
  });
});

describe('mergeVolunteerGalleryFiles', () => {
  it('dedupes profile and passport URLs from gallery', () => {
    const profileUrl = '/api/monday/assets/111';
    const passportUrl = '/api/monday/assets/222';
    const sources: VolunteerFile[][] = [
      [
        {
          id: '999',
          name: 'Profile photo duplicate',
          url: profileUrl,
          isImage: true,
        },
        {
          id: '888',
          name: 'Passport duplicate',
          url: passportUrl,
          isImage: true,
        },
      ],
      [
        {
          id: '3',
          name: 'Release.pdf',
          url: '/api/monday/assets/333',
          isImage: false,
        },
      ],
    ];

    const merged = mergeVolunteerGalleryFiles(sources, {
      profilePhotoUrl: profileUrl,
      passportPhotoUrl: passportUrl,
    });

    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.name, 'Release.pdf');
  });

  it('dedupes repeated monday asset ids across sources', () => {
    const merged = mergeVolunteerGalleryFiles([
      [
        {
          id: '111',
          name: 'IMG_3889.heic',
          url: '/api/monday/assets/111',
          isImage: true,
        },
      ],
      [
        {
          id: '111',
          name: 'Gallery copy',
          url: '/api/monday/assets/111',
          isImage: true,
        },
        {
          id: '222',
          name: 'Other.pdf',
          url: '/api/monday/assets/222',
          isImage: false,
        },
      ],
    ]);

    assert.equal(merged.length, 2);
    assert.deepEqual(
      merged.map((file) => file.id),
      ['111', '222'],
    );
  });
});

describe('parseMondayFileColumn', () => {
  it('parses multiple files from a column', () => {
    const col: MondayColumnValue = {
      id: 'files',
      type: 'file',
      text: '',
      value: JSON.stringify({
        files: [
          { name: 'a.pdf', assetId: 1, isImage: 'false' },
          { name: 'b.jpg', assetId: 2, isImage: 'true' },
        ],
      }),
      column: { title: 'Files' },
    };
    const parsed = parseMondayFileColumn(col, PROXY);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[1]?.url, '/api/monday/assets/2');
  });
});
