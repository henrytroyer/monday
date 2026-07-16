import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMinedTemplates,
  dedupeMinedSends,
  generalizeWithMergeFields,
  normalizeSubjectKey,
  shouldSkipExistingSubject,
  slugFromSubject,
  subjectsMatch,
} from './supermailTemplateMining.ts';

describe('supermailTemplateMining', () => {
  it('normalizes subject keys for deduplication', () => {
    assert.equal(
      normalizeSubjectKey('  Reference request for {{name}}  '),
      normalizeSubjectKey('reference request for'),
    );
  });

  it('creates stable slug ids from subjects', () => {
    assert.equal(
      slugFromSubject('i58Global Child Safeguarding'),
      'supermail-i58global-child-safeguarding',
    );
  });

  it('matches subjects with merge placeholders', () => {
    assert.equal(
      subjectsMatch(
        'Reference request for {{name}}',
        'Reference request for John Smith',
      ),
      false,
    );
    assert.equal(
      subjectsMatch(
        'Documents needed — {{name}}',
        'Documents needed — {{name}}',
      ),
      true,
    );
  });

  it('skips subjects that match existing CRM templates', () => {
    assert.equal(
      shouldSkipExistingSubject('Reference request for {{name}}', [
        'Reference request for {{name}}',
      ]),
      true,
    );
    assert.equal(
      shouldSkipExistingSubject('i58Global Child Safeguarding', [
        'Reference request for {{name}}',
      ]),
      false,
    );
  });

  it('generalizes known literals to merge fields', () => {
    const result = generalizeWithMergeFields(
      'Hi Terrel,\n\nYour coordinator Jane will follow up.',
      {
        name: 'Terrel Seibel',
        firstName: 'Terrel',
        coordinator: 'Jane',
      },
    );

    assert.match(result, /\{\{firstName\}\}/);
    assert.match(result, /\{\{coordinator\}\}/);
    assert.doesNotMatch(result, /Terrel/);
  });

  it('dedupes sends by subject keeping the most recent body', () => {
    const deduped = dedupeMinedSends([
      {
        subject: 'Hello',
        body: 'Old body',
        sentAt: '2026-01-01T00:00:00.000Z',
      },
      {
        subject: 'Hello',
        body: 'New body',
        sentAt: '2026-02-01T00:00:00.000Z',
      },
    ]);

    assert.equal(deduped.length, 1);
    assert.equal(deduped[0]?.body, 'New body');
  });

  it('builds mined templates and skips existing CRM subjects', () => {
    const templates = buildMinedTemplates(
      [
        {
          subject: 'Reference request for {{name}}',
          body: 'duplicate',
          sentAt: '2026-01-01T00:00:00.000Z',
        },
        {
          subject: 'i58Global Child Safeguarding',
          body: 'Hello {{firstName}}',
          sentAt: '2026-02-01T00:00:00.000Z',
        },
      ],
      ['Reference request for {{name}}'],
      '2026-07-16T00:00:00.000Z',
    );

    assert.equal(templates.length, 1);
    assert.equal(templates[0]?.source, 'supermail');
    assert.equal(templates[0]?.id, 'supermail-i58global-child-safeguarding');
    assert.equal(templates[0]?.sendCount, 1);
  });
});
