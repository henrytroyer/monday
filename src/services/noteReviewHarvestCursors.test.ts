import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  lookbackSinceIso,
  resolveHarvestSinceIso,
} from './noteReviewHarvestCursors';

describe('noteReviewHarvestCursors', () => {
  it('uses lookback when poll cursor is unset', () => {
    const since = resolveHarvestSinceIso(new Date(0).toISOString());
    const lookback = lookbackSinceIso(30);
    assert.ok(new Date(since).getTime() >= new Date(lookback).getTime() - 1000);
  });
});
