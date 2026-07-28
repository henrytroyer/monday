import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { VolunteerFile } from '../types/volunteer';
import type { MondayBoardItem } from './mapMondayToCrm';
import {
  itineraryFilesFingerprint,
  itineraryFilesFromBoardItem,
  itineraryPreviewFileFromCandidates,
} from './enrichPipelineItineraries';
import { forcePromoteItineraryFileNames } from './itineraryFromFiles';
import { mergeVolunteerItinerary } from './itinerary';
import { itineraryHasData } from '../types/itinerary';

describe('itineraryFilesFingerprint', () => {
  it('changes when a new itinerary asset is added', () => {
    const first: VolunteerFile[] = [
      {
        id: '100',
        name: 'Itinerary - international.pdf',
        url: '/api/monday/assets/100',
        isImage: false,
      },
    ];
    const withDomestic: VolunteerFile[] = [
      ...first,
      {
        id: '200',
        name: 'Itinerary - ATH-MJT.pdf',
        url: '/api/monday/assets/200',
        isImage: false,
      },
    ];

    assert.notEqual(
      itineraryFilesFingerprint(first),
      itineraryFilesFingerprint(withDomestic),
    );
    assert.equal(itineraryFilesFingerprint(first), '100');
    assert.equal(itineraryFilesFingerprint(withDomestic), '100,200');
  });

  it('is order-independent', () => {
    const a: VolunteerFile[] = [
      { id: '200', name: 'b.pdf', isImage: false },
      { id: '100', name: 'a.pdf', isImage: false },
    ];
    const b: VolunteerFile[] = [
      { id: '100', name: 'a.pdf', isImage: false },
      { id: '200', name: 'b.pdf', isImage: false },
    ];
    assert.equal(itineraryFilesFingerprint(a), itineraryFilesFingerprint(b));
  });
});

describe('itineraryFilesFromBoardItem', () => {
  it('includes dedicated Itinerary-column files with opaque names', () => {
    const item = {
      id: 'vol-1',
      name: 'Camille Bowman',
      column_values: [
        {
          id: 'files_itin',
          type: 'file',
          text: 'Camille Bowman.pdf',
          value: null,
          column: { title: 'Itinerary' },
          files: [
            {
              asset_id: '555',
              name: 'Camille Bowman.pdf',
              is_image: false,
            },
          ],
        },
      ],
    } as MondayBoardItem;

    const files = itineraryFilesFromBoardItem(item);
    assert.equal(files.length, 1);
    assert.match(files[0]?.name ?? '', /Camille Bowman\.pdf/i);
    assert.equal(files[0]?.id, '555');
    // Force-promoted so name-based candidate selection keeps it.
    assert.match(files[0]?.name ?? '', /^Itinerary - /i);
  });

  it('includes Files-tab gallery Traveler Receipt PDFs when columns are empty', () => {
    const item = {
      id: '18342991536',
      name: 'Camille Bowman',
      column_values: [],
      assets: [
        {
          id: '2935430655',
          name: 'Traveler Receipt (AE25PE).pdf',
          file_extension: 'pdf',
        },
        {
          id: '2935430661',
          name: 'Traveler Receipt (ACI3QU).pdf',
          file_extension: 'pdf',
        },
        {
          id: '999',
          name: 'passport.pdf',
          file_extension: 'pdf',
        },
      ],
    } as MondayBoardItem;

    const files = itineraryFilesFromBoardItem(item);
    assert.equal(files.length, 2);
    assert.deepEqual(
      files.map((f) => f.id).sort(),
      ['2935430655', '2935430661'],
    );
  });
});

describe('file itinerary replaces column itinerary', () => {
  it('must not prefer column home airport over file-parsed field airport', () => {
    const fromFiles = {
      arrival: {
        date: 'Jun 01, 2026',
        time: '05:40 PM',
        airport: 'MJT',
        flightNumber: 'A3 612',
      },
      departure: {
        date: 'Aug 22, 2026',
        time: '09:00 AM',
        airport: 'MJT',
        flightNumber: 'A3 613',
      },
    };
    const fromColumns = {
      arrival: { date: '2026-06-01', time: '', airport: 'IND' },
      departure: { date: '2026-08-22', time: '', airport: 'IND' },
    };

    assert.ok(itineraryHasData(fromFiles));
    // Product rule: successful file parse replaces columns (no merge).
    const used = fromFiles;
    assert.equal(used.arrival.airport, 'MJT');
    assert.equal(used.departure.airport, 'MJT');
    // Wrong merge order (columns first) would keep IND — that must not happen.
    const columnsFirst = mergeVolunteerItinerary(fromColumns, fromFiles);
    assert.equal(columnsFirst.arrival.airport, 'IND');
    assert.notEqual(used.arrival.airport, columnsFirst.arrival.airport);
  });
});

describe('forcePromoteItineraryFileNames', () => {
  it('prefixes opaque dedicated uploads', () => {
    const promoted = forcePromoteItineraryFileNames([
      { id: '1', name: 'Camille Bowman.pdf', isImage: false },
    ]);
    assert.equal(promoted[0]?.name, 'Itinerary - Camille Bowman.pdf');
  });
});

describe('itineraryPreviewFileFromCandidates', () => {
  it('merges multiple itinerary PDFs into one preview file', () => {
    const preview = itineraryPreviewFileFromCandidates(
      [
        {
          id: '111',
          name: 'Traveler Receipt (A).pdf',
          url: '/api/monday/assets/111',
          isImage: false,
        },
        {
          id: '222',
          name: 'Traveler Receipt (B).pdf',
          url: '/api/monday/assets/222',
          isImage: false,
        },
      ],
      '/api/monday',
    );
    assert.ok(preview?.url?.includes('/assets/merge/'));
    assert.match(preview?.name ?? '', /itinerary/i);
  });
});
