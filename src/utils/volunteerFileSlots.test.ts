import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { VolunteerFile } from '../types/volunteer';
import { resolveVolunteerFileSlots } from '../utils/volunteerFileSlots';

describe('resolveVolunteerFileSlots childSafeguardingFile', () => {
  it('prefers explicit childSafeguardingFile over filename match in files', () => {
    const linkedCert: VolunteerFile = {
      id: 'safeguard-board-1660350900',
      name: 'Child safeguarding certificate',
      url: '/api/monday/assets/1660350900',
      isImage: false,
    };
    const files: VolunteerFile[] = [
      {
        id: 'local-safeguard',
        name: 'Child-safeguarding-certificate.pdf',
        url: 'https://example.com/old.pdf',
        isImage: false,
      },
    ];

    const slots = resolveVolunteerFileSlots(
      undefined,
      files,
      undefined,
      linkedCert,
    );

    assert.equal(slots.childSafeguarding?.url, linkedCert.url);
    assert.equal(slots.otherFiles.length, 0);
  });

  it('falls back to filename match when childSafeguardingFile is missing', () => {
    const files: VolunteerFile[] = [
      {
        id: 'local-safeguard',
        name: 'Child-safeguarding-certificate.pdf',
        url: 'https://example.com/cert.pdf',
        isImage: false,
      },
    ];

    const slots = resolveVolunteerFileSlots(undefined, files);

    assert.equal(slots.childSafeguarding?.url, 'https://example.com/cert.pdf');
    assert.equal(slots.otherFiles.length, 0);
  });

  it('promotes itinerary files to a dedicated slot', () => {
    const files: VolunteerFile[] = [
      {
        id: 'itinerary-1',
        name: 'Itinerary - flight.pdf',
        url: 'https://example.com/flight.pdf',
        isImage: false,
      },
      {
        id: 'other-doc',
        name: 'Application-form.pdf',
        url: 'https://example.com/form.pdf',
        isImage: false,
      },
    ];

    const slots = resolveVolunteerFileSlots(undefined, files);

    assert.equal(slots.itineraryFiles.length, 1);
    assert.equal(slots.itineraryFiles[0]?.url, 'https://example.com/flight.pdf');
    assert.equal(slots.otherFiles.length, 1);
    assert.equal(slots.otherFiles[0]?.name, 'Application-form.pdf');
  });

  it('excludes gallery copies of profile, passport, and itinerary from other documents', () => {
    const profileUrl = '/api/monday/assets/2872738376';
    const passportUrl = '/api/monday/assets/2872738348';
    const files: VolunteerFile[] = [
      {
        id: '2872738376',
        name: 'IMG_3889.heic',
        url: profileUrl,
        isImage: true,
      },
      {
        id: '2872738348',
        name: 'IMG_3889.heic',
        url: passportUrl,
        isImage: true,
      },
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
      {
        id: '2872738376',
        name: 'IMG_3889.heic',
        url: profileUrl,
        isImage: true,
      },
      {
        id: '2872738348',
        name: 'IMG_3889.heic',
        url: passportUrl,
        isImage: true,
      },
      {
        id: '2872738450',
        name: 'IMG_4463.jpeg',
        url: '/api/monday/assets/2872738450',
        isImage: true,
      },
    ];

    const slots = resolveVolunteerFileSlots(profileUrl, files, {
      id: '2872738348',
      name: 'Passport',
      url: passportUrl,
      isImage: true,
    });

    assert.equal(slots.otherFiles.length, 1);
    assert.equal(slots.otherFiles[0]?.name, 'IMG_4463.jpeg');
  });
});
