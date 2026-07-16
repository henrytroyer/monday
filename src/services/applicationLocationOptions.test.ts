import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterBoardDropdownLabels,
  parseColumnLabelsFromSettings,
  parseLocationOptionsFromColumn,
  resolveLocationPreferenceColumn,
} from './applicationLocationOptions';

describe('parseColumnLabelsFromSettings', () => {
  it('reads dropdown labels from monday column settings', () => {
    const labels = parseColumnLabelsFromSettings(
      JSON.stringify({
        labels: [
          { id: 2, name: 'Lesvos Greece' },
          { id: 5, name: 'Germany' },
          { id: 4, name: 'Wherever I am needed most' },
        ],
      }),
    );

    assert.deepEqual(labels, [
      'Lesvos Greece',
      'Germany',
      'Wherever I am needed most',
    ]);
  });

  it('reads status column labels object format', () => {
    const labels = parseColumnLabelsFromSettings(
      JSON.stringify({
        labels: {
          '0': 'Lesvos Greece',
          '1': 'Germany',
          '2': 'Athens/Malakasa Greece',
        },
      }),
    );

    assert.deepEqual(labels, [
      'Lesvos Greece',
      'Germany',
      'Athens/Malakasa Greece',
    ]);
  });
});

describe('filterBoardDropdownLabels', () => {
  it('excludes comma-separated multi-select combo labels', () => {
    const filtered = filterBoardDropdownLabels([
      'Lesvos Greece',
      'Germany',
      'Lesvos Greece, Germany',
      'Lesvos Greece, Germany, Athens/Malakasa Greece',
      'Athens/Malakasa Greece',
    ]);

    assert.deepEqual(filtered, [
      'Lesvos Greece',
      'Germany',
      'Athens/Malakasa Greece',
    ]);
  });

  it('trims whitespace and dedupes case-insensitively', () => {
    const filtered = filterBoardDropdownLabels([
      '  Germany  ',
      'germany',
      'Lesvos Greece',
    ]);

    assert.deepEqual(filtered, ['Germany', 'Lesvos Greece']);
  });
});

describe('resolveLocationPreferenceColumn', () => {
  const columns = [
    {
      id: 'status_loc',
      title: 'Location Status',
      type: 'status',
      settings_str: '{}',
    },
    {
      id: 'dropdown_loc',
      title: 'i58 Location Preference',
      type: 'dropdown',
      settings_str: '{}',
    },
    {
      id: 'other',
      title: 'Email',
      type: 'email',
      settings_str: '{}',
    },
  ];

  it('prefers exact title match from column map', () => {
    const exactColumns = [
      ...columns,
      {
        id: 'exact',
        title: 'Location Preference',
        type: 'status',
        settings_str: '{}',
      },
    ];

    const resolved = resolveLocationPreferenceColumn(exactColumns);
    assert.equal(resolved?.id, 'exact');
  });

  it('falls back to fuzzy location+preference match and prefers dropdown', () => {
    const resolved = resolveLocationPreferenceColumn(columns);
    assert.equal(resolved?.id, 'dropdown_loc');
  });

  it('returns undefined when no matching column exists', () => {
    const resolved = resolveLocationPreferenceColumn([
      { id: 'email', title: 'Email', type: 'email' },
    ]);
    assert.equal(resolved, undefined);
  });
});

describe('parseLocationOptionsFromColumn', () => {
  it('filters combo labels from column settings', () => {
    const labels = parseLocationOptionsFromColumn({
      id: 'loc',
      title: 'i58 Location Preference',
      type: 'dropdown',
      settings_str: JSON.stringify({
        labels: [
          { id: 1, name: 'Lesvos Greece' },
          { id: 2, name: 'Germany' },
          { id: 3, name: 'Lesvos Greece, Germany' },
          { id: 4, name: 'Athens/Malakasa Greece' },
        ],
      }),
    });

    assert.deepEqual(labels, [
      'Lesvos Greece',
      'Germany',
      'Athens/Malakasa Greece',
    ]);
  });
});
