import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER } from '../mock/fixtures.ts';
import { myInfoFor } from './myInfo.ts';
import { itineraryLines, itineraryPrintHtml, passportPrintHtml } from './recordCopy.ts';

describe('record copies', () => {
  it('prints the passport image with the number and expiration', () => {
    const page = passportPrintHtml('/examples/passport-specimen.png', '5482<91763>', 'August 18, 2029');
    assert.match(page, /src="\/examples\/passport-specimen.png"/);
    assert.match(page, /5482&lt;91763&gt;/);
    assert.match(page, /August 18, 2029/);
    assert.match(page, /@page/);
    assert.doesNotMatch(page, /5482<91763>/);
  });

  it('lists every booked leg on the printable itinerary', () => {
    const flights = myInfoFor(JANE_MILLER).flights;
    assert.ok(flights);
    const lines = itineraryLines(flights);
    assert.match(lines.join('\n'), /Record locator: I58-7K2M/);
    assert.match(lines.join('\n'), /Jane Miller/);
    assert.match(lines.join('\n'), /Charlotte \(CLT\)/);
    assert.match(lines.join('\n'), /Mytilene \(MJT\)/);
    assert.match(lines.join('\n'), /OA 221/);
    assert.match(lines.join('\n'), /OA 220/);

    const page = itineraryPrintHtml({ ...flights, passenger: 'Jane <Miller>' });
    assert.match(page, /Jane &lt;Miller&gt;/);
    assert.match(page, /I58-7K2M/);
    assert.doesNotMatch(page, /Jane <Miller>/);
  });
});
