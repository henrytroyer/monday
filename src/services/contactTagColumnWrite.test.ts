import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactTag } from '../types/contact';
import {
  contactTagsUseSimpleColumnValue,
  formatContactTagsColumnValue,
  formatContactTagsSimpleValue,
  resolveContactTagsWriteColumn,
  statusColumnAllowsMultipleLabels,
} from './contactTagColumnWrite';

const volunteerOnly: ContactTag[] = ['volunteer'];
const volunteerDonor: ContactTag[] = ['volunteer', 'donor'];

const crmStatusSettings = JSON.stringify({
  labels: [
    { name: 'Volunteer' },
    { name: 'Pastor' },
    { name: 'Parent' },
    { name: 'Donor' },
  ],
});

describe('resolveContactTagsWriteColumn', () => {
  const baseOptions = {
    tagsColumnTitle: 'Tags',
    typeColumnTitle: 'type',
  };

  it('prefers text type column over Tags when both exist', () => {
    const columns = [
      { id: '1', title: 'Tags', type: 'status', settings_str: crmStatusSettings },
      { id: '2', title: 'type', type: 'text' },
    ];
    const resolved = resolveContactTagsWriteColumn(columns, baseOptions);
    assert.equal(resolved?.id, '2');
  });

  it('uses Tags status column when type is missing', () => {
    const columns = [
      { id: '1', title: 'Tags', type: 'status', settings_str: crmStatusSettings },
    ];
    const resolved = resolveContactTagsWriteColumn(columns, baseOptions);
    assert.equal(resolved?.id, '1');
  });

  it('falls back to type when Tags has no CRM labels', () => {
    const columns = [
      { id: '1', title: 'Tags', type: 'status', settings_str: '{}' },
      { id: '2', title: 'type', type: 'text' },
    ];
    const resolved = resolveContactTagsWriteColumn(columns, baseOptions);
    assert.equal(resolved?.id, '2');
  });

  it('honors explicit env override for tags column title', () => {
    const columns = [
      { id: '1', title: 'Tags', type: 'status', settings_str: crmStatusSettings },
      { id: '2', title: 'type', type: 'text' },
    ];
    const resolved = resolveContactTagsWriteColumn(columns, {
      ...baseOptions,
      tagsColumnTitle: 'type',
      typeColumnTitle: 'type',
      explicitTagsColumnEnv: 'type',
    });
    assert.equal(resolved?.id, '2');
  });
});

describe('formatContactTagsSimpleValue', () => {
  it('joins labels with comma and space', () => {
    assert.equal(formatContactTagsSimpleValue(volunteerDonor), 'Volunteer, Donor');
  });

  it('returns empty string when no tags', () => {
    assert.equal(formatContactTagsSimpleValue([]), '');
  });
});

describe('formatContactTagsColumnValue', () => {
  it('formats single status label', () => {
    assert.equal(
      formatContactTagsColumnValue(volunteerOnly, 'status'),
      JSON.stringify({ label: 'Volunteer' }),
    );
  });

  it('formats multi status labels', () => {
    const multiSettings = JSON.stringify({ limit_select: 0 });
    assert.equal(
      formatContactTagsColumnValue(volunteerDonor, 'status', multiSettings),
      JSON.stringify({ labels: ['Volunteer', 'Donor'] }),
    );
    assert.equal(statusColumnAllowsMultipleLabels(multiSettings), true);
  });

  it('formats dropdown labels', () => {
    assert.equal(
      formatContactTagsColumnValue(volunteerDonor, 'dropdown'),
      JSON.stringify({ labels: ['Volunteer', 'Donor'] }),
    );
  });

  it('throws for unsupported column types', () => {
    assert.throws(
      () => formatContactTagsColumnValue(volunteerOnly, 'email', undefined, 'Email'),
      /Unsupported tag column/,
    );
  });
});

describe('contactTagsUseSimpleColumnValue', () => {
  it('is true for text columns', () => {
    assert.equal(contactTagsUseSimpleColumnValue('text'), true);
    assert.equal(contactTagsUseSimpleColumnValue('long_text'), true);
    assert.equal(contactTagsUseSimpleColumnValue('status'), false);
  });
});
