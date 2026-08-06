import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPastorReferenceFormFields,
} from './applicationFormFields';
import type { MondayColumnValue } from './mapMondayToCrm';

function textCol(id: string, title: string, text: string): MondayColumnValue {
  return {
    id,
    text,
    value: JSON.stringify({ text }),
    type: 'long_text',
    column: { title },
  };
}

describe('buildPastorReferenceFormFields', () => {
  it('does not treat location preference columns as pastor reference', () => {
    const fields = buildPastorReferenceFormFields([
      textCol(
        'pref',
        'PLEASE NOTE that this is a location PREFERENCE only',
        'v',
      ),
      textCol('pastor', 'Pastor Reference Comments', 'Strong candidate'),
    ]);

    assert.equal(fields.length, 1);
    assert.equal(fields[0]?.question, 'Pastor Reference Comments');
  });

  it('still matches real reference columns', () => {
    const fields = buildPastorReferenceFormFields([
      textCol('ref', 'Church Reference', 'Yes'),
    ]);
    assert.equal(fields.length, 1);
  });

  it('does not treat pastor name/phone as the reference form', () => {
    const fields = buildPastorReferenceFormFields([
      textCol('name', 'Pastor Name', 'John Smith'),
      textCol('phone', 'Pastor Phone', '555-0100'),
      textCol('email', 'Pastor Email', 'pastor@church.example'),
      textCol('form', 'Pastor Reference Form Notes', 'Received and filed'),
    ]);

    assert.equal(fields.length, 1);
    assert.equal(fields[0]?.question, 'Pastor Reference Form Notes');
  });
});
