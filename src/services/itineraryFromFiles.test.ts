import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { itineraryHasData } from '../types/itinerary';
import type { VolunteerFile } from '../types/volunteer';
import { configureMondayProxyAuth } from './mondayProxyAuth';
import {
  assetIdFromVolunteerFile,
  assetTextCacheHas,
  clearAssetTextCache,
  forcePromoteItineraryFileNames,
  isItineraryFileCandidate,
  parseItineraryFromVolunteerFiles,
  selectDedicatedItineraryFiles,
  selectItineraryFileCandidates,
} from './itineraryFromFiles';

describe('isItineraryFileCandidate', () => {
  it('accepts tagged itinerary uploads and travel-named PDFs', () => {
    assert.equal(
      isItineraryFileCandidate({
        id: '1',
        name: 'Itinerary - flight.pdf',
        isImage: false,
      }),
      true,
    );
    assert.equal(
      isItineraryFileCandidate({
        id: '2',
        name: 'United Airlines e-ticket.pdf',
        isImage: false,
      }),
      true,
    );
    assert.equal(
      isItineraryFileCandidate({
        id: '5',
        name: 'Traveler Receipt (AC7ZK9).pdf',
        isImage: false,
      }),
      true,
    );
  });

  it('rejects passport and profile uploads', () => {
    assert.equal(
      isItineraryFileCandidate({
        id: '3',
        name: 'Passport.pdf',
        isImage: false,
      }),
      false,
    );
    assert.equal(
      isItineraryFileCandidate({
        id: '4',
        name: 'IMG_3889.heic',
        isImage: true,
      }),
      false,
    );
  });
});

describe('assetIdFromVolunteerFile', () => {
  it('reads asset id from proxy url', () => {
    const file: VolunteerFile = {
      id: 'file-1',
      name: 'Itinerary.pdf',
      url: '/api/monday/assets/2872738376',
      isImage: false,
    };
    assert.equal(assetIdFromVolunteerFile(file), '2872738376');
  });
});

describe('selectItineraryFileCandidates', () => {
  it('returns only itinerary-like attachments', () => {
    const files: VolunteerFile[] = [
      { id: '1', name: 'Passport.pdf', isImage: false },
      { id: '2', name: 'Travel itinerary.pdf', isImage: false },
    ];
    const selected = selectItineraryFileCandidates(files);
    assert.equal(selected.length, 1);
    assert.equal(selected[0]?.name, 'Travel itinerary.pdf');
  });

  it('rejects opaque filenames that are not travel-named', () => {
    assert.equal(
      isItineraryFileCandidate({
        id: '9',
        name: 'Camille Bowman.pdf',
        isImage: false,
      }),
      false,
    );
  });
});

describe('selectDedicatedItineraryFiles', () => {
  it('keeps all non-image PDFs from the dedicated Itinerary column (no name filter)', () => {
    const selected = selectDedicatedItineraryFiles([
      { id: '1', name: 'Camille Bowman.pdf', isImage: false },
      { id: '2', name: 'Passport.pdf', isImage: false },
      { id: '3', name: 'photo.jpg', isImage: true },
    ]);
    assert.equal(selected.length, 2);
    assert.deepEqual(
      selected.map((file) => file.name).sort(),
      ['Camille Bowman.pdf', 'Passport.pdf'],
    );
  });
});

describe('forcePromoteItineraryFileNames', () => {
  it('makes opaque dedicated uploads into itinerary candidates', () => {
    const promoted = forcePromoteItineraryFileNames([
      { id: '1', name: 'Camille Bowman.pdf', isImage: false },
    ]);
    assert.equal(promoted[0]?.name, 'Itinerary - Camille Bowman.pdf');
    assert.equal(isItineraryFileCandidate(promoted[0]!), true);
  });
});

describe('clearAssetTextCache', () => {
  it('is safe to call (allows Refresh retries after empty extractions)', () => {
    clearAssetTextCache();
    clearAssetTextCache();
    assert.ok(true);
  });
});

describe('parseItineraryFromVolunteerFiles cache', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearAssetTextCache();
    configureMondayProxyAuth({
      getToken: async () => null,
      proxyBase: '',
    });
  });

  it('does not sticky-cache empty extractions; second call can succeed', async () => {
    configureMondayProxyAuth({
      getToken: async () => null,
      proxyBase: 'http://proxy.test',
    });
    clearAssetTextCache();

    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ text: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          text: `
Arrive Jun 01, 2026 05:40 PM Mytilene International Airport MJT Flight A3 612
Depart Aug 22, 2026 09:00 AM Mytilene International Airport MJT Flight A3 613
`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const files: VolunteerFile[] = [
      {
        id: '555',
        name: 'Itinerary - Camille Bowman.pdf',
        url: 'http://proxy.test/assets/555',
        isImage: false,
      },
    ];

    const first = await parseItineraryFromVolunteerFiles(files, 'MJT');
    assert.equal(first, null);
    assert.equal(assetTextCacheHas('555'), false);
    assert.equal(calls, 1);

    const second = await parseItineraryFromVolunteerFiles(files, 'MJT');
    assert.ok(second && itineraryHasData(second));
    assert.equal(second?.arrival.airport, 'MJT');
    assert.equal(calls, 2);
    assert.equal(assetTextCacheHas('555'), true);
  });
});
