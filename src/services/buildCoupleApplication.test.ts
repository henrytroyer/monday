import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MondayColumnValue } from './mapMondayToCrm';

const viteMeta = import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
};
viteMeta.env = {
  ...viteMeta.env,
  VITE_MONDAY_API_PROXY_URL: '/api/monday',
};

const {
  buildCoupleApplication,
  buildCouplePreview,
  firstNameFromFullName,
} = await import('./coupleApplication.js');

function textColumn(title: string, text: string): MondayColumnValue {
  return {
    id: title.toLowerCase().replace(/\s+/g, '-'),
    type: 'text',
    text,
    value: null,
    column: { title },
  };
}

function fileColumn(title: string, assetId: number): MondayColumnValue {
  return {
    id: title.toLowerCase().replace(/\s+/g, '-'),
    type: 'file',
    text: `https://example.monday.com/protected_static/resources/${assetId}/photo.jpg`,
    value: JSON.stringify({
      files: [{ name: 'photo.jpg', assetId, isImage: 'true' }],
    }),
    column: { title },
  };
}

describe('buildCoupleApplication', () => {
  it('detects couple when marital status is Married and spouse name is set', () => {
    const columns = [
      textColumn('Marital Status', 'Married'),
      textColumn('Spouse Name', 'Sharon Fisher'),
      textColumn('First Name Only', 'Arlen'),
      textColumn('Spouse Email', 'sharon.fisher@example.com'),
      textColumn('Email', 'arlen.fisher@example.com'),
    ];

    const couple = buildCoupleApplication('Arlen & Sharon Fisher', columns);
    assert.ok(couple);
    assert.equal(couple?.isCouple, true);
    assert.equal(couple?.primaryFirstName, 'Arlen');
    assert.equal(couple?.partner.name, 'Sharon Fisher');
    assert.equal(couple?.partner.email, 'sharon.fisher@example.com');
  });

  it('detects couple when spouse name is populated without marital status', () => {
    const columns = [textColumn('Spouse Name', 'Jane Smith')];
    const couple = buildCoupleApplication('John & Jane Smith', columns);
    assert.ok(couple);
    assert.equal(couple?.partner.name, 'Jane Smith');
  });

  it('returns undefined for single applicant', () => {
    const columns = [
      textColumn('Marital Status', 'Single'),
      textColumn('Email', 'solo@example.com'),
    ];
    assert.equal(buildCoupleApplication('Solo Applicant', columns), undefined);
  });

  it('returns undefined when married but spouse name is empty', () => {
    const columns = [textColumn('Marital Status', 'Married')];
    assert.equal(buildCoupleApplication('Incomplete Couple', columns), undefined);
  });

  it('resolves spouse profile photo and passport URLs', () => {
    const columns = [
      textColumn('Marital Status', 'Married'),
      textColumn('Spouse Name', 'Sharon Fisher'),
      fileColumn('Spouse Profile Pic', 9001),
      fileColumn('Spouse Passport Photo', 9002),
    ];

    const couple = buildCoupleApplication('Arlen & Sharon Fisher', columns);
    assert.ok(
      couple?.partner.profilePhotoUrl?.includes('9001') ||
        couple?.partner.profilePhotoUrl?.includes('/assets/9001'),
    );
    assert.ok(
      couple?.partner.passportFile?.url?.includes('9002') ||
        couple?.partner.passportFile?.url?.includes('/assets/9002'),
    );
  });
});

describe('buildCouplePreview', () => {
  it('includes search fields for pipeline filtering', () => {
    const columns = [
      textColumn('Marital Status', 'Married'),
      textColumn('Spouse Name', 'Sharon Fisher'),
      textColumn('First Name Only', 'Arlen'),
      textColumn('Email', 'arlen.fisher@example.com'),
      textColumn('Spouse Email', 'sharon.fisher@example.com'),
    ];

    const preview = buildCouplePreview('Arlen & Sharon Fisher', columns);
    assert.equal(preview?.primaryEmail, 'arlen.fisher@example.com');
    assert.equal(preview?.partnerEmail, 'sharon.fisher@example.com');
  });
});

describe('firstNameFromFullName', () => {
  it('extracts first token', () => {
    assert.equal(firstNameFromFullName('Sharon Fisher'), 'Sharon');
  });
});
