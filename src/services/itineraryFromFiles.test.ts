import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { VolunteerFile } from '../types/volunteer';
import {
  assetIdFromVolunteerFile,
  isItineraryFileCandidate,
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
});
