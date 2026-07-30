import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  encodeLtRefReviewUpdate,
  encodeLtRefSentUpdate,
  parseLtRefMarkersFromUpdates,
} from './longtermReferenceMondaySync';

describe('longtermReferenceMondaySync', () => {
  it('round-trips sent and review markers from update bodies', () => {
    const bodies = [
      encodeLtRefSentUpdate(1, '2026-07-01 10:00'),
      encodeLtRefReviewUpdate(1, 'approved'),
      encodeLtRefReviewUpdate(2, 'needs_review'),
      'unrelated update',
    ];
    const parsed = parseLtRefMarkersFromUpdates(bodies);
    assert.equal(parsed.sentAtBySlot.get(1), '2026-07-01 10:00');
    assert.equal(parsed.reviewBySlot.get(1), 'approved');
    assert.equal(parsed.reviewBySlot.get(2), 'needs_review');
  });

  it('clears review when marker says cleared', () => {
    const bodies = [
      encodeLtRefReviewUpdate(0, 'approved'),
      encodeLtRefReviewUpdate(0, 'cleared'),
    ];
    const parsed = parseLtRefMarkersFromUpdates(bodies);
    assert.equal(parsed.reviewBySlot.has(0), false);
  });
});
