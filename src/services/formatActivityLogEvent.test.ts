import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatActivityLogEvent } from './formatActivityLogEvent.ts';

const context = {
  boardId: '123',
  boardName: 'Applications',
  userNamesById: new Map([['42', 'Sarah Chen']]),
  boardRole: 'applications' as const,
};

describe('formatActivityLogEvent', () => {
  it('formats create_pulse events', () => {
    const event = formatActivityLogEvent(
      {
        id: '1',
        event: 'create_pulse',
        entity: 'pulse',
        user_id: '42',
        created_at: '2026-03-01T10:00:00.000Z',
        data: JSON.stringify({ pulse_id: '99', pulse_name: 'Alex Rivera' }),
      },
      context,
    );

    assert.equal(event.summary, 'Created "Alex Rivera"');
    assert.equal(event.category, 'created');
    assert.equal(event.actorName, 'Sarah Chen');
    assert.equal(event.entityId, '99');
    assert.equal(event.navigateTo?.page, 'applications');
  });

  it('formats update_column_value events with before and after', () => {
    const event = formatActivityLogEvent(
      {
        id: '2',
        event: 'update_column_value',
        entity: 'pulse',
        user_id: '42',
        created_at: '2026-03-02T10:00:00.000Z',
        data: JSON.stringify({
          pulse_id: '99',
          pulse_name: 'Alex Rivera',
          column_title: 'Status',
          previous_value: { label: { text: 'Applied' } },
          value: { label: { text: 'Approved' } },
        }),
      },
      context,
    );

    assert.equal(event.summary, 'Changed Status on "Alex Rivera"');
    assert.equal(event.detail, 'Status: Applied → Approved');
    assert.equal(event.category, 'updated');
  });

  it('formats move_pulse_to_group events', () => {
    const event = formatActivityLogEvent(
      {
        id: '3',
        event: 'move_pulse_to_group',
        entity: 'pulse',
        user_id: '42',
        created_at: '2026-03-03T10:00:00.000Z',
        data: JSON.stringify({
          pulse_id: '99',
          pulse_name: 'Alex Rivera',
          source_group_name: 'Applied',
          dest_group_name: 'Sent To Field',
        }),
      },
      context,
    );

    assert.equal(event.summary, 'Moved "Alex Rivera" to Sent To Field');
    assert.equal(event.detail, 'From Applied → Sent To Field');
    assert.equal(event.category, 'moved');
  });

  it('formats delete_pulse events', () => {
    const event = formatActivityLogEvent(
      {
        id: '4',
        event: 'delete_pulse',
        entity: 'pulse',
        user_id: '42',
        created_at: '2026-03-04T10:00:00.000Z',
        data: JSON.stringify({ pulse_id: '99', pulse_name: 'Alex Rivera' }),
      },
      context,
    );

    assert.equal(event.summary, 'Deleted "Alex Rivera"');
    assert.equal(event.category, 'deleted');
  });

  it('formats create_update comment events', () => {
    const event = formatActivityLogEvent(
      {
        id: '5',
        event: 'create_update',
        entity: 'pulse',
        user_id: '42',
        created_at: '2026-03-05T10:00:00.000Z',
        data: JSON.stringify({ pulse_id: '99', pulse_name: 'Alex Rivera' }),
      },
      context,
    );

    assert.equal(event.summary, 'Added comment on "Alex Rivera"');
    assert.equal(event.category, 'comment');
  });

  it('parses nanosecond created_at timestamps', () => {
    const event = formatActivityLogEvent(
      {
        id: '6',
        event: 'create_pulse',
        entity: 'pulse',
        user_id: '42',
        created_at: '1740823200000000000',
        data: JSON.stringify({ pulse_name: 'Test User' }),
      },
      context,
    );

    assert.equal(event.occurredAt, new Date(1740823200000).toISOString());
  });
});
