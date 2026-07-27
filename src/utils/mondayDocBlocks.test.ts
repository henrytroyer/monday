import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  blocksToPlainText,
  deltaFormatToText,
  generalizeDocPlaceholders,
  slugFromDocName,
} from './mondayDocBlocks.ts';

describe('mondayDocBlocks', () => {
  it('extracts text from deltaFormat JSON', () => {
    const text = deltaFormatToText(
      JSON.stringify({
        deltaFormat: [
          { insert: 'Hello ', attributes: {} },
          { insert: 'world', attributes: { bold: true } },
        ],
      }),
    );
    assert.equal(text, 'Hello world');
  });

  it('formats numbered list blocks', () => {
    const body = blocksToPlainText([
      {
        type: 'normal text',
        content: JSON.stringify({ deltaFormat: [{ insert: 'Hello ***,' }] }),
      },
      {
        type: 'numbered list',
        content: JSON.stringify({
          deltaFormat: [{ insert: 'First step', attributes: { bold: true } }],
        }),
      },
      {
        type: 'numbered list',
        content: JSON.stringify({ deltaFormat: [{ insert: 'Second step' }] }),
      },
    ]);

    assert.match(body, /Hello \*\*\*,/);
    assert.match(body, /1\. First step/);
    assert.match(body, /2\. Second step/);
  });

  it('generalizes doc placeholder stars to merge fields', () => {
    const text = generalizeDocPlaceholders(
      "pastor's reference for **. They will be serving in ** from beginning **.",
    );
    assert.match(text, /{{name}}/);
    assert.match(text, /{{location}}/);
    assert.match(text, /{{timelineLabel}}/);
  });

  it('creates stable slugs from doc names', () => {
    assert.equal(
      slugFromDocName('New Volunteer Acceptance Letter'),
      'new-volunteer-acceptance-letter',
    );
  });
});
