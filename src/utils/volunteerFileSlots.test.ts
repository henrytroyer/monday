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
});
