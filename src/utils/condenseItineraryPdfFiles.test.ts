import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { VolunteerFile } from '../types/volunteer';
import { condenseItineraryPdfFiles } from './condenseItineraryPdfFiles';

const PROXY = '/api/monday';

describe('condenseItineraryPdfFiles', () => {
  it('merges multiple itinerary PDFs into one combined file', () => {
    const files: VolunteerFile[] = [
      {
        id: '2986887415',
        name: 'Itinerary - Traveler Receipt (AC7ZK9).pdf',
        url: '/api/monday/assets/2986887415',
        isImage: false,
      },
      {
        id: '2986887398',
        name: 'Itinerary - Traveler Receipt (ADY8P6).pdf',
        url: '/api/monday/assets/2986887398',
        isImage: false,
      },
    ];

    const condensed = condenseItineraryPdfFiles(files, PROXY);
    assert.equal(condensed.length, 1);
    assert.equal(condensed[0]?.name, 'Itinerary.pdf');
    assert.equal(
      condensed[0]?.url,
      '/api/monday/assets/merge/2986887415,2986887398',
    );
  });

  it('leaves a single itinerary PDF unchanged', () => {
    const files: VolunteerFile[] = [
      {
        id: '1',
        name: 'Itinerary - flight.pdf',
        url: '/api/monday/assets/1',
        isImage: false,
      },
    ];

    const condensed = condenseItineraryPdfFiles(files, PROXY);
    assert.deepEqual(condensed, files);
  });
});
