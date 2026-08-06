import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { slimBillingTerm } from './slimBillingTerms.ts';

describe('slimBillingTerm', () => {
  it('keeps billing fields and strips notes / pastor reference', () => {
    const slim = slimBillingTerm({
      itemId: 't1',
      timelineId: 'spring',
      timelineLabel: 'Spring',
      termStart: '2026-01-01',
      termEnd: '2026-03-01',
      status: 'Active',
      notes: [
        {
          id: 'n1',
          itemId: 't1',
          timelineId: 'spring',
          body: 'secret',
          createdAt: '2026-01-01',
        },
      ],
      pipelineStage: 'Sent To Field',
      quickbooksInvoiceId: 'INV-9',
      pastorReferenceStatus: 'Received',
      locationPreference: 'Lesvos',
      recordType: 'application',
      endOfServiceReview: {
        itemId: 'r1',
        completedAt: '2026-03-02',
        fields: [{ id: 'q', question: 'Q', answer: 'A' }],
      },
    });

    assert.equal(slim.quickbooksInvoiceId, 'INV-9');
    assert.equal(slim.timelineLabel, 'Spring');
    assert.deepEqual(slim.notes, []);
    assert.equal(slim.pastorReferenceStatus, undefined);
    assert.equal(slim.endOfServiceReview, undefined);
  });
});
